<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useGameDataStore } from '@/stores/gameDataStore';
import { GAME_CONFIG } from '@/config/gameConfig';
import { getCurrentUpPool, getTimeUntilNextRotation, isAnimeCard, isCharacterCard } from '@/utils/gachaRotation';
import AnimeCard from '@/components/AnimeCard.vue';
import CharacterCard from '@/components/CharacterCard.vue';

const props = defineProps<{
  gachaType: 'anime' | 'character';
}>();

const gameDataStore = useGameDataStore();
const rotationTimer = ref<{ hours: number; minutes: number }>({ hours: 0, minutes: 0 });
let intervalId: NodeJS.Timeout | null = null;

const upConfig = computed(() => {
  return props.gachaType === 'anime' ? GAME_CONFIG.animeSystem.rateUp : GAME_CONFIG.characterSystem.rateUp;
});

// 动态获取当前轮换的UP卡片
const upCards = computed(() => {
  const cardSource = props.gachaType === 'anime' ? gameDataStore.allAnimeCards : gameDataStore.allCharacterCards;
  
  // 如果没有加载卡片数据，返回空数组
  if (cardSource.length === 0) return [];
  
  try {
    const { urId, hrId } = getCurrentUpPool(props.gachaType);
    
    const urCard = cardSource.find(card => card.id === urId);
    const hrCard = cardSource.find(card => card.id === hrId);
    
    return [urCard, hrCard].filter(Boolean);
  } catch (error) {
    console.warn('Failed to get current UP pool:', error);
    return [];
  }
});

// 更新轮换倒计时
function updateRotationTimer() {
  rotationTimer.value = getTimeUntilNextRotation();
}

onMounted(() => {
  updateRotationTimer();
  // 每分钟更新一次倒计时
  intervalId = setInterval(updateRotationTimer, 60000);
});

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});

</script>

<template>
  <div v-if="upCards.length > 0" class="mb-6 p-4 rounded-lg bg-gradient-to-r from-yellow-200 via-amber-300 to-orange-300 shadow-lg">
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-bold text-xl text-yellow-900">限时UP池</h3>
      <div class="text-sm text-yellow-800 bg-yellow-100/50 px-3 py-1 rounded-full">
        <span class="font-bold">⏰ {{ rotationTimer.hours }}时{{ rotationTimer.minutes }}分后轮换</span>
      </div>
    </div>
    
    <div class="flex justify-center items-center gap-4 mb-3">
      <div v-for="(card, index) in upCards" :key="card!.id" class="relative w-1/4 max-w-[150px]">
        <AnimeCard v-if="gachaType === 'anime' && card && isAnimeCard(card)" :anime="card" />
        <CharacterCard v-if="gachaType === 'character' && card && isCharacterCard(card)" :character="card" />
        <!-- 标记稀有度 -->
        <div v-if="card" class="absolute -top-2 -right-2 px-2 py-1 text-xs font-bold rounded-full"
             :class="{
               'bg-red-500 text-white': card.rarity === 'UR',
               'bg-purple-500 text-white': card.rarity === 'HR'
             }">
          {{ card.rarity }}
        </div>
      </div>
    </div>
    
    <div class="text-center space-y-1">
      <p class="text-sm text-yellow-800">
        在抽到 <span class="font-bold text-purple-700">HR</span> 或 <span class="font-bold text-red-700">UR</span> 稀有度时，有 <span class="font-bold">{{ (upConfig.hrChance * 100).toFixed(0) }}%</span> 的概率为UP卡！
      </p>
      <p v-if="upConfig.hrPityPulls > 0" class="text-xs text-yellow-700">
        HR保底：{{ upConfig.hrPityPulls }}抽必得UP·HR
      </p>
      <p v-if="upConfig.urPityPulls > 0" class="text-xs text-yellow-700">
        UR保底：{{ upConfig.urPityPulls }}抽必得UP·UR
      </p>
      <p class="text-xs text-yellow-700 opacity-75">
        🔄 每日0点自动轮换新的UP组合
      </p>
    </div>
  </div>
</template>
