<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import SquadStageUnit from './SquadStageUnit.vue';
import { layoutSide } from './stageLayout';
import type { SquadBattleUnitView, SquadFloatingDamageView } from './types';

const props = defineProps<{
  playerUnits: SquadBattleUnitView[];
  enemyUnits: SquadBattleUnitView[];
  floatingDamages?: SquadFloatingDamageView[];
  autoUltimates: boolean;
  playbackSpeed: 1 | 2 | 4;
  battleEnded: boolean;
  elapsedMs: number;
  maxTimeMs: number;
  targetingCasterId?: string | null;
  targetingCasterName?: string;
  /** fx 脉冲：本次回放事件的攻击者 / 被击者 + 单调 nonce（每事件 +1，用于重触发动画）。 */
  fx?: { attackerId: string | null; hitId: string | null; nonce: number };
}>();

const emit = defineEmits<{
  castUltimate: [unitId: string];
  toggleAuto: [];
  setSpeed: [speed: 1 | 2 | 4];
  selectTarget: [targetId: string];
  cancelTargeting: [];
}>();

const isTargeting = computed(() => Boolean(props.targetingCasterId));

// —— 倒计时 ——
const remainingSeconds = computed(() => Math.max(0, (props.maxTimeMs - props.elapsedMs) / 1000));
const elapsedPercent = computed(() => (props.maxTimeMs > 0 ? Math.max(0, Math.min(100, (props.elapsedMs / props.maxTimeMs) * 100)) : 0));
const timeCritical = computed(() => remainingSeconds.value <= 10);

// —— 浮动伤害按目标归拢 ——
const floatingByTarget = computed(() => {
  const map = new Map<string, SquadFloatingDamageView[]>();
  for (const f of props.floatingDamages ?? []) {
    const list = map.get(f.targetId);
    if (list) list.push(f); else map.set(f.targetId, [f]);
  }
  return map;
});
const floatingFor = (id: string) => floatingByTarget.value.get(id) ?? [];

// —— 数轴式站位：己方负半侧 / 敌方正半侧 + 前中后排区域（有宽度、可容 3 人、溢出排到相邻区域）。
// 纯布局逻辑抽到 stageLayout.ts（可测）。
const playerLayout = computed(() => layoutSide(props.playerUnits, 'player'));
const enemyLayout = computed(() => layoutSide(props.enemyUnits, 'enemy'));

// 入场用纯 CSS 动画（见 style），静止态始终可见——绝不因动画未触发而把队伍卡在不可见态。

// —— fx：攻击/受击脉冲，nonce 变化时短暂点亮对应单位 ——
const attackingId = ref<string | null>(null);
const hitId = ref<string | null>(null);
let fxTimer: number | undefined;
watch(() => props.fx?.nonce, () => {
  const f = props.fx;
  if (!f) return;
  attackingId.value = f.attackerId;
  hitId.value = f.hitId;
  if (fxTimer) window.clearTimeout(fxTimer);
  // 动画时长跟随倍速（越快越短），避免高倍速下动画堆叠。
  fxTimer = window.setTimeout(() => { attackingId.value = null; hitId.value = null; }, Math.max(120, 300 / props.playbackSpeed));
});
</script>

