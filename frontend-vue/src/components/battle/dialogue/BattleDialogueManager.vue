<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { usePlayerStore } from '@/stores/battle';
import { DialogueSystem, type DialogueAction } from '@/core/systems/DialogueSystem';
import BattleSpeechBubble from './BattleSpeechBubble.vue';
import BattleActionEffect from './BattleActionEffect.vue';

const playerStore = usePlayerStore();
const dialogueSystem = DialogueSystem.getInstance();

// 当前对话状态
const currentDialogue = ref<DialogueAction | null>(null);


// 计算角色信息
const getCharacterInfo = (playerId: 'playerA' | 'playerB') => {
  const player = playerId === 'playerA' ? playerStore.playerA : playerStore.playerB;
  return {
    name: player.name,
    avatar: undefined // TODO: 添加头像支持
  };
};

// 对话监听器
const dialogueListener = (action: DialogueAction) => {
  currentDialogue.value = action;
  
  // 延迟清理当前对话
  setTimeout(() => {
    if (currentDialogue.value?.id === action.id) {
      currentDialogue.value = null;
    }
  }, action.duration || 3000);
};

// 计算当前动作效果
const currentActionEffect = computed(() => {
  return currentDialogue.value?.type === 'action' ? currentDialogue.value : null;
});


// 生命周期管理
onMounted(() => {
  dialogueSystem.onDialogue(dialogueListener);
});

onUnmounted(() => {
  dialogueSystem.removeListener(dialogueListener);
});
</script>

<template>
  <div class="battle-dialogue-manager absolute inset-0 pointer-events-none">
    <!-- 玩家对话气泡区域 (底部附近) -->
    <div class="player-dialogue-area absolute bottom-16 left-4 right-4 z-30">
      <div class="flex justify-start">
        <BattleSpeechBubble
          v-if="currentDialogue?.type === 'speech' && currentDialogue.playerId === 'playerA'"
          :action="currentDialogue"
          position="left"
          :character="getCharacterInfo(currentDialogue.playerId)"
          class="current-dialogue player-bubble"
        />
      </div>
    </div>

    <!-- AI对话气泡区域 (顶部附近) -->
    <div class="ai-dialogue-area absolute top-16 left-4 right-4 z-30">
      <div class="flex justify-end">
        <BattleSpeechBubble
          v-if="currentDialogue?.type === 'speech' && currentDialogue.playerId === 'playerB'"
          :action="currentDialogue"
          position="right"
          :character="getCharacterInfo(currentDialogue.playerId)"
          class="current-dialogue ai-bubble"
        />
      </div>
    </div>

    <!-- 动作效果覆盖层 -->
    <BattleActionEffect 
      :action="currentActionEffect"
      class="z-50"
    />

  </div>
</template>

<style scoped>
.battle-dialogue-manager {
  z-index: 20;
}

/* 玩家对话区域 - 靠近底部的主辩手 */
.player-dialogue-area {
  max-height: 200px;
  overflow: visible;
}

/* AI对话区域 - 靠近顶部的主辩手 */
.ai-dialogue-area {
  max-height: 200px;
  overflow: visible;
}

.current-dialogue {
  position: relative;
  z-index: 10;
  pointer-events: auto;
}

/* 增强玩家气泡样式 */
.player-bubble {
  @apply drop-shadow-2xl;
  animation: bubble-entrance 0.4s ease-out;
}

/* 增强AI气泡样式 */
.ai-bubble {
  @apply drop-shadow-2xl;
  animation: bubble-entrance 0.4s ease-out;
}


/* 气泡入场动画 */
@keyframes bubble-entrance {
  0% {
    opacity: 0;
    transform: scale(0.6) translateY(20px);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05) translateY(-5px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* 响应式调整 */
@media (max-width: 768px) {
  .player-dialogue-area {
    bottom: 12px;
    left: 1rem;
    right: 1rem;
    max-height: 150px;
  }
  
  .ai-dialogue-area {
    top: 12px;
    left: 1rem;
    right: 1rem;
    max-height: 150px;
  }
  
}

@media (max-width: 480px) {
  .player-dialogue-area {
    bottom: 8px;
    left: 0.5rem;
    right: 0.5rem;
    max-height: 120px;
  }
  
  .ai-dialogue-area {
    top: 8px;
    left: 0.5rem;
    right: 0.5rem;
    max-height: 120px;
  }
  
}
</style>