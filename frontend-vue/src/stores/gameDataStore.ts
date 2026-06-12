import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AnimeCard, CharacterCard } from '@/types/card';
import type { Skill } from '@/types/skill';
import { skillLibrary } from '@/skills'; // Corrected import path
import { animeEffectsMap } from '@/data/animeEffectsMap';
import { animeDefaultEffects } from '@/data/animeDefaultEffects';
import { characterDefaultSkills } from '@/data/characterDefaultSkills';
import { characterSkillsMap } from '@/data/characterSkillsMap';

export const useGameDataStore = defineStore('gameData', () => {
  // --- STATE ---
  const allAnimeCards = ref<AnimeCard[]>([]);
  const allCharacterCards = ref<CharacterCard[]>([]);
  const allSkills = ref<Skill[]>(skillLibrary); // Load skills into state
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);

  /** S9：主数据是否就绪（App 以此门控路由渲染——非阻塞挂载后的等待条件）。 */
  const isReady = computed(() => allAnimeCards.value.length > 0 && allCharacterCards.value.length > 0);

  // --- GETTERS ---
  const getAnimeCardById = computed(() => {
    const map = new Map(allAnimeCards.value.map(card => [card.id, card]));
    return (id: number) => map.get(id);
  });

  const getCharacterCardById = computed(() => {
    const map = new Map(allCharacterCards.value.map(card => [card.id, card]));
    return (id: number) => map.get(id);
  });

  // Getter for skills
  const getSkillById = computed(() => {
    const map = new Map(allSkills.value.map(skill => [skill.id, skill]));
    return (id: string) => map.get(id);
  });

  // --- ACTIONS ---
  async function fetchGameData() {
    // S9：幂等——已就绪或在途直接返回（修掉 main.ts + App.onMounted 启动双拉）
    if (isLoading.value || isReady.value) return;
    isLoading.value = true;
    error.value = null;

    try {
      // S9：30s 超时兜底，挂掉转入错误态由 App 提供重试
      const timeout = AbortSignal.timeout(30000);
      const [animeResponse, characterResponse] = await Promise.all([
        fetch('/api/all_animes?limit=1000', { signal: timeout }),
        fetch('/api/all_characters?limit=1000', { signal: timeout })
      ]);

      if (!animeResponse.ok) throw new Error('Failed to fetch anime cards');
      if (!characterResponse.ok) throw new Error('Failed to fetch character cards');
      
      const animeData: AnimeCard[] = await animeResponse.json();
      const characterData: { characters?: CharacterCard[] } = await characterResponse.json();

      const processCardImagePath = <T extends AnimeCard | CharacterCard>(card: T, type: 'anime' | 'character'): T => {
        const imagePath = `/data/images/${type}/${card.id}.jpg`;
        return {
            ...card,
            image_path: imagePath,
            rarity: card.rarity || 'N'
        };
      };

      allAnimeCards.value = animeData.map((card) => {
        const processed = processCardImagePath(card, 'anime');
        const mappedEffects = animeEffectsMap[processed.id];
        if (mappedEffects) return { ...processed, effects: mappedEffects };
        // fallback to default effects by rarity if card has no explicit effects
        const defaults = animeDefaultEffects[processed.rarity as keyof typeof animeDefaultEffects];
        return defaults ? { ...processed, effects: defaults } : processed;
      });

      if (characterData.characters) {
          allCharacterCards.value = characterData.characters.map((card) => {
            const processed = processCardImagePath(card, 'character');
            const binding = characterSkillsMap[processed.id];
            if (binding) {
              return { ...processed, ...binding };
            }
            // fallback to default character skills by rarity if no binding exists
            const defaults = characterDefaultSkills[processed.rarity as keyof typeof characterDefaultSkills];
            return defaults ? { ...processed, ...defaults } : processed;
          });
      } else {
          allCharacterCards.value = [];
      }


    } catch (e: unknown) {
      const err = e as { name?: string; message?: string };
      error.value = err.name === 'TimeoutError' ? '加载超时（30 秒）：请检查后端服务是否在运行' : (err.message ?? String(e));
      console.error('Failed to fetch game data:', e);
    } finally {
      isLoading.value = false;
    }
  }

  return {
    // State
    allAnimeCards,
    allCharacterCards,
    allSkills,
    isLoading,
    isReady,
    error,
    // Getters
    getAnimeCardById,
    getCharacterCardById,
    getSkillById, // Expose the new getter
    // Actions
    fetchGameData,
  };
});