<template>
  <section class="rounded-lg border border-line bg-surface p-3 sm:p-4">
    <!-- 控制条 -->
    <div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <div class="mb-1 flex items-center justify-between gap-3 text-xs font-semibold">
          <span :class="timeCritical ? 'text-danger' : 'text-ink-2'">裁决倒计时</span>
          <span :class="timeCritical ? 'text-danger' : 'text-ink'">{{ remainingSeconds.toFixed(1) }}s</span>
        </div>
        <div class="h-2 w-full max-w-md overflow-hidden rounded-full bg-surface-2">
          <div class="h-full rounded-full transition-[width] duration-200" :class="timeCritical ? 'bg-danger' : 'bg-accent'" :style="{ width: `${elapsedPercent}%` }"></div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex items-center overflow-hidden rounded-md border border-line" role="group" aria-label="回放倍速">
          <button
            v-for="s in ([1, 2, 4] as const)"
            :key="s"
            type="button"
            class="min-h-9 px-3 py-1.5 text-sm font-bold transition"
            :class="playbackSpeed === s ? 'bg-accent text-on-accent' : 'bg-surface-2 text-ink-2 hover:text-ink'"
            @click="emit('setSpeed', s)"
          >{{ s }}x</button>
        </div>
        <button
          type="button"
          class="min-h-9 rounded-md border px-3 py-1.5 text-sm font-bold transition"
          :class="autoUltimates ? 'border-accent bg-accent text-on-accent' : 'border-line bg-surface-2 text-ink'"
          :disabled="battleEnded"
          @click="emit('toggleAuto')"
        >{{ autoUltimates ? '自动大招：开' : '自动大招：关' }}</button>
      </div>
    </div>

    <!-- 选目标提示 -->
    <div v-if="isTargeting" class="mb-2 flex items-center justify-between gap-3 rounded-md border border-highlight bg-highlight/15 px-3 py-2 text-sm">
      <span class="font-semibold text-ink">选择「{{ targetingCasterName }}」大招目标：点击敌方单位释放</span>
      <button type="button" class="shrink-0 rounded border border-line bg-surface px-2 py-1 text-xs font-bold text-ink-2 hover:text-ink" @click="emit('cancelTargeting')">取消</button>
    </div>

    <!-- 舞台 -->
    <div class="arena">
      <div class="side-label side-label-player">你的小队</div>
      <div class="side-label side-label-enemy">敌方小队</div>

      <div class="team team-player">
        <div
          v-for="p in playerLayout"
          :key="p.unit.id"
          class="unit-slot"
          :style="{ left: `${p.left}%`, top: `${p.top}%`, zIndex: p.z }"
        >
          <SquadStageUnit
            :unit="p.unit"
            :floating-damages="floatingFor(p.unit.id)"
            :auto-ultimates="autoUltimates"
            :battle-ended="battleEnded"
            :attacking="attackingId === p.unit.id"
            :hit="hitId === p.unit.id"
            @cast-ultimate="emit('castUltimate', $event)"
          />
        </div>
      </div>

      <div class="vs">VS</div>

      <div class="team team-enemy">
        <div
          v-for="p in enemyLayout"
          :key="p.unit.id"
          class="unit-slot"
          :style="{ left: `${p.left}%`, top: `${p.top}%`, zIndex: p.z }"
        >
          <SquadStageUnit
            :unit="p.unit"
            :floating-damages="floatingFor(p.unit.id)"
            :auto-ultimates="autoUltimates"
            :battle-ended="battleEnded"
            :attacking="attackingId === p.unit.id"
            :hit="hitId === p.unit.id"
            :targetable="isTargeting && !p.unit.defeated"
            @click="isTargeting && !p.unit.defeated ? emit('selectTarget', p.unit.id) : undefined"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.arena {
  position: relative; width: 100%; box-sizing: border-box; min-height: 440px; overflow: hidden; border-radius: 10px;
  background:
    radial-gradient(60% 55% at 50% 42%, rgb(var(--c-surface-2) / .55), transparent 70%),
    linear-gradient(180deg, rgb(var(--c-elevated) / .35), rgb(var(--c-surface-2) / .25));
}
/* 中线留白分隔 */
.arena::before {
  content: ''; position: absolute; top: 8%; bottom: 8%; left: 50%; width: 0;
  border-left: 1px dashed rgb(var(--c-line) / .5); transform: translateX(-50%);
}
.side-label { position: absolute; top: .55rem; z-index: 30; font-size: .75rem; font-weight: 800; letter-spacing: .04em; }
.side-label-player { left: .8rem; color: rgb(var(--c-info)); }
.side-label-enemy { right: .8rem; color: rgb(var(--c-danger)); }

/* 两队各占满整个坐标空间（内部单位绝对定位）；入场用一次性 CSS 动画，起点 opacity 不归零 → 恒可见。 */
.team { position: absolute; inset: 0; }
.team-player { animation: enter-left .55s cubic-bezier(.2,.7,.3,1); }
.team-enemy { animation: enter-right .55s cubic-bezier(.2,.7,.3,1); }
@keyframes enter-left { 0% { opacity: .35; transform: translateX(-40px); } 100% { opacity: 1; transform: translateX(0); } }
@keyframes enter-right { 0% { opacity: .35; transform: translateX(40px); } 100% { opacity: 1; transform: translateX(0); } }
@media (prefers-reduced-motion: reduce) { .team-player, .team-enemy { animation: none; } }

/* 数轴上的一个占位点：以中心对齐到 (left%, top%)。 */
.unit-slot { position: absolute; transform: translate(-50%, -50%); }

.vs {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 25;
  font-size: 1rem; font-weight: 900; color: rgb(var(--c-ink-2)); pointer-events: none;
  padding: .1rem .35rem; border-radius: 6px; background: rgb(var(--c-surface) / .7);
}

@media (max-width: 720px) { .arena { min-height: 380px; } }
</style>
