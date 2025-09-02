<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import CharacterSelector from '@/components/nurture/CharacterSelector.vue';
import CharacterProfile from '@/components/nurture/CharacterProfile.vue';
import InteractionPanel from '@/components/nurture/InteractionPanel.vue';
import NurtureActions from '@/components/nurture/NurtureActions.vue';
import DialogueSystem from '@/components/nurture/DialogueSystem.vue';

const userStore = useUserStore();
const gameDataStore = useGameDataStore();

// 当前选中的角色
const selectedCharacterId = ref<number | null>(null);

// 计算当前选中角色的详细信息
const selectedCharacter = computed(() => {
  if (!selectedCharacterId.value) return null;
  const character = gameDataStore.getCharacterCardById(selectedCharacterId.value);
  if (!character) return null;
  
  const nurtureData = userStore.getNurtureData(selectedCharacterId.value);
  return {
    ...character,
    nurtureData
  };
});

// 对话系统状态
const dialogueActive = ref(false);

// 切换角色选择
function selectCharacter(characterId: number) {
  selectedCharacterId.value = characterId;
}

// 开始对话
function startDialogue() {
  if (selectedCharacter.value) {
    dialogueActive.value = true;
  }
}

// 结束对话
function endDialogue() {
  dialogueActive.value = false;
}

// TODO: 实现更多交互功能
// - 送礼物系统
// - 约会系统  
// - 特殊事件触发
// - 角色故事解锁
</script>

<template>
  <div class="min-h-screen bg-gray-900 py-8">
    <div class="container mx-auto px-4">
      
      <!-- 页面标题 -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-white mb-2">角色养成</h1>
        <p class="text-gray-400">与你的角色们建立更深的羁绊</p>
      </div>

      <!-- 未登录状态 -->
      <div v-if="!userStore.isLoggedIn" class="text-center py-20">
        <svg class="w-24 h-24 mx-auto mb-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
        <h2 class="text-2xl font-bold text-gray-300 mb-4">请先登录</h2>
        <p class="text-gray-500">登录后即可开始与角色们的养成之旅</p>
      </div>

      <!-- 主要内容区域 -->
      <div v-else class="space-y-8">
        
        <!-- 角色选择面板 -->
        <div class="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-white flex items-center">
              <svg class="w-6 h-6 mr-2 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
              </svg>
              <span v-if="!selectedCharacter">选择养成角色</span>
              <span v-else>{{ selectedCharacter.name }} 的养成空间</span>
            </h2>
            
            <!-- 选择/切换角色按钮 -->
            <CharacterSelector 
              :selected-character-id="selectedCharacterId"
              @select="selectCharacter"
            />
          </div>

          <!-- 角色未选择状态 -->
          <div v-if="!selectedCharacter" class="text-center py-16">
            <svg class="w-20 h-20 mx-auto mb-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
            <h3 class="text-xl font-bold text-gray-300 mb-2">选择一个角色开始养成</h3>
            <p class="text-gray-500">点击右上角的按钮选择你想要互动的角色</p>
          </div>
        </div>

        <!-- 角色已选择状态 -->
        <div v-if="selectedCharacter" class="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          <!-- 左侧：角色资料 -->
          <div class="xl:col-span-1">
            <CharacterProfile :character="selectedCharacter" />
          </div>

          <!-- 中间：交互面板 -->
          <div class="xl:col-span-1">
            <InteractionPanel 
              :character="selectedCharacter"
              @start-dialogue="startDialogue"
            />
          </div>

          <!-- 右侧：养成行动 -->
          <div class="xl:col-span-1">
            <NurtureActions :character="selectedCharacter" />
          </div>

        </div>

      </div>

    </div>

    <!-- 对话系统模态框 -->
    <DialogueSystem 
      v-if="dialogueActive && selectedCharacter"
      :character="selectedCharacter"
      @close="endDialogue"
    />

  </div>
</template>

<style scoped>
/* 可以添加一些特殊的动画效果 */
.nurture-card {
  transition: all 0.3s ease;
}

.nurture-card:hover {
  transform: translateY(-4px);
}
</style>