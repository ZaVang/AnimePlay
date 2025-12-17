<script setup lang="ts">
import { computed } from 'vue';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useSquadManager } from '@/composables/useSquadManager';

interface PresetSquad {
  id: number;
  name: string;
  members: (number | null)[];
}

interface Props {
  squad: PresetSquad;
  currentTowerFloor?: number;
  hasCompletedFloor?: boolean;
  towerEnemyData?: any;
}

interface Emits {
  (e: 'startBattle', squadId: number): void;
  (e: 'openCharacterSelect', squadId: number, position: number): void;
  (e: 'updateName', squadId: number, newName: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const gameDataStore = useGameDataStore();
const { getSquadPower, getSquadMemberCount } = useSquadManager();

const squadPower = computed(() => getSquadPower(props.squad.id));
const memberCount = computed(() => getSquadMemberCount(props.squad.id));

// 判断是否可以开始战斗
const canStartBattle = computed(() => {
  if (memberCount.value < 4) return false;
  if (props.hasCompletedFloor) return false;
  if (!props.towerEnemyData) return false;
  return true;
});

// 获取按钮文本
const buttonText = computed(() => {
  if (memberCount.value === 0) return '需要角色';
  if (memberCount.value < 4) return `需要4人满编 (${memberCount.value}/4)`;
  if (props.hasCompletedFloor) return '本层已通过';
  if (!props.towerEnemyData) return '刷新敌人信息';
  return '开始挑战';
});

function handleNameUpdate(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('updateName', props.squad.id, target.value);
}

function openCharacterSelect(position: number) {
  emit('openCharacterSelect', props.squad.id, position);
}

function startBattle() {
  emit('startBattle', props.squad.id);
}

function getCharacterImage(characterId: number | null): string {
  if (!characterId) return '';
  const character = gameDataStore.getCharacterCardById(characterId);
  return character?.image_path || '/data/images/character/77.jpg';
}

function getCharacterName(characterId: number | null): string {
  if (!characterId) return '';
  const character = gameDataStore.getCharacterCardById(characterId);
  return character?.name || '';
}
</script>

<template>
  <div class="bg-gray-700 rounded-lg p-4 border border-gray-600">
    <!-- 小队名称和成员数 -->
    <div class="flex items-center justify-between mb-3">
      <input
        :value="squad.name"
        @change="handleNameUpdate"
        class="font-bold text-white bg-transparent border border-transparent hover:border-gray-500 rounded px-2 py-1 transition-colors"
        maxlength="20"
      >
      <div class="text-sm text-gray-400">{{ memberCount }}/4</div>
    </div>

    <!-- 小队成员预览 -->
    <div class="grid grid-cols-4 gap-2 mb-3">
      <div
        v-for="position in 4"
        :key="position"
        @click="openCharacterSelect(position - 1)"
        class="relative bg-gray-600 rounded border-2 cursor-pointer hover:border-blue-500 transition-colors overflow-hidden"
        :class="squad.members[position - 1] ? 'border-green-500' : 'border-gray-600 border-dashed'"
        style="aspect-ratio: 2/3; width: 50px; height: 75px;"
      >
        <div v-if="squad.members[position - 1]" class="absolute inset-0">
          <img
            :src="getCharacterImage(squad.members[position - 1])"
            :alt="getCharacterName(squad.members[position - 1])"
            class="w-full h-full object-cover object-top"
            @error="($event.target as HTMLImageElement).src = '/data/images/character/77.jpg'"
          >
          <!-- 位置编号 -->
          <div class="absolute top-0 left-0 w-4 h-4 bg-black/70 rounded-br text-white text-xs flex items-center justify-center">
            {{ position }}
          </div>
        </div>
        <div v-else class="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
          <div class="text-lg mb-1">+</div>
          <div class="text-xs">{{ position }}</div>
        </div>
      </div>
    </div>

    <!-- 小队战力 -->
    <div class="mb-3 text-sm">
      <span class="text-gray-400">战力:</span>
      <span class="text-yellow-400 font-bold ml-1">{{ squadPower }}</span>
    </div>

    <!-- 挑战按钮 -->
    <button
      @click="startBattle"
      :disabled="!canStartBattle"
      class="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
    >
      {{ buttonText }}
    </button>
  </div>
</template>

<style scoped>
.cursor-pointer:hover {
  transform: scale(1.02);
}
</style>
