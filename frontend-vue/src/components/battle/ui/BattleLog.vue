<script setup lang="ts">
import { useHistoryStore } from '@/stores/battle';
import { computed, ref, watch } from 'vue';

const historyStore = useHistoryStore();
const logContainer = ref<HTMLElement | null>(null);

const logs = computed(() => historyStore.log);

// Auto-scroll to the bottom when new logs are added
watch(logs, () => {
  if (logContainer.value) {
    // Use nextTick to wait for the DOM to update
    import('vue').then(({ nextTick }) => {
      nextTick(() => {
        logContainer.value!.scrollTop = logContainer.value!.scrollHeight;
      });
    });
  }
}, { deep: true });

const logTypeClasses = {
  event: 'text-accent',
  clash: 'text-ink',
  damage: 'text-danger',
  info: 'text-ink-3 italic',
};
</script>

<template>
  <div class="battle-log-wrapper">
    <div ref="logContainer" class="log-container">
      <div v-for="(log, index) in logs" :key="index" class="log-message text-ink-2 italic">
        {{ log }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.battle-log-wrapper {
  @apply absolute inset-0 bg-surface-2/50 p-2 rounded-lg text-xs;
}
.log-container {
  @apply h-full overflow-y-auto pr-2;
}
.log-message {
  @apply mb-1;
}

/* Custom scrollbar for a better look */
.log-container::-webkit-scrollbar {
  width: 4px;
}
.log-container::-webkit-scrollbar-track {
  background: transparent;
}
.log-container::-webkit-scrollbar-thumb {
  background-color: rgb(var(--c-ink) / 0.2);
  border-radius: 20px;
}
</style>
