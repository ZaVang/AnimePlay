<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/battle';
import { BattleController } from '@/core/battle/BattleController';
import AnimeItem from '@/components/battle/anime/AnimeItem.vue';

const gameStore = useGameStore();

const clashInfo = computed(() => (window as any).currentClash || null);
</script>

<template>
  <div class="clash-zone">
    <div v-if="clashInfo && clashInfo.attackingAnime" class="clash-display">
      <!-- Attacker's Card -->
      <div class="card-slot attacker">
        <AnimeItem :card="clashInfo.attackingAnime" />
        <div class="style-tag">{{ clashInfo.attackStyle }}</div>
      </div>

      <div class="vs-icon">⚔️</div>

      <!-- Defender's Card -->
      <div class="card-slot defender">
        <template v-if="clashInfo.defendingAnime">
          <AnimeItem :card="clashInfo.defendingAnime" />
          <div class="style-tag">{{ clashInfo.defenseStyle }}</div>
        </template>
        <div v-else class="empty-slot">等待响应...</div>
      </div>
    </div>
    <div v-else class="placeholder">
      选择一张手牌来发起辩论
    </div>
  </div>
</template>

<style scoped>
.clash-zone {
  @apply w-full h-full flex items-center justify-center bg-gray-800/50 rounded-lg border-2 border-purple-500 p-4;
}
.placeholder {
  @apply text-gray-400 text-2xl font-bold;
}
.clash-display {
  @apply flex items-center justify-around w-full;
}
.card-slot {
  @apply relative w-40 h-56;
}
.empty-slot {
  @apply w-40 h-56 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center text-gray-500;
}
.vs-icon {
  @apply text-5xl text-red-500 font-bold mx-8;
}
.style-tag {
  @apply absolute -bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-80 text-white text-sm font-bold px-3 py-1 rounded-full;
}
</style>
