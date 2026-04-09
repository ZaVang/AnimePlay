<script setup lang="ts">
import PlayerStatus from '@/components/PlayerStatus.vue';
import ActivityLog from '@/components/ActivityLog.vue';
import CollectionPreview from '@/components/CollectionPreview.vue';
import WatchQueue from '@/components/WatchQueue.vue';
import ViewingStats from '@/components/ViewingStats.vue';
</script>

<template>
  <div class="space-y-6 max-w-[1600px] mx-auto">
    <!-- Top Bar / Player Status Section -->
    <div class="grid grid-cols-1 gap-6">
      <PlayerStatus />
    </div>

    <!-- Active Feed / Watch Queue (Centerpiece) -->
    <div class="grid grid-cols-1 gap-6">
      <WatchQueue />
    </div>

    <!-- Bottom Functional Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Left: Activity Log (Wide) -->
      <div class="lg:col-span-4 flex flex-col h-[500px]">
        <ActivityLog class="flex-1" />
      </div>

      <!-- Center: Collection Preview (Wider) -->
      <div class="lg:col-span-5 flex flex-col h-[500px]">
        <CollectionPreview class="flex-1" />
      </div>

      <!-- Right: Viewing Stats (Compact) -->
      <div class="lg:col-span-3 flex flex-col h-[500px]">
        <ViewingStats class="flex-1" />
      </div>
    </div>

    <!-- Terminal Footer Decoration -->
    <div class="pt-4 border-t border-industrial-800 flex justify-between items-center font-mono text-[9px] text-industrial-600 uppercase tracking-[0.3em]">
      <span>Terminal_ID: {{ Math.random().toString(36).substring(2, 10).toUpperCase() }}</span>
      <span>Auth_Node: TOKYO_SERVER_03</span>
      <span class="animate-pulse">Waiting_For_Input...</span>
    </div>
  </div>
</template>
