<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import SquadStageUnit from './SquadStageUnit.vue';
import SquadPartyFrames from './SquadPartyFrames.vue';
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
  <section class="hud g-card">
    <!-- 顶部：敌方框（血/能量/状态/KO 全在框内） -->
    <SquadPartyFrames
      :units="enemyUnits"
      side="enemy"
      :auto-ultimates="autoUltimates"
      :battle-ended="battleEnded"
    />

    <!-- 舞台：PCR 天空→地面渐变 + 地面带 + 中线；只渲染立绘（血条/能量/状态都在上下框） -->
    <div class="arena">
      <div class="arena-ground"></div>
      <div class="arena-baseline"></div>
      <div class="arena-mid"></div>
      <div class="vsbadge">VS</div>

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
            :attacking="attackingId === p.unit.id"
            :hit="hitId === p.unit.id"
          />
        </div>
      </div>

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
            :attacking="attackingId === p.unit.id"
            :hit="hitId === p.unit.id"
            :targetable="isTargeting && !p.unit.defeated"
            @click="isTargeting && !p.unit.defeated ? emit('selectTarget', p.unit.id) : undefined"
          />
        </div>
      </div>
    </div>

    <!-- 选目标提示条（isTargeting）：保留 + 取消 -->
    <div v-if="isTargeting" class="targeting-bar">
      <span>选择「{{ targetingCasterName }}」大招目标：点击敌方立绘释放</span>
      <button type="button" class="targeting-cancel" @click="emit('cancelTargeting')">取消</button>
    </div>

    <!-- 控制条：裁决倒计时 + 倍速 1/2/4 + 自动大招开关 -->
    <div class="bctrl">
      <div class="count">
        <div class="count-line">
          <span :class="{ crit: timeCritical }">裁决倒计时</span>
          <span class="num" :class="{ crit: timeCritical }">{{ remainingSeconds.toFixed(1) }}s</span>
        </div>
        <div class="count-bar">
          <i :class="{ crit: timeCritical }" :style="{ width: `${elapsedPercent}%` }"></i>
        </div>
      </div>

      <div class="speed" role="group" aria-label="回放倍速">
        <button
          v-for="s in ([1, 2, 4] as const)"
          :key="s"
          type="button"
          :class="{ on: playbackSpeed === s }"
          @click="emit('setSpeed', s)"
        >×{{ s }}</button>
      </div>

      <button
        type="button"
        class="auto-btn"
        :class="{ on: autoUltimates }"
        :disabled="battleEnded"
        @click="emit('toggleAuto')"
      >{{ autoUltimates ? '自动大招：开' : '自动大招：关' }}</button>
    </div>

    <!-- 底部：我方框（charged 框可点释放大招，取代原立绘下按钮） -->
    <SquadPartyFrames
      :units="playerUnits"
      side="player"
      :auto-ultimates="autoUltimates"
      :battle-ended="battleEnded"
      @cast-ultimate="emit('castUltimate', $event)"
    />
  </section>
</template>

<style scoped>
/* 胖卡外壳（借鉴 hub .g-card：面 + 线 + 面板圆角 + 柔和投影 + 顶部高光）。 */
.hud {
  position: relative; overflow: hidden;
  border: 1px solid rgb(var(--c-line)); border-radius: var(--sk-radius-panel);
  background: rgb(var(--c-surface)); box-shadow: var(--sk-shadow-card);
}
.hud::before {
  content: ""; position: absolute; inset: 0 0 auto 0; height: 40%; z-index: 0;
  border-radius: var(--sk-radius-panel) var(--sk-radius-panel) 0 0;
  background: linear-gradient(180deg, rgb(var(--c-elevated) / .5), transparent);
  pointer-events: none;
}
.hud > * { position: relative; z-index: 1; }

