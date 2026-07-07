<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { assetUrl } from '@/utils/assetUrl';
import { spriteSheetSrc } from '@/utils/cardImage';
import type { SquadBattleUnitView, SquadFloatingDamageView } from './types';

const props = defineProps<{
  unit: SquadBattleUnitView;
  floatingDamages?: SquadFloatingDamageView[];
  /** 选目标态下：本单位是否可被点选为大招目标（敌方存活）。 */
  targetable?: boolean;
  /** fx 脉冲：本单位刚发动攻击 / 刚被命中（由父层按回放事件驱动）。 */
  attacking?: boolean;
  hit?: boolean;
}>();

// —— sprite 表几何（与家园一致：3 列行走帧 × 4 行朝向，格 48×64；站姿取中间帧）——
const CELL_W = 48, CELL_H = 64, SCALE = 2.0;
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
</script>

<template>
  <div
    class="stage-unit"
    :class="[
      `side-${unit.side}`,
      { defeated: unit.defeated, attacking, hit, targetable }
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

    <!-- 纯立绘：sprite 侧面帧，缺失回落头像 -->
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
    </div>
  </div>
</template>

<style scoped>
.stage-unit {
  position: relative; display: flex; flex-direction: column; align-items: center;
  transition: transform .18s ease, filter .18s ease, opacity .3s ease;
}

.sprite-clip { position: relative; overflow: hidden; }
.sprite-sheet { position: absolute; image-rendering: auto; max-width: none; }
.portrait { width: 100%; height: 100%; object-fit: cover; object-position: top; border-radius: 8px; }
.side-enemy .portrait { transform: scaleX(-1); }
.ko { position: absolute; inset: 0; display: grid; place-items: center; font-size: 2rem; font-weight: 900; color: rgb(var(--c-danger)); text-shadow: 0 1px 3px rgba(0,0,0,.6); }

/* —— 状态 —— */
.defeated { opacity: .45; filter: grayscale(1); }
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
