<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePlayerStore, useGameStore } from '@/stores/battle';
import { SkillSystem } from '@/core/systems/SkillSystem';
import CharacterItem from './CharacterItem.vue';
import CharacterActionModal from './CharacterActionModal.vue';
import type { Card, Skill } from '@/types';
import CardDetailModal from '@/components/CardDetailModal.vue';
import { useUserStore } from '@/stores/userStore';

const props = defineProps<{
  playerId: 'playerA' | 'playerB';
}>();

const playerStore = usePlayerStore();
const gameStore = useGameStore();
const userStore = useUserStore();
const player = computed(() => playerStore[props.playerId]);

const selectedCharacter = ref<Card | null>(null);
const selectedCharacterIndex = ref(-1);
const detailCharacter = ref<Card | null>(null);

function handleLeftClick(character: Card, index: number) {
  if (props.playerId === gameStore.activePlayer) {
    selectedCharacter.value = character;
    selectedCharacterIndex.value = index;
  }
}

function handleRightClick(character: Card) {
  detailCharacter.value = character;
}

async function handleUseSkill(skill: Skill) {
  await SkillSystem.useSkill(props.playerId, skill);
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

function closeDetailModal() {
  detailCharacter.value = null;
}
</script>

<template>
  <div class="character-lineup flex justify-center items-center gap-2 h-full">
    <div
      v-for="(character, index) in player.characters"
      :key="character.id"
      class="cursor-pointer"
      @click="handleLeftClick(character, index)"
      @contextmenu.prevent="handleRightClick(character)"
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

    <CardDetailModal
      v-if="detailCharacter"
      :card="detailCharacter"
      card-type="character"
      :count="userStore.getCharacterCardCount(detailCharacter.id)"
      @close="closeDetailModal"
    />
  </div>
</template>
