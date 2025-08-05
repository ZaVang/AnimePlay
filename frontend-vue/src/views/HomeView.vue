<script setup lang="ts">
import PlayerStatus from '@/components/PlayerStatus.vue';
import ActivityLog from '@/components/ActivityLog.vue';
import CollectionPreview from '@/components/CollectionPreview.vue';
import WatchQueue from '@/components/WatchQueue.vue';
</script>

<template>
  <div class="space-y-8">
    
    <!-- Player Status Section -->
    <PlayerStatus />

    <!-- Watch Queue (独占一行) -->
    <WatchQueue />

    <!-- Bottom Row: Activity Log & Collection Preview (1:1比例) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      <!-- Left: Activity Log -->
      <div class="flex flex-col">
        <ActivityLog class="flex-1" />
      </div>

      <!-- Right: Collection Preview -->
      <div class="flex flex-col">
        <CollectionPreview class="flex-1" />
      </div>

    </div>

  </div>
</template>
