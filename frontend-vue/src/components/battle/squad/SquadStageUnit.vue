<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { assetUrl } from '@/utils/assetUrl';
import { spriteSheetSrc } from '@/utils/cardImage';
import SquadUltimateButton from './SquadUltimateButton.vue';
import type { SquadBattleUnitView, SquadFloatingDamageView } from './types';

const props = defineProps<{
  unit: SquadBattleUnitView;
  floatingDamages?: SquadFloatingDamageView[];
  autoUltimates: boolean;
  battleEnded: boolean;
  /** 选目标态下：本单位是否可被点选为大招目标（敌方存活）。 */
  targetable?: boolean;
  /** fx 脉冲：本单位刚发动攻击 / 刚被命中（由父层按回放事件驱动）。 */
  attacking?: boolean;
  hit?: boolean;
}>();

defineEmits<{ castUltimate: [unitId: string] }>();

// —— sprite 表几何（与家园一致：3 列行走帧 × 4 行朝向，格 48×64；站姿取中间帧）——
const CELL_W = 48, CELL_H = 64, SCALE = 1.7;
const DW = CELL_W * SCALE, DH = CELL_H * SCALE;
// 我方朝右（row 3）面向敌人，敌方朝左（row 2）面向我方；站姿列 = 1。
const STAND_COL = 1;
const spriteFailed = ref(false);
watch(() => props.unit.characterId, () => { spriteFailed.value = false; });

const row = computed(() => (props.unit.side === 'player' ? 3 : 2));
const sheetStyle = computed(() => ({
  width: `${DW * 3}px`,
  height: `${DH * 4}px`,
  left: `${-STAND_COL * DW}px`,
  top: `${-row.value * DH}px`,
}));
const clipStyle = { width: `${DW}px`, height: `${DH}px` };

const hpPercent = computed(() => Math.max(0, Math.min(100, (props.unit.hp / props.unit.maxHp) * 100)));
const energyPercent = computed(() => Math.max(0, Math.min(100, props.unit.energy / 10)));
const lowHp = computed(() => hpPercent.value <= 30);

const statusLabels: Record<string, string> = {
  shield: '盾', atkUp: '攻', atkDown: '弱', defUp: '防', defDown: '破', spUp: '术', spDown: '封',
  haste: '速', slow: '缓', critRateUp: '暴', stun: '晕', silence: '默', taunt: '嘲', dot: '伤', hot: '愈',
};
</script>

<template>
  <div
    class="stage-unit"
    :class="[
      `side-${unit.side}`,
      { defeated: unit.defeated, attacking, hit, targetable, ready: unit.ultimateReady && !unit.defeated }
    ]"
    :role="targetable ? 'button' : undefined"
  >
    <!-- 浮动伤害数字 -->
    <div class="floaters">
      <span
        v-for="f in (floatingDamages ?? [])"
        :key="f.id"
        class="floater"
        :class="f.isCritical ? 'crit' : ''"
      >{{ f.isCritical ? 'CRIT ' : '' }}-{{ f.amount }}</span>
    </div>

    <!-- 头顶信息条：名字 + HP + 能量 -->
    <div class="unit-head">
      <div class="unit-name">
        <span class="role-ico">{{ unit.roleIcon }}</span>{{ unit.name }}
      </div>
      <div class="bar hp"><i :style="{ width: hpPercent + '%' }" :class="{ low: lowHp }"></i></div>
      <div class="bar energy"><i :style="{ width: energyPercent + '%' }"></i></div>
    </div>

    <!-- 状态芯片 -->
    <div v-if="unit.statuses.length" class="statuses">
      <span v-for="s in unit.statuses.slice(0, 6)" :key="`${s.kind}-${s.expiresAt}`" class="chip" :title="s.kind">{{ statusLabels[s.kind] ?? s.kind }}</span>
    </div>

    <!-- 立绘：sprite 侧面帧，缺失回落头像 -->
    <div class="sprite-clip" :style="clipStyle">
      <img
        v-if="!spriteFailed"
        class="sprite-sheet"
        :src="spriteSheetSrc(unit.characterId)"
        :style="sheetStyle"
        alt=""
        @error="spriteFailed = true"
      >
      <img
        v-else
        class="portrait"
        :src="unit.imagePath"
        :alt="unit.name"
        @error="($event.target as HTMLImageElement).src = assetUrl('/data/images/character/77.jpg')"
      >
      <span v-if="unit.defeated" class="ko">✖</span>
      <span class="pos-tag" :class="`p${unit.positionOrder}`">{{ unit.positionLabel }}</span>
    </div>

    <!-- 我方大招按钮 -->
    <div v-if="unit.side === 'player'" class="ult-slot">
      <SquadUltimateButton
        :ready="unit.ultimateReady"
        :disabled="battleEnded || unit.defeated"
        :auto-mode="autoUltimates"
        :label="unit.ultimateName"
        @cast="$emit('castUltimate', unit.id)"
      />
    </div>
  </div>
