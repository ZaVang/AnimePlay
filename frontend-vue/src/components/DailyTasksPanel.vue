<script setup lang="ts">
import { computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useDailyStore } from '@/stores/daily';
import { useProfileStore } from '@/stores/profile';
import { DAILY_TASKS } from '@/config/dailyTasks';

const userStore = useUserStore();
const dailyStore = useDailyStore();
const profile = useProfileStore();

interface TaskView {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  complete: boolean;
  claimed: boolean;
  rewardText: string;
}

const tasks = computed<TaskView[]>(() =>
  DAILY_TASKS.map(task => ({
    id: task.id,
    title: task.title,
    description: task.description,
    current: dailyStore.progressOf(task.id),
    target: task.target,
    complete: dailyStore.isComplete(task.id),
    claimed: dailyStore.isClaimed(task.id),
    rewardText: task.rewards.map(r => `${r.amount} ${profile.currencyName(r.currency)}`).join(' + '),
  })),
);

const completedCount = computed(() => tasks.value.filter(t => t.claimed).length);

function claim(taskId: string) {
  userStore.claimDailyTask(taskId);
}
</script>

<template>
  <div class="bg-surface p-6 rounded-lg shadow-lg border border-line">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-2xl font-bold text-ink">今日任务</h2>
      <span v-if="userStore.isLoggedIn" class="text-sm text-ink-2">
        已完成 {{ completedCount }} / {{ tasks.length }}
      </span>
    </div>

    <div v-if="userStore.isLoggedIn" class="space-y-3">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="bg-surface-2 rounded-lg p-4 flex items-center gap-4"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <p class="font-bold text-ink truncate">{{ task.title }}</p>
            <span class="text-xs text-accent shrink-0">奖励：{{ task.rewardText }}</span>
          </div>
          <p class="text-sm text-ink-2 mt-0.5">{{ task.description }}</p>
          <!-- Progress bar -->
          <div class="mt-2 w-full bg-surface rounded-full h-2 border border-line overflow-hidden">
            <div
              class="bg-accent h-full rounded-full transition-all duration-500"
              :style="{ width: Math.min(100, (task.current / task.target) * 100) + '%' }"
            ></div>
          </div>
          <p class="text-xs text-ink-2 mt-1">{{ Math.min(task.current, task.target) }} / {{ task.target }}</p>
        </div>

        <div class="shrink-0">
          <span v-if="task.claimed" class="text-sm font-bold text-ink-2">已领取</span>
          <button
            v-else
            class="btn-primary text-sm px-4 py-2"
            :disabled="!task.complete"
            :class="{ 'opacity-45 cursor-not-allowed': !task.complete }"
            @click="claim(task.id)"
          >
            {{ task.complete ? '领取' : '进行中' }}
          </button>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-ink-2">请先登录以查看今日任务。</p>
    </div>
  </div>
</template>
