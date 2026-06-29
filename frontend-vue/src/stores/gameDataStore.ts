import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AnimeCard, CharacterCard } from '@/types/card';
import type { Skill } from '@/types/skill';
import { skillLibrary } from '@/skills'; // Corrected import path
import { animeEffectsMap } from '@/data/animeEffectsMap';
import { animeDefaultEffects } from '@/data/animeDefaultEffects';
import { characterDefaultSkills } from '@/data/characterDefaultSkills';
import { characterSkillsMap } from '@/data/characterSkillsMap';
import { buildContentIndex } from '@/utils/contentIndex';
import { assetUrl } from '@/utils/assetUrl';

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

  /**
   * I1-T4：内容关联索引（标签→番剧 / 番剧→题材标签），随全量番剧库记忆化重建。
   * 发现引擎/详情「相似作品」等下游复用同一份，避免每次渲染对全库重扫。
   */
  const contentIndex = computed(() => buildContentIndex(allAnimeCards.value));

  // --- ACTIONS ---
  async function fetchGameData() {
    // S9：幂等——已就绪或在途直接返回（修掉 main.ts + App.onMounted 启动双拉）
    if (isLoading.value || isReady.value) return;
    isLoading.value = true;
    error.value = null;

    try {
      // S9：30s 超时兜底，挂掉转入错误态由 App 提供重试
      const timeout = AbortSignal.timeout(30000);
      // limit 取足够大值一次拉全（后端按 offset/limit 切片，默认仅 50）。
      // 卡池随小众番扩充后已 >1000，故用 100000 上限兜底，避免角色被截断。
      const [animeResponse, characterResponse] = await Promise.all([
        fetch('/api/all_animes?limit=100000', { signal: timeout }),
        fetch('/api/all_characters?limit=100000', { signal: timeout })
      ]);

      if (!animeResponse.ok) throw new Error('Failed to fetch anime cards');
      if (!characterResponse.ok) throw new Error('Failed to fetch character cards');
      
      const animeData: AnimeCard[] = await animeResponse.json();
      const characterData: { characters?: CharacterCard[] } = await characterResponse.json();

      const processCardImagePath = <T extends AnimeCard | CharacterCard>(card: T, type: 'anime' | 'character'): T => {
        const imagePath = assetUrl(`/data/images/${type}/${card.id}.jpg`);
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
    contentIndex, // I1-T4：内容关联索引（记忆化）
    // Actions
    fetchGameData,
  };
});
