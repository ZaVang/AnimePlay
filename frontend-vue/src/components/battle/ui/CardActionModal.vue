<script setup lang="ts">
import type { AnimeCard as AnimeCardType } from '@/types/card';
import AnimeCard from '@/components/AnimeCard.vue'; // Use the standard AnimeCard
import { useGameStore } from '@/stores/battle';
import { persistentEffects } from '@/skills/systems';
import { playerCardCost } from '@/skills/effects/costModifiers';
import { previewSideStrength } from '@/skills/strengthPreview';
import { getStrengthCategory, STRENGTH_CATEGORY_LABEL } from '@/engine/battle/rewards';
import { computed } from 'vue';

const props = defineProps<{
  card: AnimeCardType;
  isVisible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'play', style: '友好安利' | '辛辣点评' | '赞同' | '反驳'): void;
}>();

const gameStore = useGameStore();
const isDefensePhase = computed(() => gameStore.phase === 'defense');

// S8a：显示实际费用（与扣费同源 playerCardCost：追踪器加减费 + 条件被动减费）。
// 追踪器非响应式，但弹窗每次打开经 v-if 重建，取值即当前状态。
const effCost = computed(() => playerCardCost('playerA', props.card));
// S8a：被强制友好安利时禁用辛辣点评（battleFlow 同口径钳制兜底）
const forcedFriendly = computed(() => persistentEffects.getForcedAction('playerA') === 'friendly_only');

// 防御阶段出牌前预判：用这张牌防御时，你的强度 vs 已亮明的攻方强度 → 净差与档位
// （结算按「攻方强度 − 守方强度」分档；预览不含对撞期专属修正，仅作预判）
const defensePrediction = computed(() => {
  const c = gameStore.clashInfo;
  if (!isDefensePhase.value || !c?.attackingCard) return null;
  const opp = previewSideStrength(c.attackerId, c.attackingCard).total;
  const you = previewSideStrength(c.defenderId ?? 'playerA', props.card).total;
  const atkDiff = opp - you;
  const cat = getStrengthCategory(atkDiff);
  const tone = cat === 'draw' ? 'neutral' : cat.startsWith('attacker') ? 'bad' : 'good';
  return { you, opp, atkDiff, label: STRENGTH_CATEGORY_LABEL[cat], tone };
});
function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}
</script>

<template>
  <div v-if="isVisible" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <h3 class="text-xl font-bold mb-4 text-center">
        {{ isDefensePhase ? '要如何回应？' : '要如何出牌？' }}
      </h3>
      <div class="card-display mb-6">
        <AnimeCard :anime="card" :show-cost="true" :show-strength="true" />
      </div>
      <div v-if="defensePrediction" class="defense-prediction" :class="`tone-${defensePrediction.tone}`">
        <div class="dp-line">你 {{ defensePrediction.you }} · 对手 {{ defensePrediction.opp }}</div>
        <div class="dp-tier">预估 净差 {{ signed(defensePrediction.atkDiff) }} · {{ defensePrediction.label }}</div>
      </div>
      <div class="action-buttons">
        <!-- Defense Phase Buttons -->
        <template v-if="isDefensePhase">
          <button @click="emit('play', '赞同')" class="btn-primary">
            <p class="font-bold">赞同</p>
            <p class="text-xs">花费 {{ effCost }} TP</p>
          </button>
          <button @click="emit('play', '反驳')" class="btn-secondary">
            <p class="font-bold">反驳</p>
            <p class="text-xs">花费 {{ effCost + 1 }} TP</p>
          </button>
        </template>
        <!-- Action Phase Buttons -->
        <template v-else>
          <button @click="emit('play', '友好安利')" class="btn-primary">
            <p class="font-bold">友好安利</p>
            <p class="text-xs">花费 {{ effCost }} TP</p>
          </button>
          <button
            @click="emit('play', '辛辣点评')"
            class="btn-secondary"
            :disabled="forcedFriendly"
            :title="forcedFriendly ? '受效果限制，本回合只能友好安利' : ''"
          >
            <p class="font-bold">辛辣点评</p>
            <p class="text-xs">{{ forcedFriendly ? '被强制友好' : `花费 ${effCost + 1} TP` }}</p>
          </button>
        </template>
      </div>
      <button @click="emit('close')" class="absolute top-2 right-2 text-ink-2 hover:text-ink">✕</button>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background-color: rgb(var(--c-elevated));
  color: rgb(var(--c-ink));
  padding: 2rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(var(--c-line));
  position: relative;
  width: 320px;
}
.card-display {
  width: 200px;
  margin: 0 auto;
}
.action-buttons {
  display: flex;
  justify-content: space-around;
  gap: 1rem;
}
.defense-prediction {
  @apply mb-4 text-center text-sm rounded-lg py-2 px-3 border;
}
.defense-prediction .dp-line {
  @apply text-ink-2;
}
.defense-prediction .dp-tier {
  @apply font-bold mt-0.5;
}
.defense-prediction.tone-good {
  @apply bg-accent-soft border-accent/40 text-accent;
}
.defense-prediction.tone-bad {
  @apply bg-danger/10 border-danger/40 text-danger;
}
.defense-prediction.tone-neutral {
  @apply bg-surface-2 border-line text-ink-2;
}
.btn-primary, .btn-secondary {
  @apply font-bold py-2 px-4 rounded-lg w-full transition-colors;
}
.btn-primary {
  @apply bg-accent hover:bg-accent-strong text-on-accent;
}
/* 辛辣/反驳为攻击风格识别色（红），刻意保持固定，不随皮肤 */
.btn-secondary {
  @apply bg-red-600 hover:bg-red-700 text-white;
}
.btn-secondary:disabled {
  @apply opacity-45 cursor-not-allowed hover:bg-red-600;
}
</style>