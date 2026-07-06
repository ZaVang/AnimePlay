<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import SquadStageUnit from './SquadStageUnit.vue';
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

// —— 前中后排编队：每队按 tier 分列，前排贴中线 ——
type Col = { tier: number; units: SquadBattleUnitView[] };
function columns(units: SquadBattleUnitView[], side: 'player' | 'enemy'): Col[] {
  const byTier: Record<number, SquadBattleUnitView[]> = { 0: [], 1: [], 2: [] };
  for (const u of units) (byTier[u.positionOrder] ??= []).push(u);
  // player：后→中→前（前排在最右=贴中线）；enemy：前→中→后（前排在最左=贴中线）。
  const order = side === 'player' ? [2, 1, 0] : [0, 1, 2];
  return order.map(t => ({ tier: t, units: byTier[t] ?? [] })).filter(c => c.units.length > 0);
}
const playerCols = computed(() => columns(props.playerUnits, 'player'));
const enemyCols = computed(() => columns(props.enemyUnits, 'enemy'));

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
        <div v-for="col in playerCols" :key="`p-${col.tier}`" class="tier-col">
          <SquadStageUnit
            v-for="u in col.units"
            :key="u.id"
            :unit="u"
            :floating-damages="floatingFor(u.id)"
            :auto-ultimates="autoUltimates"
            :battle-ended="battleEnded"
            :attacking="attackingId === u.id"
            :hit="hitId === u.id"
            @cast-ultimate="emit('castUltimate', $event)"
          />
        </div>
      </div>

      <div class="vs">VS</div>

      <div class="team team-enemy">
        <div v-for="col in enemyCols" :key="`e-${col.tier}`" class="tier-col">
          <SquadStageUnit
            v-for="u in col.units"
            :key="u.id"
            :unit="u"
            :floating-damages="floatingFor(u.id)"
            :auto-ultimates="autoUltimates"
            :battle-ended="battleEnded"
            :attacking="attackingId === u.id"
            :hit="hitId === u.id"
            :targetable="isTargeting && !u.defeated"
            @click="isTargeting && !u.defeated ? emit('selectTarget', u.id) : undefined"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.arena {
  position: relative; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: .5rem;
  min-height: 380px; padding: 2.2rem .5rem 1rem; overflow: hidden; border-radius: 10px;
  background:
    radial-gradient(120% 80% at 50% 0%, rgb(var(--c-surface-2) / .5), transparent 60%),
    linear-gradient(180deg, rgb(var(--c-elevated) / .35), rgb(var(--c-surface-2) / .25));
}
.side-label { position: absolute; top: .5rem; font-size: .75rem; font-weight: 800; letter-spacing: .04em; }
.side-label-player { left: .8rem; color: rgb(var(--c-info)); }
.side-label-enemy { right: .8rem; color: rgb(var(--c-danger)); }

/* 静止态始终可见；入场用一次性 CSS 动画（fill-mode:none → 动画不跑也照常可见，绝不卡在不可见）。 */
.team { display: flex; align-items: center; gap: .4rem; }
.team-player { justify-content: flex-end; animation: enter-left .55s cubic-bezier(.2,.7,.3,1); }
.team-enemy { justify-content: flex-start; animation: enter-right .55s cubic-bezier(.2,.7,.3,1); }
/* 起始 opacity 不归零（0.35）：即便动画因页面隐藏冻结在起点，队伍也始终可见，绝不整队消失。 */
@keyframes enter-left { 0% { opacity: .35; transform: translateX(-48px); } 100% { opacity: 1; transform: translateX(0); } }
@keyframes enter-right { 0% { opacity: .35; transform: translateX(48px); } 100% { opacity: 1; transform: translateX(0); } }
@media (prefers-reduced-motion: reduce) { .team-player, .team-enemy { animation: none; } }
.tier-col { display: flex; flex-direction: column; justify-content: center; gap: 1rem; }

.vs { align-self: center; font-size: 1.1rem; font-weight: 900; color: rgb(var(--c-ink-2)); padding: 0 .3rem; }

@media (max-width: 720px) {
  .arena { grid-template-columns: 1fr auto 1fr; min-height: 320px; }
  .tier-col { gap: .6rem; }
}
</style>
