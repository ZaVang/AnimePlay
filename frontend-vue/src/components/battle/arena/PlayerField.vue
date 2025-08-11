<script setup lang="ts">
import { computed } from 'vue';
import { usePlayerStore } from '@/stores/battle';
import CharacterLineup from '@/components/battle/character/CharacterLineup.vue';

const props = defineProps<{
  playerId: 'playerA' | 'playerB';
  isOpponent?: boolean;
}>();

const playerStore = usePlayerStore();
const player = computed(() => playerStore[props.playerId]);
</script>

<template>
  <div class="player-field-container flex items-center gap-6" :class="{ 'flex-row-reverse': isOpponent }">
    <!-- Player Info -->
    <div class="player-info text-white text-center w-48">
      <h3 class="text-xl font-bold truncate">{{ player.name }}</h3>
      <div class="my-2">
        <p class="text-lg">声望: <span class="font-bold text-green-400">{{ player.reputation }} / 30</span></p>
        <p class="text-lg">TP: <span class="font-bold text-blue-400">{{ player.tp }} / {{ player.maxTp }}</span></p>
      </div>
      <!-- Placeholder for status effects -->
    </div>

    <!-- Character Lineup -->
    <div class="flex-grow">
      <CharacterLineup :playerId="playerId" />
    </div>
  </div>
</template>

<style scoped>
/* Scoped styles for PlayerField */
</style>
