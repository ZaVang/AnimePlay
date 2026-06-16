<script setup lang="ts">
import { computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useAchievementsStore } from '@/stores/achievements';
import { useProfileStore } from '@/stores/profile';
import { ACHIEVEMENTS } from '@/config/achievements';

const userStore = useUserStore();
const achievements = useAchievementsStore();
const profile = useProfileStore();

const rows = computed(() =>
  ACHIEVEMENTS.map(a => ({
    id: a.id,
    title: a.title,
    description: a.description,
    badge: a.badge,
    rewardText: `${a.reward.amount} ${profile.currencyName(a.reward.currency)}`,
    unlocked: achievements.isUnlocked(a.id),
  })),
);

const unlockedCount = computed(() => rows.value.filter(r => r.unlocked).length);
</script>

<template>
  <div>
    <div v-if="!userStore.isLoggedIn" class="text-center py-12">
      <p class="text-ink-2 text-lg font-medium">请先登录以查看成就墙。</p>
    </div>

    <div v-else>
      <div class="flex items-center justify-between mb-4">
        <h4 class="font-bold text-ink text-lg">成就墙</h4>
        <span class="text-sm text-ink-2">已解锁 {{ unlockedCount }} / {{ rows.length }}</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="a in rows"
          :key="a.id"
          class="bg-surface rounded-lg p-4 border border-line flex items-start gap-3"
          :class="{ 'opacity-50 grayscale': !a.unlocked }"
        >
          <div class="text-3xl shrink-0">{{ a.unlocked ? a.badge : '🔒' }}</div>
          <div class="min-w-0">
            <p class="font-bold text-ink truncate">{{ a.title }}</p>
            <p class="text-sm text-ink-2">{{ a.description }}</p>
            <p class="text-xs text-accent mt-1">奖励：{{ a.rewardText }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
