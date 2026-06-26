<script setup lang="ts">
import PlayerStatus from '@/components/PlayerStatus.vue';
import DailyTasksPanel from '@/components/DailyTasksPanel.vue';
import ActivityLog from '@/components/ActivityLog.vue';
import CollectionPreview from '@/components/CollectionPreview.vue';
import WatchQueue from '@/components/WatchQueue.vue';
import ViewingStats from '@/components/ViewingStats.vue';
import TasteIdentityChip from '@/components/TasteIdentityChip.vue';
import WatchingPins from '@/components/WatchingPins.vue';
</script>

<template>
  <div class="space-y-8">
    
    <!-- Player Status Section -->
    <PlayerStatus />

    <!-- Daily Tasks (留存引擎：每日任务面板) -->
    <DailyTasksPanel />

    <!-- 番剧品味身份（I2-T4：人格/题材显形到主页，点击进品味画像页） -->
    <TasteIdentityChip />

    <!-- 正在追（I4-T3：设备级自设目标列表 + 看完按钮；空列表自隐藏） -->
    <WatchingPins />

    <!-- Watch Queue (独占一行) -->
    <WatchQueue />

    <!-- Bottom Grid: Activity Log, Collection Preview & Viewing Stats -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <!-- Left: Activity Log -->
      <div class="flex flex-col">
        <ActivityLog class="flex-1" />
      </div>

      <!-- Center: Collection Preview -->
      <div class="flex flex-col">
        <CollectionPreview class="flex-1" />
      </div>

      <!-- Right: Viewing Stats -->
      <div class="flex flex-col">
        <ViewingStats class="flex-1" />
      </div>

    </div>

  </div>
</template>
