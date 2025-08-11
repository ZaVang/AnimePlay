import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Card, AnimeCard, CharacterCard } from '@/types/card';
import type { Skill } from '@/types/skill';
import { skillLibrary } from '@/skills'; // Corrected import path

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

      allAnimeCards.value = animeData.map((card: any) => processCardImagePath(card, 'anime'));

      if (characterData.characters) {
          allCharacterCards.value = characterData.characters.map((card: any) => processCardImagePath(card, 'character'));
      } else {
          allCharacterCards.value = [];
      }

      console.log(`Loaded ${allAnimeCards.value.length} anime cards.`);
      console.log(`Loaded ${allCharacterCards.value.length} character cards.`);

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
