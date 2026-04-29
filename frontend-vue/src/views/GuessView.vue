<script setup lang="ts">
import GuessCharacter from '@/components/GuessCharacter.vue';
import { useGameDataStore } from '@/stores/gameDataStore';
import { onMounted } from 'vue';

const gameDataStore = useGameDataStore();

onMounted(() => {
  // 确保游戏数据已加载
  if (gameDataStore.allCharacterCards.length === 0) {
    gameDataStore.fetchGameData();
  }
});
</script>

<template>
  <div class="guess-view">
    <div class="mb-6">
      <h1 class="text-2xl font-bold" :style="{ color: 'var(--theme-text-primary)' }">
        🎭 猜角色
      </h1>
      <p class="text-sm mt-1" :style="{ color: 'var(--theme-text-secondary)' }">
        根据越来越清晰的像素图片，猜出这是哪个动漫角色！
      </p>
    </div>
    
    <!-- 数据加载提示 -->
    <div
      v-if="gameDataStore.isLoading"
      class="text-center py-12"
    >
      <div
        class="animate-spin w-12 h-12 border-3 rounded-full mx-auto mb-4"
        :style="{ borderColor: 'var(--theme-border)', borderTopColor: 'var(--theme-accent)' }"
      ></div>
      <p :style="{ color: 'var(--theme-text-secondary)' }">正在加载角色数据...</p>
    </div>
    
    <!-- 错误提示 -->
    <div
      v-else-if="gameDataStore.error"
      class="text-center py-12"
    >
      <div class="text-4xl mb-4">😢</div>
      <p :style="{ color: 'var(--theme-danger)' }">{{ gameDataStore.error }}</p>
      <button
        @click="gameDataStore.fetchGameData()"
        class="btn-accent mt-4 font-bold py-2 px-4 rounded-lg"
      >
        重试
      </button>
    </div>
    
    <!-- 游戏组件 -->
    <GuessCharacter v-else />
  </div>
</template>

<style scoped>
.guess-view {
  max-width: 800px;
}

.btn-accent {
  background-color: var(--theme-accent);
  color: white;
}

.btn-accent:hover {
  background-color: var(--theme-accent-hover);
}
</style>
