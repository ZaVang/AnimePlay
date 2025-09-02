<script setup lang="ts">
import PlayerStatus from '@/components/PlayerStatus.vue';
import ActivityLog from '@/components/ActivityLog.vue';
import CollectionPreview from '@/components/CollectionPreview.vue';
import WatchQueue from '@/components/WatchQueue.vue';
import ViewingStats from '@/components/ViewingStats.vue';
</script>

<template>
  <div class="space-y-8">
    
    <!-- Player Status Section -->
    <PlayerStatus />

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
