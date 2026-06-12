<script setup lang="ts">
import { useRouter } from 'vue-router';
import SettingsModal from './SettingsModal.vue';

const router = useRouter();

// 设置以整页形式呈现，✕ 关闭 = 返回主页（S6 接通）
function handleClose() {
  router.push('/');
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
