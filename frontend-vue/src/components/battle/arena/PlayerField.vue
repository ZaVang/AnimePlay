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
  <div class="player-field-layout" :class="{ 'opponent-layout': isOpponent }">
    <!-- Character Lineup -->
    <div class="character-lineup-wrapper">
      <CharacterLineup :playerId="playerId" />
    </div>

    <!-- Hand Display -->
    <div class="hand-display-wrapper">
      <HandDisplay :playerId="playerId" :isOpponent="isOpponent" />
    </div>

    <!-- Player Info -->
    <div class="player-info-wrapper">
      <h3 class="text-xl font-bold truncate">{{ player.name }}</h3>
      <div class="info-stats">
        <p>声望: <span class="font-bold text-green-400">{{ player.reputation }}</span></p>
        <p>TP: <span class="font-bold text-blue-400">{{ player.tp }}/{{ player.maxTp }}</span></p>
        <p>牌库: <span class="font-bold text-gray-300">{{ player.deck.length }}</span></p>
        <p>弃牌堆: <span class="font-bold text-gray-300">{{ player.discardPile.length }}</span></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.player-field-layout {
  @apply h-full w-full flex flex-col p-2 gap-2;
}
.opponent-layout {
  @apply flex-col-reverse;
}
.character-lineup-wrapper, .hand-display-wrapper, .player-info-wrapper {
  @apply border-2 border-gray-700/50 rounded-lg;
}
.character-lineup-wrapper {
  @apply h-28 flex-shrink-0 p-2;
}
.hand-display-wrapper {
  @apply flex-grow relative;
}
.player-info-wrapper {
  @apply h-16 flex-shrink-0 bg-black/30 flex items-center justify-between px-8;
}
.opponent-layout .player-info-wrapper {
  @apply rounded-t-xl rounded-b-lg;
}
.info-stats {
  @apply flex gap-6 text-lg;
}
</style>
