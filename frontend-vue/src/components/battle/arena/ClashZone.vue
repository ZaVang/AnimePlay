<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/battle';
import AnimeCard from '@/components/AnimeCard.vue'; // Use the standard AnimeCard
import { getStrengthCategory, STRENGTH_CATEGORY_LABEL } from '@/engine/battle/rewards';
import { previewSideStrength, type StrengthBreakdown } from '@/skills/strengthPreview';

const gameStore = useGameStore();

// A more robust way to get clash info, assuming it's in the game store
const clashInfo = computed(() => gameStore.clashInfo);

// 对撞已结算：battleFlow.resolveClash 把权威最终强度 + 奖励并入 clashInfo
const resolved = computed(() => clashInfo.value?.attackerStrength != null);

/**
 * 某侧强度拆解：
 *  - 结算后用 clashInfo 的权威值（含对撞期修正），bonus = 权威值 − 卡面；
 *  - 结算前用非消费预览（出牌前/防御阶段预判，让防守方先看到要对的强度）。
 */
function breakdownFor(side: 'attacker' | 'defender'): StrengthBreakdown | null {
  const c = clashInfo.value;
  if (!c) return null;
  const card = side === 'attacker' ? c.attackingCard : c.defendingCard;
  if (!card) return null;
  const authoritative = side === 'attacker' ? c.attackerStrength : c.defenderStrength;
  if (authoritative != null) {
    const base = card.points || 0;
    return { base, bonus: authoritative - base, total: authoritative };
  }
  return previewSideStrength(side === 'attacker' ? c.attackerId : c.defenderId, card);
}

const attackerBd = computed(() => breakdownFor('attacker'));
const defenderBd = computed(() => breakdownFor('defender'));

function strengthText(b: StrengthBreakdown | null): string {
  if (!b) return '';
  if (b.bonus === 0) return `强度 ${b.total}`;
  return `强度 ${b.total}（卡面 ${b.base} ${b.bonus > 0 ? '+' : ''}${b.bonus}）`;
}
const attackerStrengthText = computed(() => strengthText(attackerBd.value));
const defenderStrengthText = computed(() => strengthText(defenderBd.value));

// 净差与档位（用屏上显示的强度算，三者自洽）
const diffText = computed(() => {
  if (!resolved.value) return '';
  const diff = (attackerBd.value?.total ?? 0) - (defenderBd.value?.total ?? 0);
  return `净差 ${diff > 0 ? '+' : ''}${diff} · ${STRENGTH_CATEGORY_LABEL[getStrengthCategory(diff)]}`;
});

// 结算奖励增减（浮字）；议题正向 = 向攻方推进
const rewards = computed(() => clashInfo.value?.rewards ?? null);
function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}
</script>

<template>
  <div class="clash-zone">
    <div v-if="clashInfo && clashInfo.attackingCard" class="clash-display">
      <!-- Attacker's Card -->
      <div class="card-slot attacker">
        <div class="final-strength">{{ attackerStrengthText }}</div>
        <AnimeCard :anime="clashInfo.attackingCard" :show-cost="true" :show-strength="true" />
        <div class="style-tag">{{ clashInfo.attackStyle }}</div>
        <div
          v-if="resolved && rewards && rewards.attackerReputationChange !== 0"
          class="reward-float"
          :class="rewards.attackerReputationChange > 0 ? 'tone-up' : 'tone-down'"
        >声望 {{ signed(rewards.attackerReputationChange) }}</div>
      </div>

      <div class="vs-icon-wrap">
        <div class="vs-icon">⚔️</div>
        <div v-if="resolved" class="diff-label">{{ diffText }}</div>
        <div
          v-if="resolved && rewards && rewards.topicBiasChange !== 0"
          class="reward-float bias"
          :class="rewards.topicBiasChange > 0 ? 'tone-up' : 'tone-down'"
        >议题 {{ signed(rewards.topicBiasChange) }}</div>
      </div>

      <!-- Defender's Card -->
      <div class="card-slot defender">
        <template v-if="clashInfo.defendingCard">
          <div class="final-strength">{{ defenderStrengthText }}</div>
          <AnimeCard :anime="clashInfo.defendingCard" :show-cost="true" :show-strength="true" />
          <div class="style-tag">{{ clashInfo.defenseStyle }}</div>
          <div
            v-if="resolved && rewards && rewards.defenderReputationChange !== 0"
            class="reward-float"
            :class="rewards.defenderReputationChange > 0 ? 'tone-up' : 'tone-down'"
          >声望 {{ signed(rewards.defenderReputationChange) }}</div>
        </template>
        <div v-else class="empty-slot">
          {{ resolved ? '未防御 · 强度 0' : '等待响应...' }}
        </div>
      </div>
    </div>
    <div v-else class="placeholder">
      选择一张手牌来发起辩论
    </div>
  </div>
</template>

<style scoped>
.clash-zone {
  @apply w-full h-full;
}

.placeholder {
  @apply w-full h-full flex items-center justify-center text-ink-2 text-2xl font-bold;
}

.clash-display {
  @apply w-full h-full flex items-center justify-around;
}

.card-slot {
  @apply relative w-40 h-56;
}
.empty-slot {
  @apply w-40 h-56 border-2 border-dashed border-line rounded-lg flex items-center justify-center text-ink-2;
}
.vs-icon-wrap {
  @apply flex flex-col items-center mx-8;
}
.vs-icon {
  @apply text-5xl text-red-500 font-bold;
}
.diff-label {
  @apply mt-2 text-sm font-bold text-ink bg-surface-2 px-3 py-1 rounded-full whitespace-nowrap;
}
.final-strength {
  @apply absolute left-1/2 -translate-x-1/2 text-sm font-extrabold text-ink whitespace-nowrap;
  top: -28px;
}
.style-tag {
  @apply absolute -bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-80 text-white text-sm font-bold px-3 py-1 rounded-full;
}

/* 结算浮字：声望/议题增减，上浮淡出（在 ~3s 展示窗内播一次） */
.reward-float {
  @apply absolute left-1/2 text-base font-extrabold whitespace-nowrap pointer-events-none z-20;
  top: 38%;
  animation: reward-rise 1.6s ease-out forwards;
}
.reward-float.bias {
  position: static;
  @apply mt-1 text-sm;
  animation: reward-rise-static 1.6s ease-out forwards;
}
.tone-up { color: rgb(var(--c-accent)); }
.tone-down { color: rgb(var(--c-danger)); }
@keyframes reward-rise {
  0% { opacity: 0; transform: translate(-50%, 10px); }
  20% { opacity: 1; }
  75% { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%, -26px); }
}
@keyframes reward-rise-static {
  0% { opacity: 0; transform: translateY(8px); }
  20% { opacity: 1; }
  75% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-20px); }
}
</style>