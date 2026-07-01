<script setup lang="ts">
import SquadUnitBar from './SquadUnitBar.vue';
import type { SquadBattleUnitView } from './types';

defineProps<{
  playerUnits: SquadBattleUnitView[];
  enemyUnits: SquadBattleUnitView[];
  autoUltimates: boolean;
  battleEnded: boolean;
  elapsedMs: number;
}>();

defineEmits<{
  castUltimate: [unitId: string];
  toggleAuto: [];
}>();
</script>

<template>
  <section class="rounded-lg border border-line bg-surface p-4 sm:p-6">
    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-bold text-ink">5v5 半自动战斗</h2>
        <p class="text-sm text-ink-2">玩家左阵 · 敌人右阵 · {{ (elapsedMs / 1000).toFixed(1) }}s</p>
      </div>
      <button
        type="button"
        class="min-h-10 rounded-md border px-4 py-2 text-sm font-bold transition"
        :class="autoUltimates ? 'border-accent bg-accent text-on-accent' : 'border-line bg-surface-2 text-ink'"
        :disabled="battleEnded"
        @click="$emit('toggleAuto')"
      >
        {{ autoUltimates ? '自动大招：开' : '自动大招：关' }}
      </button>
    </div>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-start">
      <div class="space-y-2">
        <div class="text-sm font-bold text-info">你的小队</div>
        <SquadUnitBar
          v-for="unit in playerUnits"
          :key="unit.id"
          :unit="unit"
          :auto-ultimates="autoUltimates"
          :battle-ended="battleEnded"
          @cast-ultimate="$emit('castUltimate', $event)"
        />
      </div>

      <div class="flex items-center justify-center lg:min-h-[520px] lg:w-16 lg:flex-col lg:gap-3">
        <div class="hidden flex-1 border-l border-line lg:block"></div>
        <div class="flex h-12 w-16 items-center justify-center rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm font-black text-ink lg:h-16">
          VS
        </div>
        <div class="hidden flex-1 border-l border-line lg:block"></div>
      </div>

      <div class="space-y-2">
        <div class="text-right text-sm font-bold text-danger">敌方小队</div>
        <SquadUnitBar
          v-for="unit in enemyUnits"
          :key="unit.id"
          :unit="unit"
          :auto-ultimates="autoUltimates"
          :battle-ended="battleEnded"
        />
      </div>
    </div>
  </section>
</template>
