<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import type { CharacterCard } from '@/types/card';

const props = defineProps<{
  isOpen: boolean;
  position: number; // 0-3，选择的位置
  currentCharacterId?: number; // 当前位置已选中的角色ID
  usedCharacterIds?: number[]; // 已被其他位置使用的角色ID列表
}>();

const emit = defineEmits<{
  close: [];
  select: [characterId: number, position: number];
  remove: [position: number];
}>();

const userStore = useUserStore();
const gameDataStore = useGameDataStore();

// 搜索关键词
const searchKeyword = ref('');

// 获取可选择的角色
const availableCharacters = computed(() => {
  if (!userStore.isLoggedIn) return [];
  
  return Array.from(userStore.characterCollection.entries())
    .map(([id, data]) => ({
      id,
      count: data.count,
      character: gameDataStore.getCharacterCardById(id)
    }))
    .filter(item => item.character && item.count > 0)
    .map(item => ({
      ...item.character!,
      count: item.count
    }))
    .filter(character => {
      // 搜索过滤
      if (searchKeyword.value) {
        const matchesSearch = character.name.toLowerCase().includes(searchKeyword.value.toLowerCase());
        if (!matchesSearch) return false;
      }
      
      // 过滤已被其他位置使用的角色（但保留当前位置的角色）
      if (props.usedCharacterIds && props.usedCharacterIds.length > 0) {
        return !props.usedCharacterIds.includes(character.id) || character.id === props.currentCharacterId;
      }
      
      return true;
    })
    .sort((a, b) => {
      // 按稀有度排序：UR > HR > SSR > SR > R > N
      const rarityOrder = { 'UR': 6, 'HR': 5, 'SSR': 4, 'SR': 3, 'R': 2, 'N': 1 };
      return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
    });
});

// 选择角色
function selectCharacter(character: CharacterCard) {
  // 检查是否是已被其他位置使用的角色
  if (props.usedCharacterIds && 
      props.usedCharacterIds.includes(character.id) && 
      character.id !== props.currentCharacterId) {
    return; // 阻止选择已被使用的角色
  }
  
  emit('select', character.id, props.position);
  closeModal();
}

// 移除当前位置的角色
function removeCharacter() {
  emit('remove', props.position);
  closeModal();
}

// 关闭弹窗
function closeModal() {
  searchKeyword.value = '';
  emit('close');
}

// 点击背景关闭
function handleBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    closeModal();
  }
}
</script>

<template>
  <div 
    v-if="isOpen"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    @click="handleBackdropClick"
  >
    <div class="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
      
      <!-- 头部 -->
      <div class="p-6 border-b border-gray-700">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-bold text-white">
            选择位置 {{ position + 1 }} 的角色
          </h2>
          <button 
            @click="closeModal"
            class="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        
        <!-- 搜索框 -->
        <div class="relative">
          <input
            v-model="searchKeyword"
            placeholder="搜索角色名称..."
            class="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
          <div class="absolute right-3 top-2 text-gray-400">🔍</div>
        </div>
        
        <!-- 当前选中的角色 -->
        <div v-if="currentCharacterId" class="mt-4 p-4 bg-blue-900/20 rounded-lg border border-blue-500">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 rounded-full overflow-hidden">
                <img 
                  :src="gameDataStore.getCharacterCardById(currentCharacterId)?.image_path"
                  :alt="gameDataStore.getCharacterCardById(currentCharacterId)?.name"
                  class="w-full h-full object-cover object-top"
                  @error="($event.target as HTMLImageElement).src = '/data/images/character/77.jpg'"
                >
              </div>
              <div>
                <div class="text-white font-medium">
                  当前：{{ gameDataStore.getCharacterCardById(currentCharacterId)?.name }}
                </div>
                <div class="text-blue-400 text-sm">位置 {{ position + 1 }}</div>
              </div>
            </div>
            <button 
              @click="removeCharacter"
              class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              移除
            </button>
          </div>
        </div>
      </div>
      
      <!-- 角色列表 -->
      <div class="p-6 overflow-y-auto max-h-96">
        <div v-if="availableCharacters.length === 0" class="text-center py-8">
          <div class="text-gray-400 mb-4">
            {{ searchKeyword ? '未找到匹配的角色' : '你还没有收藏任何角色' }}
          </div>
          <router-link 
            v-if="!searchKeyword"
            to="/gacha" 
            class="text-blue-400 hover:text-blue-300"
            @click="closeModal"
          >
            去抽卡获得角色 →
          </router-link>
        </div>
        
        <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div 
            v-for="character in availableCharacters"
            :key="character.id"
            @click="selectCharacter(character)"
            class="relative cursor-pointer bg-gray-700 rounded-lg border-2 overflow-hidden transition-all transform hover:scale-105"
            :class="{
              'border-green-500 bg-green-900/20': character.id === currentCharacterId,
              'border-gray-600 hover:border-blue-500': character.id !== currentCharacterId && (!usedCharacterIds || !usedCharacterIds.includes(character.id)),
              'border-red-500 bg-red-900/20 opacity-60 cursor-not-allowed': usedCharacterIds && usedCharacterIds.includes(character.id) && character.id !== currentCharacterId
            }"
          >
            <div class="aspect-[2/3] relative">
              <!-- 角色图片 -->
              <img 
                :src="character.image_path"
                :alt="character.name"
                class="w-full h-full object-cover object-top"
                @error="($event.target as HTMLImageElement).src = '/data/images/character/77.jpg'"
              >
              
              <!-- 稀有度背景 -->
              <div 
                class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"
                :class="{
                  'from-red-900/60': character.rarity === 'UR',
                  'from-purple-900/60': character.rarity === 'HR', 
                  'from-yellow-900/60': character.rarity === 'SSR',
                  'from-blue-900/60': character.rarity === 'SR',
                  'from-green-900/60': character.rarity === 'R'
                }"
              ></div>
              
              <!-- 当前选中标记 -->
              <div 
                v-if="character.id === currentCharacterId"
                class="absolute top-2 right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <span class="text-white font-bold">✓</span>
              </div>
              
              <!-- 拥有数量 -->
              <div 
                v-if="character.count > 1"
                class="absolute top-2 left-2 px-2 py-1 bg-blue-500 rounded-full text-xs text-white font-bold"
              >
                ×{{ character.count }}
              </div>
              
              <!-- 角色信息 -->
              <div class="absolute bottom-0 left-0 right-0 p-3">
                <div class="text-xs text-white font-medium text-center mb-1">
                  {{ character.name }}
                </div>
                <div class="text-center">
                  <span 
                    class="px-2 py-1 rounded text-xs font-bold"
                    :class="{
                      'bg-red-500 text-white': character.rarity === 'UR',
                      'bg-purple-500 text-white': character.rarity === 'HR',
                      'bg-yellow-500 text-black': character.rarity === 'SSR',
                      'bg-blue-500 text-white': character.rarity === 'SR',
                      'bg-green-500 text-white': character.rarity === 'R',
                      'bg-gray-500 text-white': character.rarity === 'N'
                    }"
                  >
                    {{ character.rarity }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  </div>
</template>

<style scoped>
/* 弹窗动画 */
.fixed {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.bg-gray-800 {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>