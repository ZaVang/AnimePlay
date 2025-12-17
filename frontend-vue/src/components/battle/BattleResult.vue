<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  battleResult: 'victory' | 'defeat' | null;
  battleLog: string[];
  selectedSquadForBattle: number | null;
}

interface Emits {
  (e: 'restart'): void;
  (e: 'retryBattle', squadId: number): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const resultEmoji = computed(() => props.battleResult === 'victory' ? '🎉' : '💔');
const resultTitle = computed(() => props.battleResult === 'victory' ? '胜利！' : '失败...');
const resultColor = computed(() => props.battleResult === 'victory' ? 'text-green-400' : 'text-red-400');
const buttonText = computed(() => props.battleResult === 'victory' ? '继续挑战' : '返回爬塔');

const lastFiveLogs = computed(() => props.battleLog.slice(-5));

function handleRestart() {
  emit('restart');
}

function handleRetry() {
  if (props.selectedSquadForBattle !== null) {
    emit('retryBattle', props.selectedSquadForBattle);
  }
}
</script>

<template>
  <div class="text-center space-y-6">
    <div class="bg-gray-800 rounded-lg p-8 border border-gray-700">
      <div class="text-6xl mb-4">
        {{ resultEmoji }}
      </div>

      <h2 class="text-3xl font-bold mb-4" :class="resultColor">
        {{ resultTitle }}
      </h2>

      <div class="space-y-2 mb-6">
        <div
          v-for="(log, index) in lastFiveLogs"
          :key="index"
          class="text-gray-300"
        >
          {{ log }}
        </div>
      </div>

      <div class="flex gap-4 justify-center">
        <button
          @click="handleRestart"
          class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
        >
          {{ buttonText }}
        </button>

        <button
          v-if="selectedSquadForBattle && battleResult === 'defeat'"
          @click="handleRetry"
          class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
        >
          再次挑战
        </button>
      </div>
    </div>
  </div>
</template>
