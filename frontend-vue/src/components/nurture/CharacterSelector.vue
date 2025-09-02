<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import type { CharacterCard } from '@/types/card';

const props = defineProps<{
  selectedCharacterId: number | null;
}>();

const emit = defineEmits<{
  select: [characterId: number];
}>();

const userStore = useUserStore();
const gameDataStore = useGameDataStore();
const isModalOpen = ref(false);

// 获取已收集的角色，按稀有度排序
const availableCharacters = computed(() => {
  const rarityOrder: Record<string, number> = {
    'UR': 6, 'HR': 5, 'SSR': 4, 'SR': 3, 'R': 2, 'N': 1
  };

  return Array.from(userStore.characterCollection.entries())
    .map(([id, data]) => {
      const character = gameDataStore.getCharacterCardById(id);
      if (!character) return null;
      
      const nurtureData = userStore.getNurtureData(id);
      return {
        ...character,
        count: data.count,
        nurtureData
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      // 按稀有度排序
      const rarityDiff = (rarityOrder[b!.rarity] || 0) - (rarityOrder[a!.rarity] || 0);
      if (rarityDiff !== 0) return rarityDiff;
      
      // 稀有度相同按好感度排序
      return (b!.nurtureData.affection || 0) - (a!.nurtureData.affection || 0);
    }) as (CharacterCard & { count: number; nurtureData: any })[];
});

// 当前选中的角色信息
const currentCharacter = computed(() => {
  if (!props.selectedCharacterId) return null;
  return availableCharacters.value.find(c => c.id === props.selectedCharacterId) || null;
});

// 获取角色的好感度等级
function getAffectionLevel(affection: number) {
  if (affection >= 1000) return { level: '恋人', color: 'text-pink-400', icon: '💕' };
  if (affection >= 800) return { level: '恋慕', color: 'text-red-400', icon: '❤️' };
  if (affection >= 600) return { level: '信赖', color: 'text-purple-400', icon: '💜' };
  if (affection >= 400) return { level: '友好', color: 'text-blue-400', icon: '💙' };
  if (affection >= 200) return { level: '熟悉', color: 'text-green-400', icon: '💚' };
  if (affection >= 100) return { level: '好感', color: 'text-yellow-400', icon: '💛' };
  return { level: '初识', color: 'text-gray-400', icon: '🤍' };
}

function handleSelect(characterId: number) {
  emit('select', characterId);
  isModalOpen.value = false;
}
</script>

<template>
  <!-- 选择角色按钮 -->
  <button 
    @click="isModalOpen = true"
    class="flex items-center px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors duration-300"
  >
    <div v-if="currentCharacter" class="flex items-center">
      <div class="w-8 h-8 rounded-full overflow-hidden mr-3">
        <img :src="currentCharacter.image_path" :alt="currentCharacter.name" class="w-full h-full object-cover object-top">
      </div>
      <div class="text-left">
        <div class="text-sm font-medium">{{ currentCharacter.name }}</div>
        <div class="text-xs opacity-75">
          {{ getAffectionLevel(currentCharacter.nurtureData.affection || 0).icon }} 
          {{ getAffectionLevel(currentCharacter.nurtureData.affection || 0).level }}
        </div>
      </div>
    </div>
    <div v-else class="flex items-center">
      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
      </svg>
      选择角色
    </div>
  </button>

  <!-- 角色选择模态框 -->
  <div v-if="isModalOpen" class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" @click.self="isModalOpen = false">
    <div class="bg-gray-800 p-6 rounded-lg shadow-xl max-w-4xl w-full border border-gray-700">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold text-white flex items-center">
          <svg class="w-6 h-6 mr-2 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
          </svg>
          选择养成角色
        </h2>
        <button @click="isModalOpen = false" class="text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
      </div>
      
      <div class="max-h-[60vh] overflow-y-auto pr-2">
        <!-- 没有角色时的提示 -->
        <div v-if="availableCharacters.length === 0" class="text-center py-12">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
          <h3 class="text-lg font-medium text-gray-300 mb-2">暂无可养成角色</h3>
          <p class="text-gray-500 text-sm">去抽取一些角色卡吧！</p>
        </div>

        <!-- 角色网格 -->
        <div v-else>
          <div class="mb-4 text-sm text-gray-400">
            {{ availableCharacters.length }} 个角色可进行养成
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div 
              v-for="character in availableCharacters" 
              :key="character.id"
              class="relative group cursor-pointer nurture-card bg-gray-700 rounded-lg p-3 border-2 transition-all duration-300 hover:border-pink-400 hover:bg-gray-600"
              @click="handleSelect(character.id)"
            >
              <!-- 角色头像 -->
              <div class="aspect-[2/3] rounded-md overflow-hidden mb-2">
                <img 
                  :src="character.image_path" 
                  :alt="character.name"
                  class="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                >
              </div>

              <!-- 角色名称 -->
              <h4 class="text-sm font-medium text-white truncate mb-1">{{ character.name }}</h4>

              <!-- 好感度等级 -->
              <div class="flex items-center justify-between text-xs">
                <span :class="getAffectionLevel(character.nurtureData.affection || 0).color">
                  {{ getAffectionLevel(character.nurtureData.affection || 0).icon }}
                </span>
                <span :class="getAffectionLevel(character.nurtureData.affection || 0).color">
                  {{ getAffectionLevel(character.nurtureData.affection || 0).level }}
                </span>
              </div>

              <!-- 稀有度边框效果 -->
              <div 
                class="absolute inset-0 rounded-lg pointer-events-none"
                :class="{
                  'shadow-sm': character.rarity === 'N',
                  'shadow-md shadow-green-500/20': character.rarity === 'R',
                  'shadow-md shadow-blue-500/20': character.rarity === 'SR', 
                  'shadow-lg shadow-yellow-500/30': character.rarity === 'SSR',
                  'shadow-lg shadow-purple-500/30': character.rarity === 'HR',
                  'shadow-xl shadow-red-500/40': character.rarity === 'UR'
                }"
              ></div>

              <!-- 当前选中指示器 -->
              <div 
                v-if="selectedCharacterId === character.id"
                class="absolute -top-2 -right-2 w-6 h-6 bg-pink-400 rounded-full flex items-center justify-center shadow-lg"
              >
                <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nurture-card {
  transition: all 0.3s ease;
}

.nurture-card:hover {
  transform: translateY(-2px);
}
</style>