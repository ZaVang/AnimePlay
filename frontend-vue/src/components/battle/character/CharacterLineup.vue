<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePlayerStore, useGameStore } from '@/stores/battle';
import { SkillSystem } from '@/core/systems/SkillSystem';
import CharacterItem from './CharacterItem.vue';
import CharacterActionModal from './CharacterActionModal.vue';
import type { Card, Skill } from '@/types';

const props = defineProps<{
  playerId: 'playerA' | 'playerB';
}>();

const playerStore = usePlayerStore();
const gameStore = useGameStore();
const player = computed(() => playerStore[props.playerId]);

const selectedCharacter = ref<Card | null>(null);
const selectedCharacterIndex = ref(-1);

function handleRightClick(character: Card, index: number) {
  if (props.playerId === gameStore.activePlayer) {
    selectedCharacter.value = character;
    selectedCharacterIndex.value = index;
  }
}

function handleUseSkill(skill: Skill) {
  SkillSystem.useSkill(props.playerId, skill);
  closeModal();
}

function handleRotate() {
  playerStore.setActiveCharacter(props.playerId, selectedCharacterIndex.value);
  gameStore.addNotification(`已轮换主辩手为: ${selectedCharacter.value?.name}`);
  closeModal();
}

function closeModal() {
  selectedCharacter.value = null;
  selectedCharacterIndex.value = -1;
}
</script>

<template>
  <div class="character-lineup flex justify-center items-center gap-2 h-full">
    <div
      v-for="(character, index) in player.characters"
      :key="character.id"
      class="cursor-pointer"
      @contextmenu.prevent="handleRightClick(character, index)"
    >
      <CharacterItem
        :character="character"
        :is-active="index === player.activeCharacterIndex"
      />
    </div>

    <CharacterActionModal
      v-if="selectedCharacter"
      :is-visible="!!selectedCharacter"
      :character="selectedCharacter"
      :playerId="playerId"
      :isMainDebater="selectedCharacterIndex === player.activeCharacterIndex"
      @close="closeModal"
      @useSkill="handleUseSkill"
      @rotate="handleRotate"
    />
  </div>
</template>
