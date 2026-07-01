<script setup lang="ts">
import { computed } from 'vue';
import SquadUnitBar from './SquadUnitBar.vue';
import type { SquadBattleUnitView, SquadFloatingDamageView } from './types';

const props = defineProps<{
  playerUnits: SquadBattleUnitView[];
  enemyUnits: SquadBattleUnitView[];
  // SB-T3 收尾①(A)：瞬态浮动伤害数字，由 View 按 targetId 驱动；本组件分发到对应 SquadUnitBar。
  floatingDamages?: SquadFloatingDamageView[];
  autoUltimates: boolean;
  battleEnded: boolean;
  elapsedMs: number;
  // SB-T1：时限来自 engine DEFAULT_MAX_TIME_MS（View 传入），倒计时与实战裁决同源，禁 UI 硬编码。
  maxTimeMs: number;
  // SB-T2：处于「选目标」态的施法者 unitId（单体敌方大招点击后置位）；null = 无。
  targetingCasterId?: string | null;
  targetingCasterName?: string;
}>();

defineEmits<{
  castUltimate: [unitId: string];
  toggleAuto: [];
  // SB-T2：选目标态下点击敌方单位 → 带 targetId 释放；取消 → 退出选目标态。
  selectTarget: [targetId: string];
  cancelTargeting: [];
}>();

const isTargeting = computed(() => Boolean(props.targetingCasterId));

// SB-T3 收尾①(A)：把扁平的浮动伤害列表按 targetId 归拢，供各单位条只取自己的那几条。
const floatingByTarget = computed(() => {
  const map = new Map<string, SquadFloatingDamageView[]>();
  for (const entry of props.floatingDamages ?? []) {
    const list = map.get(entry.targetId);
    if (list) list.push(entry);
    else map.set(entry.targetId, [entry]);
  }
  return map;
});

function floatingFor(unitId: string): SquadFloatingDamageView[] {
  return floatingByTarget.value.get(unitId) ?? [];
}

// SB-T1：剩余秒 = (max − elapsed)，钳 0；进度条按已耗时占比，逼近上限转告警色提示「即将裁决」。
const remainingSeconds = computed(() =>
  Math.max(0, (props.maxTimeMs - props.elapsedMs) / 1000),
);
const elapsedPercent = computed(() =>
  props.maxTimeMs > 0
    ? Math.max(0, Math.min(100, (props.elapsedMs / props.maxTimeMs) * 100))
    : 0,
);
const timeCritical = computed(() => remainingSeconds.value <= 10);
</script>

<template>
  <section class="rounded-lg border border-line bg-surface p-4 sm:p-6">
    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0 flex-1">
        <h2 class="text-xl font-bold text-ink">5v5 半自动战斗</h2>
        <p class="text-sm text-ink-2">
          玩家左阵 · 敌人右阵 · 已进行 {{ (elapsedMs / 1000).toFixed(1) }}s
        </p>
        <!-- SB-T1：倒计时 + 进度条——「还剩多久裁决」显形。剩余 ≤10s 转告警色。 -->
        <div class="mt-2 max-w-md">
          <div class="mb-1 flex items-center justify-between text-xs font-semibold">
            <span :class="timeCritical ? 'text-danger' : 'text-ink-2'">
              裁决倒计时
            </span>
            <span :class="timeCritical ? 'text-danger' : 'text-ink'">
              {{ remainingSeconds.toFixed(1) }}s
            </span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              class="h-full rounded-full transition-[width] duration-200"
              :class="timeCritical ? 'bg-danger' : 'bg-accent'"
              :style="{ width: `${elapsedPercent}%` }"
            ></div>
          </div>
        </div>
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

    <!-- SB-T2：单体大招选目标提示——只在选目标态出现，点敌方单位选中 / 点取消退出。 -->
    <div
      v-if="isTargeting"
      class="mb-4 flex items-center justify-between gap-3 rounded-md border border-highlight bg-highlight/15 px-3 py-2 text-sm"
    >
      <span class="font-semibold text-ink">
        选择「{{ targetingCasterName }}」大招的目标：点击敌方单位释放
      </span>
      <button
        type="button"
        class="shrink-0 rounded border border-line bg-surface px-2 py-1 text-xs font-bold text-ink-2 transition hover:text-ink"
        @click="$emit('cancelTargeting')"
      >
        取消
      </button>
    </div>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-start">
      <div class="space-y-2">
        <div class="text-sm font-bold text-info">你的小队</div>
        <SquadUnitBar
          v-for="unit in playerUnits"
          :key="unit.id"
          :unit="unit"
          :floating-damages="floatingFor(unit.id)"
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
        <!-- SB-T2：选目标态下，存活敌方单位可点选为大招目标（高亮环 + 指针光标）。 -->
        <div
          v-for="unit in enemyUnits"
          :key="unit.id"
          :class="isTargeting && !unit.defeated
            ? 'cursor-pointer rounded-lg ring-2 ring-highlight ring-offset-1 ring-offset-surface transition'
            : ''"
          :role="isTargeting && !unit.defeated ? 'button' : undefined"
          @click="isTargeting && !unit.defeated ? $emit('selectTarget', unit.id) : undefined"
        >
          <SquadUnitBar
            :unit="unit"
            :floating-damages="floatingFor(unit.id)"
            :auto-ultimates="autoUltimates"
            :battle-ended="battleEnded"
          />
        </div>
      </div>
    </div>
  </section>
</template>
