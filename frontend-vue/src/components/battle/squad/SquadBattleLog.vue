<script setup lang="ts">
defineProps<{
  logs: string[];
}>();
</script>

<template>
  <section class="rounded-lg border border-line bg-surface p-4 sm:p-6">
    <h3 class="mb-3 text-lg font-bold text-ink">关键战斗日志</h3>
    <div class="max-h-52 space-y-2 overflow-y-auto pr-1">
      <div
        v-for="(log, index) in logs.slice().reverse()"
        :key="`${index}-${log}`"
        class="rounded-md bg-surface-2/60 px-3 py-2 text-sm text-ink-2"
      >
        {{ log }}
      </div>
      <div v-if="logs.length === 0" class="rounded-md bg-surface-2/60 px-3 py-2 text-sm text-ink-3">
        战斗事件准备中
      </div>
    </div>
  </section>
</template>
