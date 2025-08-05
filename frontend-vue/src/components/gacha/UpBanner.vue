<script setup lang="ts">
import { computed } from 'vue';
import { useGameDataStore } from '@/stores/gameDataStore';
import { GAME_CONFIG } from '@/config/gameConfig';
import AnimeCard from '@/components/AnimeCard.vue';
import CharacterCard from '@/components/CharacterCard.vue';

const props = defineProps<{
  gachaType: 'anime' | 'character';
}>();

const gameDataStore = useGameDataStore();

const upConfig = computed(() => {
  return props.gachaType === 'anime' ? GAME_CONFIG.animeSystem.rateUp : GAME_CONFIG.characterSystem.rateUp;
});

const upCards = computed(() => {
  if (upConfig.value.ids.length === 0) return [];
  
  const cardSource = props.gachaType === 'anime' ? gameDataStore.allAnimeCards : gameDataStore.allCharacterCards;
  
  return upConfig.value.ids.map(id => {
    return cardSource.find(card => card.id === id);
  }).filter(Boolean);
});

</script>

<template>
  <div v-if="upCards.length > 0" class="mb-6 p-4 rounded-lg bg-gradient-to-r from-yellow-200 via-amber-300 to-orange-300 shadow-lg">
    <h3 class="text-center font-bold text-xl text-yellow-900 mb-3">当前UP</h3>
    <div class="flex justify-center items-center gap-4">
      <div v-for="card in upCards" :key="card.id" class="w-1/4 max-w-[150px]">
        <AnimeCard v-if="gachaType === 'anime'" :anime="card" />
        <CharacterCard v-if="gachaType === 'character'" :character="card" />
      </div>
    </div>
    <p class="text-center text-sm text-yellow-800 mt-2">
      在抽到 HR 或 UR 稀有度时，有 <span class="font-bold">{{ upConfig.hrChance * 100 }}%</span> 的概率为UP卡！
    </p>
    <p v-if="upConfig.pityPulls > 0" class="text-center text-xs text-yellow-700 mt-1">
      {{ upConfig.pityPulls }}次未抽中UP卡，下次必定获得UP卡！
    </p>
  </div>
</template>
