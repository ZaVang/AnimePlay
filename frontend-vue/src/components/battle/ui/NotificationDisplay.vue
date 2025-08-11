<script setup lang="ts">
import { useGameStore } from '@/stores/battle';

const gameStore = useGameStore();
</script>

<template>
  <div class="notification-container">
    <transition-group name="list">
      <div
        v-for="notification in gameStore.notifications"
        :key="notification.id"
        class="notification-item"
        :class="{ 'is-warning': notification.type === 'warning' }"
      >
        {{ notification.message }}
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.notification-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.notification-item {
  @apply bg-blue-500 text-white font-bold py-2 px-6 rounded-full shadow-lg;
}
.notification-item.is-warning {
  @apply bg-red-500;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}
</style>
