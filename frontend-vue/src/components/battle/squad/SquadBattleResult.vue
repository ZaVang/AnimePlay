<script setup lang="ts">
import type { SquadBattleRewardView } from './types';

defineProps<{
  result: 'victory' | 'defeat' | null;
  rewards: SquadBattleRewardView;
  canRetry: boolean;
}>();

defineEmits<{
  continue: [];
  retry: [];
}>();
</script>

<template>
  <section class="rounded-lg border border-line bg-surface p-6 text-center sm:p-8">
    <div class="mb-3 text-4xl font-black" :class="result === 'victory' ? 'text-accent' : 'text-danger'">
      {{ result === 'victory' ? '胜利' : '失败' }}
    </div>

    <div class="mx-auto mb-6 grid max-w-3xl gap-3 sm:grid-cols-3">
      <div class="rounded-lg border border-line bg-surface-2 p-4">
        <div class="text-sm text-ink-2">角色经验</div>
        <div class="mt-1 text-2xl font-bold text-accent">+{{ rewards.characterExp }}</div>
      </div>
      <div class="rounded-lg border border-line bg-surface-2 p-4">
        <div class="text-sm text-ink-2">知识点</div>
        <div class="mt-1 text-2xl font-bold text-highlight">+{{ rewards.knowledgePoints }}</div>
      </div>
      <div class="rounded-lg border border-line bg-surface-2 p-4">
        <div class="text-sm text-ink-2">装备掉落</div>
        <div class="mt-1 text-base font-bold text-ink">
          <span v-if="rewards.equipmentDrop">[{{ rewards.equipmentDrop.rarity }}] {{ rewards.equipmentDrop.name }}</span>
          <span v-else>无</span>
        </div>
      </div>
    </div>

    <div class="flex flex-col justify-center gap-3 sm:flex-row">
      <button
        type="button"
        class="min-h-11 rounded-md bg-info px-5 py-2 font-bold text-on-accent transition hover:opacity-90"
        @click="$emit('continue')"
      >
        {{ result === 'victory' ? '继续挑战' : '返回爬塔' }}
      </button>
      <button
        v-if="canRetry"
        type="button"
        class="min-h-11 rounded-md bg-accent px-5 py-2 font-bold text-on-accent transition hover:bg-accent-strong"
        @click="$emit('retry')"
      >
        再次挑战
      </button>
    </div>
  </section>
</template>
