<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/battle';
import AnimeCard from '@/components/AnimeCard.vue'; // Use the standard AnimeCard
import { getStrengthCategory, STRENGTH_CATEGORY_LABEL } from '@/engine/battle/rewards';

const gameStore = useGameStore();

// A more robust way to get clash info, assuming it's in the game store
const clashInfo = computed(() => gameStore.clashInfo);

// 对撞已结算：battleFlow.resolveClash 把最终强度（卡面+光环+持续效果）并入 clashInfo
const resolved = computed(() => clashInfo.value?.attackerStrength != null);
const attackerStrength = computed(() => clashInfo.value?.attackerStrength ?? 0);
const defenderStrength = computed(() => clashInfo.value?.defenderStrength ?? 0);
const diffText = computed(() => {
  if (!resolved.value) return '';
  const diff = attackerStrength.value - defenderStrength.value;
  const sign = diff > 0 ? '+' : '';
  return `净差 ${sign}${diff} · ${STRENGTH_CATEGORY_LABEL[getStrengthCategory(diff)]}`;
});
</script>

<template>
  <div class="clash-zone">
    <div v-if="clashInfo && clashInfo.attackingCard" class="clash-display">
      <!-- Attacker's Card -->
      <div class="card-slot attacker">
        <div v-if="resolved" class="final-strength">最终强度 {{ attackerStrength }}</div>
        <AnimeCard :anime="clashInfo.attackingCard" :show-cost="true" :show-strength="true" />
        <div class="style-tag">{{ clashInfo.attackStyle }}</div>
      </div>

      <div class="vs-icon-wrap">
        <div class="vs-icon">⚔️</div>
        <div v-if="resolved" class="diff-label">{{ diffText }}</div>
      </div>

      <!-- Defender's Card -->
      <div class="card-slot defender">
        <template v-if="clashInfo.defendingCard">
          <div v-if="resolved" class="final-strength">最终强度 {{ defenderStrength }}</div>
          <AnimeCard :anime="clashInfo.defendingCard" :show-cost="true" :show-strength="true" />
          <div class="style-tag">{{ clashInfo.defenseStyle }}</div>
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
</style>