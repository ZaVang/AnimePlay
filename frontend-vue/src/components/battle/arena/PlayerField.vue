<script setup lang="ts">
import { computed } from 'vue';
import { usePlayerStore } from '@/stores/battle';
import CharacterLineup from '@/components/battle/character/CharacterLineup.vue';
import HandDisplay from '@/components/battle/anime/HandDisplay.vue';

const props = defineProps<{
  playerId: 'playerA' | 'playerB';
  isOpponent?: boolean;
}>();

const playerStore = usePlayerStore();
const player = computed(() => playerStore[props.playerId]);
</script>

<template>
  <div class="player-field-layout-horizontal" :class="{ 'opponent-layout': isOpponent }">
    <!-- Left Side: Character Lineup and Player Info -->
    <div class="character-and-status-container">
      <div class="player-info-wrapper">
        <h3 class="text-xl font-bold truncate">{{ player.name }}</h3>
        <div class="info-stats">
          <p>声望: <span class="font-bold text-green-400">{{ player.reputation }}</span></p>
          <p>TP: <span class="font-bold text-blue-400">{{ player.tp }}/{{ player.maxTp }}</span></p>
          <p>牌库: <span class="font-bold text-gray-300">{{ player.deck.length }}</span></p>
          <p>弃牌堆: <span class="font-bold text-gray-300">{{ player.discardPile.length }}</span></p>
        </div>
      </div>
      <div class="character-lineup-wrapper">
        <CharacterLineup :playerId="playerId" />
      </div>
    </div>

    <!-- Right Side: Hand Display -->
    <div class="hand-display-wrapper">
      <HandDisplay :playerId="playerId" :isOpponent="isOpponent" />
    </div>
  </div>
</template>

<style scoped>
.player-field-layout-horizontal {
  @apply h-full w-full flex p-4 gap-4;
}

.opponent-layout {
  /* ... */
}

/* --- MODIFIED --- */
/* 1. 把这个容器变成一个带边框的视觉单元 */
.character-and-status-container {
  @apply flex flex-col border-2 border-gray-700/50 rounded-lg bg-black/30 p-2; /* 移动边框/背景到这里，移除 gap，添加内边距 */
  flex: 1 1 30%; /* 左侧占据30% */
}

/* --- MODIFIED --- */
/* 2. 右侧保持不变，它已经是我们想要的样子了 */
.hand-display-wrapper {
  @apply relative border-2 border-gray-700/50 rounded-lg;
  flex: 1 1 70%; /* 右侧占据70% */
}

/* --- MODIFIED --- */
/* 3. 移除内部元素的边框和背景，它们现在只是内容块 */
.player-info-wrapper {
  @apply flex items-center justify-between px-2; /* 移除边框/背景，调整padding */
}

/* --- MODIFIED --- */
/* 4. 移除角色阵容的边框，但保留 flex-grow 来填充剩余空间 */
.character-lineup-wrapper {
  @apply flex-grow mt-2; /* 移除边框和padding，用 margin-top 创造一点间距 */
}

.info-stats {
  @apply flex gap-4 text-base;
}
</style>
