<script setup lang="ts">
import type { AnimeCard as AnimeCardType } from '@/types/card';
import AnimeCard from '@/components/AnimeCard.vue'; // Use the standard AnimeCard
import { useGameStore } from '@/stores/battle';
import { persistentEffects } from '@/skills/systems';
import { playerCardCost } from '@/skills/effects/costModifiers';
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