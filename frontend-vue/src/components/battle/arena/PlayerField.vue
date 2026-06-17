<script setup lang="ts">
import { computed } from 'vue';
import { usePlayerStore, useGameStore, useHistoryStore } from '@/stores/battle';
import CharacterLineup from '@/components/battle/character/CharacterLineup.vue';
import HandDisplay from '@/components/battle/HandDisplay.vue';
import { describePlayerStatus } from '@/skills/statusDisplay';

const props = defineProps<{
  playerId: 'playerA' | 'playerB';
  isOpponent?: boolean;
}>();

const playerStore = usePlayerStore();
const gameStore = useGameStore();
const historyStore = useHistoryStore();
const player = computed(() => playerStore[props.playerId]);

// 当前生效的隐藏状态（护盾/强制/限制/加成）。persistentEffects 是非 Vue 单例，
// 这里挂战斗日志长度 + 回合 + 阶段作响应式触发——状态变更必伴随其一（写入/过期都记日志，
// 限制过期发生在回合切换），故据此重算即可覆盖所有变更时点。
const statuses = computed(() => {
  void historyStore.log.length;
  void gameStore.turn;
  void gameStore.phase;
  return describePlayerStatus(props.playerId);
});
</script>

<template>
  <div class="player-field-layout-horizontal" :class="{ 'opponent-layout': isOpponent }">
    <!-- Left Side: Character Lineup and Player Info -->
    <div class="character-and-status-container">
      <div class="player-info-wrapper">
        <h3 class="text-xl font-bold truncate">{{ player.name }}</h3>
        <div class="info-stats">
          <p title="声望：被打到 0 即判负">声望: <span class="font-bold text-accent">{{ player.reputation }}</span></p>
          <p title="TP：出牌/技能的行动点，每回合上限+1并回满">TP: <span class="font-bold text-blue-400">{{ player.tp }}/{{ player.maxTp }}</span></p>
          <p title="牌库剩余；抽空时自动洗入弃牌堆续抽">牌库: <span class="font-bold text-ink-2">{{ player.deck.length }}</span></p>
          <p>弃牌堆: <span class="font-bold text-ink-2">{{ player.discardPile.length }}</span></p>
        </div>
      </div>

      <!-- 常驻状态芯片：把护盾/强制/限制/加成等隐藏机制显形（原先只事后弹一次通知） -->
      <div v-if="statuses.length" class="status-chips">
        <span
          v-for="(s, i) in statuses"
          :key="i"
          class="status-chip"
          :class="`tone-${s.tone}`"
          :title="s.label"
        >
          <span class="chip-icon">{{ s.icon }}</span><span class="chip-label">{{ s.label }}</span>
        </span>
      </div>

      <div class="character-lineup-wrapper">
        <CharacterLineup :playerId="playerId" />
      </div>
    </div>

    <!-- Right Side: Hand Display -->
    <div class="hand-display-wrapper">
      <HandDisplay :playerId="playerId" :isOpponent="isOpponent" />
    </div>
  </div>
</template>

<style scoped>
.player-field-layout-horizontal {
  @apply h-full w-full flex p-4 gap-4;
}

.opponent-layout {
  /* ... */
}

/* --- MODIFIED --- */
/* 1. 把这个容器变成一个带边框的视觉单元 */
.character-and-status-container {
  @apply flex flex-col border-2 border-line/50 rounded-lg bg-surface/50 p-2; /* 移动边框/背景到这里，移除 gap，添加内边距 */
  flex: 1 1 30%; /* 左侧占据30% */
}

/* --- MODIFIED --- */
/* 2. 右侧保持不变，它已经是我们想要的样子了 */
.hand-display-wrapper {
  @apply relative border-2 border-line/50 rounded-lg;
  flex: 1 1 70%; /* 右侧占据70% */
}

/* --- MODIFIED --- */
/* 3. 移除内部元素的边框和背景，它们现在只是内容块 */
.player-info-wrapper {
  @apply flex items-center justify-between px-2; /* 移除边框/背景，调整padding */
}

/* --- MODIFIED --- */
/* 4. 移除角色阵容的边框，但保留 flex-grow 来填充剩余空间 */
.character-lineup-wrapper {
  @apply flex-grow mt-2; /* 移除边框和padding，用 margin-top 创造一点间距 */
}

.info-stats {
  @apply flex gap-4 text-base;
}

.status-chips {
  @apply flex flex-wrap gap-1 px-2 mt-1;
}
.status-chip {
  @apply inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border max-w-full;
}
.status-chip .chip-label {
  @apply truncate;
  max-width: 11rem;
}
.tone-buff {
  @apply bg-accent-soft text-accent border-accent/40;
}
.tone-debuff {
  @apply bg-danger/10 text-danger border-danger/40;
}
.tone-neutral {
  @apply bg-surface-2 text-ink-2 border-line;
}
</style>
