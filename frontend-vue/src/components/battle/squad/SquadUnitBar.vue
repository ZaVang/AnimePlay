<script setup lang="ts">
import { computed } from 'vue';
import { assetUrl } from '@/utils/assetUrl';
import SquadUltimateButton from './SquadUltimateButton.vue';
import type { SquadBattleUnitView, SquadFloatingDamageView } from './types';

const props = defineProps<{
  unit: SquadBattleUnitView;
  // SB-T3 收尾①(A)：本单位当前的瞬态浮动伤害数字（暴击醒目样式），由父层 targetId 分发、View 定时清除。
  floatingDamages?: SquadFloatingDamageView[];
  autoUltimates: boolean;
  battleEnded: boolean;
}>();

defineEmits<{
  castUltimate: [unitId: string];
}>();

const hpPercent = computed(() => Math.max(0, Math.min(100, (props.unit.hp / props.unit.maxHp) * 100)));
const energyPercent = computed(() => Math.max(0, Math.min(100, props.unit.energy / 10)));

const statusLabels: Record<string, string> = {
  shield: '盾',
  atkUp: '攻',
  atkDown: '弱',
  defUp: '防',
  defDown: '破',
  spUp: '术',
  spDown: '封',
  haste: '速',
  slow: '缓',
  critRateUp: '暴',
  stun: '晕',
  silence: '默',
  taunt: '嘲',
  dot: '伤',
  hot: '愈',
};
</script>

<template>
  <div
    class="relative grid min-h-[96px] grid-cols-[56px_minmax(0,1fr)] gap-3 rounded-lg border p-2 sm:grid-cols-[64px_minmax(0,1fr)]"
    :class="[
      unit.side === 'player' ? 'border-info/40 bg-info/10' : 'border-danger/40 bg-danger/10',
      unit.defeated ? 'opacity-60 grayscale' : '',
    ]"
  >
    <!-- SB-T3 收尾①(A)：浮动伤害数字层。暴击用 highlight(金) + 更大字号 + CRIT 标记 + 抖动缩放，普通用 danger。
         pointer-events-none 不挡下方选目标点击；瞬态 by View（定时清除）。 -->
    <div class="pointer-events-none absolute inset-0 z-10 overflow-visible">
      <div
        v-for="hit in (floatingDamages ?? [])"
        :key="hit.id"
        class="absolute left-1/2 top-2 -translate-x-1/2 select-none font-black tabular-nums drop-shadow"
        :class="hit.isCritical
          ? 'squad-dmg-float squad-dmg-float--crit text-xl text-highlight sm:text-2xl'
          : 'squad-dmg-float text-base text-danger sm:text-lg'"
      >
        <span v-if="hit.isCritical" class="mr-0.5 align-super text-[10px] font-extrabold uppercase tracking-wide">CRIT</span>
        -{{ hit.amount }}
      </div>
    </div>
    <div class="relative h-14 w-14 overflow-hidden rounded-md border border-line bg-surface-2 sm:h-16 sm:w-16">
      <img
        loading="lazy"
        decoding="async"
        :src="unit.imagePath"
        :alt="unit.name"
        class="h-full w-full object-cover object-top"
        @error="($event.target as HTMLImageElement).src = assetUrl('/data/images/character/77.jpg')"
      >
      <div class="absolute left-1 top-1 rounded bg-elevated/85 px-1.5 py-0.5 text-[10px] font-bold text-ink">
        {{ unit.position + 1 }}
      </div>
    </div>

    <div class="min-w-0 space-y-1">
      <div class="flex min-w-0 items-center gap-2">
        <div class="truncate text-sm font-bold text-ink">{{ unit.name }}</div>
        <div v-if="unit.defeated" class="shrink-0 rounded bg-danger px-1.5 py-0.5 text-[10px] font-bold text-on-accent">
          击败
        </div>
      </div>

      <div class="space-y-1">
        <div class="h-2 overflow-hidden rounded-full bg-surface-2">
          <div class="h-full rounded-full bg-accent transition-all duration-200" :style="{ width: `${hpPercent}%` }"></div>
        </div>
        <div class="flex justify-between text-[11px] text-ink-2">
          <span>HP</span>
          <span>{{ unit.hp }}/{{ unit.maxHp }}</span>
        </div>
      </div>

      <div class="space-y-1">
        <div class="h-2 overflow-hidden rounded-full bg-surface-2">
          <div class="h-full rounded-full bg-highlight transition-all duration-200" :style="{ width: `${energyPercent}%` }"></div>
        </div>
        <div class="flex justify-between text-[11px] text-ink-2">
          <span>能量</span>
          <span>{{ unit.energy }}/1000</span>
        </div>
      </div>

      <div class="flex min-h-5 flex-wrap gap-1">
        <span
          v-for="status in unit.statuses"
          :key="`${status.kind}-${status.expiresAt}`"
          class="rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-bold text-ink-2"
          :title="status.kind"
        >
          {{ statusLabels[status.kind] ?? status.kind }}
        </span>
        <span v-if="unit.statuses.length === 0" class="text-[10px] text-ink-3">无状态</span>
      </div>

      <SquadUltimateButton
        v-if="unit.side === 'player'"
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
/* SB-T3 收尾①(A)：浮动伤害数字动画。普通伤害上浮淡出；暴击额外一段冲击缩放 + 轻微抖动，强化打击感。 */
.squad-dmg-float {
  animation: squad-dmg-rise 0.9s ease-out forwards;
}

.squad-dmg-float--crit {
  animation: squad-dmg-rise 0.9s ease-out forwards, squad-dmg-crit-pop 0.35s ease-out;
}

@keyframes squad-dmg-rise {
  0% {
    opacity: 0;
    transform: translate(-50%, 4px) scale(0.85);
  }
  15% {
    opacity: 1;
    transform: translate(-50%, 0) scale(1);
  }
  70% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -22px) scale(1);
  }
}

@keyframes squad-dmg-crit-pop {
  0% {
    transform: translate(-50%, 0) scale(1.6) rotate(-4deg);
  }
  45% {
    transform: translate(-50%, 0) scale(0.92) rotate(3deg);
  }
  100% {
    transform: translate(-50%, 0) scale(1) rotate(0deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .squad-dmg-float,
  .squad-dmg-float--crit {
    animation: squad-dmg-fade 0.9s ease-out forwards;
  }
  @keyframes squad-dmg-fade {
    0% { opacity: 0; }
    15% { opacity: 1; }
    70% { opacity: 1; }
    100% { opacity: 0; }
  }
}
</style>
