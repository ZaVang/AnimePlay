<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/battle';
import AnimeCard from '@/components/AnimeCard.vue';
import BattleCalculationDisplay from './BattleCalculationDisplay.vue';

const gameStore = useGameStore();

// A more robust way to get clash info, assuming it's in the game store
const clashInfo = computed(() => gameStore.clashInfo);

</script>

<template>
  <div class="clash-zone">
    <div v-if="clashInfo && clashInfo.attackingCard" class="clash-container">
      <!-- 卡牌展示区域 -->
      <div class="cards-display">
        <!-- Attacker's Card -->
        <div class="card-slot attacker">
          <AnimeCard :anime="clashInfo.attackingCard" :show-cost="true" />
          <div class="style-tag attack-tag">{{ clashInfo.attackStyle }}</div>
        </div>

        <div class="vs-icon">⚔️</div>

        <!-- Defender's Card -->
        <div class="card-slot defender">
          <template v-if="clashInfo.defendingCard">
            <AnimeCard :anime="clashInfo.defendingCard" :show-cost="true" />
            <div class="style-tag defense-tag">{{ clashInfo.defenseStyle }}</div>
          </template>
          <div v-else class="empty-slot">
            <div class="waiting-indicator">
              <div class="pulse-dot"></div>
              <span>等待响应...</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 数值计算显示区域 -->
      <div class="calculation-area">
        <BattleCalculationDisplay />
      </div>
    </div>
    <div v-else class="placeholder">
      <div class="placeholder-content">
        <div class="placeholder-icon">🎯</div>
        <h3 class="placeholder-title">战斗区域</h3>
        <p class="placeholder-text">选择一张手牌来发起辩论</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.clash-zone {
  @apply w-full h-full flex flex-col;
}

.clash-container {
  @apply w-full h-full flex flex-col gap-6;
}

.cards-display {
  @apply flex items-center justify-around pt-4;
}

.card-slot {
  @apply relative w-32 h-44;
}

.empty-slot {
  @apply w-32 h-44 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center;
}

.waiting-indicator {
  @apply flex flex-col items-center justify-center text-gray-500 space-y-2;
}

.pulse-dot {
  @apply w-3 h-3 bg-blue-400 rounded-full animate-pulse;
}

.vs-icon {
  @apply text-4xl text-red-500 font-bold mx-8;
}

.style-tag {
  @apply absolute -bottom-6 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-3 py-1 rounded-full;
}

.attack-tag {
  @apply bg-red-600;
}

.defense-tag {
  @apply bg-blue-600;
}

.calculation-area {
  @apply flex-1 px-4 pb-4;
}

.placeholder {
  @apply w-full h-full flex items-center justify-center;
}

.placeholder-content {
  @apply text-center space-y-4;
}

.placeholder-icon {
  @apply text-6xl;
}

.placeholder-title {
  @apply text-2xl font-bold text-gray-300;
}

.placeholder-text {
  @apply text-gray-400;
}
</style>