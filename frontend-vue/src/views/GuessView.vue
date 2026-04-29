<script setup lang="ts">
import GuessCharacter from '@/components/GuessCharacter.vue';
</script>

<template>
  <div class="guess-view">
    <div class="guess-container">
      <GuessCharacter />
    </div>
  </div>
</template>

<style scoped>
.guess-view {
  min-height: 100vh;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 2rem 1rem;
  box-sizing: border-box;
}

.guess-container {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

/* 响应式：大屏幕居中 */
@media (min-width: 768px) {
  .guess-view {
    align-items: center;
    padding: 3rem 2rem;
  }
}

@media (min-width: 1200px) {
  .guess-view {
    padding: 4rem;
  }
  
  .guess-container {
    max-width: 550px;
  }
}
</style>