/* —— PCR 舞台：天空→地面渐变 + 地面带 + 中线，只放立绘 —— */
.arena {
  position: relative; width: 100%; box-sizing: border-box; min-height: 320px; overflow: hidden;
  background: linear-gradient(
    180deg,
    rgb(var(--c-info) / .18) 0%,
    rgb(var(--c-accent-soft) / .5) 55%,
    rgb(var(--c-line-2) / .55) 100%
  );
}
.arena-ground {
  position: absolute; left: 0; right: 0; bottom: 0; height: 38%;
  background: linear-gradient(180deg, rgb(var(--c-line-2) / .7), rgb(var(--c-line-2) / .95));
}
.arena-baseline {
  position: absolute; left: 5%; right: 5%; bottom: 38%; height: 0;
  border-top: 2px dashed rgb(var(--c-ink) / .18);
}
.arena-mid {
  position: absolute; left: 50%; top: 8%; bottom: 38%; width: 0;
  border-left: 1px dashed rgb(var(--c-ink) / .22); transform: translateX(-50%);
}
.vsbadge {
  position: absolute; left: 50%; top: .5rem; transform: translateX(-50%); z-index: 25;
  font-size: .72rem; font-weight: 900; color: rgb(var(--c-ink-2)); pointer-events: none;
  padding: .12rem .5rem; border-radius: 999px; background: rgb(var(--c-surface) / .78);
}

/* 两队各占满整个坐标空间（内部单位绝对定位）；入场用一次性 CSS 动画，起点 opacity 不归零 → 恒可见。 */
.team { position: absolute; inset: 0; }
.team-player { animation: enter-left .55s cubic-bezier(.2,.7,.3,1); }
.team-enemy { animation: enter-right .55s cubic-bezier(.2,.7,.3,1); }
@keyframes enter-left { 0% { opacity: .35; transform: translateX(-40px); } 100% { opacity: 1; transform: translateX(0); } }
@keyframes enter-right { 0% { opacity: .35; transform: translateX(40px); } 100% { opacity: 1; transform: translateX(0); } }
@media (prefers-reduced-motion: reduce) { .team-player, .team-enemy { animation: none; } }

/* 数轴上的一个占位点：以中心对齐到 (left%, top%)。 */
.unit-slot { position: absolute; transform: translate(-50%, -50%); }

/* —— 选目标提示条 —— */
.targeting-bar {
  display: flex; align-items: center; justify-content: space-between; gap: .75rem;
  margin: .6rem .75rem; padding: .5rem .75rem;
  border: 1px solid rgb(var(--c-highlight)); border-radius: var(--sk-radius-control);
  background: rgb(var(--c-highlight) / .15);
  font-size: .82rem; font-weight: 700; color: rgb(var(--c-ink));
}
.targeting-cancel {
  flex-shrink: 0; padding: .25rem .6rem; border: 1px solid rgb(var(--c-line));
  border-radius: var(--sk-radius-control); background: rgb(var(--c-surface));
  font-size: .72rem; font-weight: 800; color: rgb(var(--c-ink-2)); cursor: pointer;
}
.targeting-cancel:hover { color: rgb(var(--c-ink)); }

/* —— 控制条：借鉴 mockup .bctrl，全令牌化 —— */
.bctrl {
  display: flex; align-items: center; gap: .6rem; flex-wrap: wrap;
  padding: .6rem .85rem; border-top: 1px solid rgb(var(--c-line));
}
.count { display: flex; flex-direction: column; gap: .25rem; flex: 1; min-width: 140px; }
.count-line { display: flex; justify-content: space-between; font-size: .72rem; font-weight: 800; color: rgb(var(--c-ink-2)); }
.count-line .crit { color: rgb(var(--c-danger)); }
.count-bar { height: 6px; border-radius: 999px; background: rgb(var(--c-surface-2)); overflow: hidden; }
.count-bar i { display: block; height: 100%; border-radius: 999px; background: rgb(var(--c-accent)); transition: width .2s ease; }
.count-bar i.crit { background: rgb(var(--c-danger)); }

.speed { display: flex; gap: 3px; background: rgb(var(--c-surface-2)); border-radius: 999px; padding: 3px; }
.speed button {
  font-size: .72rem; font-weight: 800; padding: .28rem .65rem; border-radius: 999px;
  border: 0; background: transparent; color: rgb(var(--c-ink-2)); cursor: pointer;
}
.speed button.on { background: rgb(var(--c-accent)); color: rgb(var(--c-on-accent)); }

.auto-btn {
  min-height: 2.2rem; padding: .32rem .8rem; border-radius: var(--sk-radius-control);
  border: 1px solid rgb(var(--c-line)); background: rgb(var(--c-surface-2));
  font-size: .78rem; font-weight: 800; color: rgb(var(--c-ink)); cursor: pointer; transition: filter .12s;
}
.auto-btn.on { border-color: transparent; background: rgb(var(--c-accent)); color: rgb(var(--c-on-accent)); }
.auto-btn:disabled { opacity: .5; cursor: not-allowed; }

@media (max-width: 720px) { .arena { min-height: 280px; } }
</style>
