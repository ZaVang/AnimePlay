import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AnimeCard, CharacterCard } from '@/types/card';
import type { Skill } from '@/types/skill';
import { skillLibrary } from '@/skills'; // Corrected import path
import { characterDefaultSkills } from '@/data/characterDefaultSkills';
import { characterSkillsMap } from '@/data/characterSkillsMap';

export const useGameDataStore = defineStore('gameData', () => {
  // --- STATE ---
  const allAnimeCards = ref<AnimeCard[]>([]);
  const allCharacterCards = ref<CharacterCard[]>([]);
  const allSkills = ref<Skill[]>(skillLibrary); // Load skills into state
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);

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
    if (isLoading.value) return;
    isLoading.value = true;
    error.value = null;

    try {
      const [animeResponse, characterResponse] = await Promise.all([
        fetch('/api/all_animes?limit=1000'),
        fetch('/api/all_characters?limit=1000')
      ]);

      if (!animeResponse.ok) throw new Error('Failed to fetch anime cards');
      if (!characterResponse.ok) throw new Error('Failed to fetch character cards');
      
      const animeData = await animeResponse.json();
      const characterData = await characterResponse.json();

      const processCardImagePath = (card: any, type: 'anime' | 'character') => {
        const imagePath = `/data/images/${type}/${card.id}.jpg`;
        return {
            ...card,
            image_path: imagePath,
            rarity: card.rarity || 'N'
        };
      };

      allAnimeCards.value = animeData.map((card: any) => {
        return processCardImagePath(card, 'anime');
      });

      if (characterData.characters) {
          allCharacterCards.value = characterData.characters.map((card: any) => {
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

      console.log(`Loaded ${allAnimeCards.value.length} anime cards.`);
      console.log(`Loaded ${allCharacterCards.value.length} character cards.`);

      // Task 1.3: Inject sample lore fragments for Phase 5 demo
      allCharacterCards.value = allCharacterCards.value.map(card => {
        if (card.id === 101) { // Alpha-01
          card.lore_fragments = [
            { id: 1, title: '生还者协议', content: '在废弃的 08 号扇区，她是唯一的生命体征。系统日志显示，她曾在空无一人的终端前坐了 300 个小时。', requiredIntimacy: 10 },
            { id: 2, title: '霓虹深处的低语', content: '“这里的雨从不停歇，但我记得阳光的味道——或者那只是某种模拟出的神经冲动。”', requiredIntimacy: 50 },
            { id: 3, title: '核心过载', content: '她的核心中存储着无法读取的数据。每当系统试图访问，逻辑闸就会发生剧烈抖动。', requiredIntimacy: 100 }
          ];
        } else if (card.id === 1) { // Zero-One
          card.lore_fragments = [
            { id: 4, title: '零号档案', content: '他是最初的蓝图，也是最完美的错误。在他眼中，代码不仅仅是指令，而是某种古老仪式的咒语。', requiredIntimacy: 20 },
            { id: 5, title: '逻辑坍塌', content: '“所有的真理都隐藏在 Bug 之中。”他微笑着，指尖在虚空中敲击着不存在的键盘。', requiredIntimacy: 60 }
          ];
        }
        return card;
      });

    } catch (e: any) {
      error.value = e.message;
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
    error,
    // Getters
    getAnimeCardById,
    getCharacterCardById,
    getSkillById, // Expose the new getter
    // Actions
    fetchGameData,
  };
});