</template>

<style scoped>
.stage-unit {
  position: relative; display: flex; flex-direction: column; align-items: center; gap: .25rem;
  width: 96px; transition: transform .18s ease, filter .18s ease, opacity .3s ease;
}
.side-enemy { }
.unit-head { width: 104px; display: flex; flex-direction: column; gap: 2px; }
.unit-name { font-size: .64rem; font-weight: 800; color: rgb(var(--c-ink)); text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.role-ico { margin-right: 1px; }
.bar { height: 5px; border-radius: 999px; background: rgb(var(--c-surface-2)); overflow: hidden; border: 1px solid rgb(var(--c-line) / .6); }
.bar i { display: block; height: 100%; border-radius: 999px; transition: width .2s ease; }
.bar.hp i { background: rgb(var(--c-success)); }
.bar.hp i.low { background: rgb(var(--c-danger)); }
.bar.energy i { background: rgb(var(--c-highlight)); }

.statuses { display: flex; flex-wrap: wrap; gap: 2px; justify-content: center; min-height: 0; max-width: 108px; }
.chip { font-size: .55rem; font-weight: 800; line-height: 1; padding: 1px 3px; border-radius: 3px; background: rgb(var(--c-elevated) / .85); color: rgb(var(--c-ink-2)); }

.sprite-clip { position: relative; overflow: hidden; }
.sprite-sheet { position: absolute; image-rendering: auto; max-width: none; }
.portrait { width: 100%; height: 100%; object-fit: cover; object-position: top; border-radius: 8px; }
.side-enemy .portrait { transform: scaleX(-1); }
.ko { position: absolute; inset: 0; display: grid; place-items: center; font-size: 2rem; font-weight: 900; color: rgb(var(--c-danger)); text-shadow: 0 1px 3px rgba(0,0,0,.6); }
.pos-tag { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); font-size: .5rem; font-weight: 900; line-height: 1; padding: 1px 4px; border-radius: 999px 999px 0 0; color: rgb(var(--c-on-accent)); }
.pos-tag.p0 { background: rgb(var(--c-danger)); }
.pos-tag.p1 { background: rgb(var(--c-highlight)); }
.pos-tag.p2 { background: rgb(var(--c-info)); }

.ult-slot { width: 104px; }

/* —— 状态 —— */
.defeated { opacity: .45; filter: grayscale(1); }
.ready:not(.defeated) .sprite-clip { box-shadow: 0 0 0 2px rgb(var(--c-highlight)), 0 0 12px rgb(var(--c-highlight) / .6); border-radius: 8px; }
.targetable { cursor: pointer; }
.targetable .sprite-clip { outline: 2px solid rgb(var(--c-highlight)); outline-offset: 2px; border-radius: 6px; }

/* —— 攻击/受击动画 —— */
.attacking.side-player { animation: lunge-right .28s ease; }
.attacking.side-enemy { animation: lunge-left .28s ease; }
.hit { animation: shake .26s ease; }
.hit .sprite-clip::after { content: ''; position: absolute; inset: 0; background: rgb(var(--c-danger) / .5); border-radius: 8px; animation: flash .26s ease; }

@keyframes lunge-right { 0%,100% { transform: translateX(0); } 45% { transform: translateX(16px); } }
@keyframes lunge-left { 0%,100% { transform: translateX(0); } 45% { transform: translateX(-16px); } }
@keyframes shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-4px); } 50% { transform: translateX(4px); } 80% { transform: translateX(-2px); } }
@keyframes flash { 0% { opacity: .8; } 100% { opacity: 0; } }

.floaters { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); z-index: 5; pointer-events: none; width: 0; display: flex; flex-direction: column; align-items: center; }
.floater { font-weight: 900; font-size: .95rem; color: rgb(var(--c-danger)); white-space: nowrap; text-shadow: 0 1px 2px rgba(0,0,0,.5); animation: rise .9s ease-out forwards; }
.floater.crit { color: rgb(var(--c-highlight)); font-size: 1.2rem; }
@keyframes rise { 0% { opacity: 0; transform: translateY(6px) scale(.8); } 15% { opacity: 1; transform: translateY(0) scale(1); } 70% { opacity: 1; } 100% { opacity: 0; transform: translateY(-24px); } }

@media (prefers-reduced-motion: reduce) {
  .attacking.side-player, .attacking.side-enemy, .hit { animation: none; }
}
</style>
