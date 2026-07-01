<script setup lang="ts">
defineProps<{
  ready: boolean;
  disabled: boolean;
  autoMode: boolean;
  label: string;
}>();

defineEmits<{
  cast: [];
}>();
</script>

<template>
  <button
    type="button"
    class="min-h-9 w-full rounded-md border px-2 py-1 text-xs font-bold leading-tight transition"
    :class="ready && !disabled
      ? 'border-highlight bg-highlight text-on-accent shadow-sm'
      : 'border-line bg-surface-2 text-ink-2 disabled:opacity-55'"
    :disabled="disabled || !ready || autoMode"
    :title="autoMode ? '自动大招开启中' : label"
    @click="$emit('cast')"
  >
    <span class="block truncate">{{ ready ? label : '蓄能中' }}</span>
  </button>
</template>
