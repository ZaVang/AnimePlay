<script setup lang="ts">
import { computed } from 'vue';
import { usePlayerStore } from '@/stores/battle';
import CharacterItem from './CharacterItem.vue';

const props = defineProps<{
  playerId: 'playerA' | 'playerB';
}>();

const playerStore = usePlayerStore();
const player = computed(() => playerStore[props.playerId]);
</script>

<template>
  <div class="character-lineup flex justify-center items-center gap-2">
    <CharacterItem
      v-for="(character, index) in player.characters"
      :key="character.id"
      :character="character"
      :is-active="index === player.activeCharacterIndex"
    />
  </div>
</template>
