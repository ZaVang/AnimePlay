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

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <!-- Left Column: Watch Queue and Logs -->
      <div class="lg:col-span-2 space-y-8 flex flex-col">
        <!-- Watch Queue -->
        <WatchQueue />

        <!-- Activity Log -->
        <ActivityLog class="flex-1" />
      </div>

      <!-- Right Column: Collection Preview -->
      <div class="lg:col-span-1 space-y-8 flex flex-col">
        <CollectionPreview class="flex-1" />
      </div>

    </div>

  </div>
</template>
