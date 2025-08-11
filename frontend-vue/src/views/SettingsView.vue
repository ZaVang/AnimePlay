<script setup lang="ts">
import SettingsModal from './SettingsModal.vue';

function handleClose() {
  // 在这个视图中，关闭按钮可能不需要做任何事情，
  // 因为它不是一个真正的“弹窗”，而是一个页面。
  // 或者，你可以让它导航回主页
  // import { useRouter } from 'vue-router';
  // const router = useRouter();
  // router.push('/');
  console.log('Settings modal close requested');
}
</script>

<template>
  <div class="settings-view-container">
    <SettingsModal @close="handleClose" />
  </div>
</template>

<style scoped>
.settings-view-container {
  @apply flex items-center justify-center;
}
</style>
