<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import VirtualGrid from '@/components/VirtualGrid.vue';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/types/nurture';
import { bondTier } from '@/config/nurtureColors';

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
    }) as (CharacterCard & { count: number; nurtureData: CharacterNurtureData })[];
});

// 当前选中的角色信息
const currentCharacter = computed(() => {
  if (!props.selectedCharacterId) return null;
  return availableCharacters.value.find(c => c.id === props.selectedCharacterId) || null;
});

// 获取角色的羁绊等级（共享语义色映射，随皮肤切换；与 CharacterProfile 同一份 bondTier）
function getBondLevel(affection: number) {
  const tier = bondTier(affection);
  return { level: tier.level, color: tier.color, icon: tier.icon };
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
    class="flex items-center px-4 py-2 bg-accent hover:bg-accent-strong text-on-accent rounded-lg transition-colors duration-300"
  >
    <div v-if="currentCharacter" class="flex items-center">
      <div class="w-8 h-8 rounded-full overflow-hidden mr-3">
        <img loading="lazy" decoding="async" :src="currentCharacter.image_path" :alt="currentCharacter.name" class="w-full h-full object-cover object-top">
      </div>
      <div class="text-left">
        <div class="text-sm font-medium">{{ currentCharacter.name }}</div>
        <div class="text-xs opacity-75 space-x-2">
          <span>Lv.{{ currentCharacter.nurtureData.level }}</span>
          <span>{{ getBondLevel(currentCharacter.nurtureData.affection || 0).icon }}</span>
          <span>{{ getBondLevel(currentCharacter.nurtureData.affection || 0).level }}</span>
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

  <!-- 角色选择模态框（S9：Teleport 到 body——页面内有 transform 祖先时 fixed 定位会被劫持成局部坐标系，弹窗被压缩） -->
  <Teleport to="body">
  <div v-if="isModalOpen" class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" @click.self="isModalOpen = false">
    <div class="bg-elevated p-6 rounded-lg shadow-xl max-w-4xl w-full border border-line-2">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold text-ink flex items-center">
          <svg class="w-6 h-6 mr-2 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
          </svg>
          选择养成角色
        </h2>
        <button @click="isModalOpen = false" class="text-ink-2 hover:text-ink text-2xl font-bold">&times;</button>
      </div>
      
      <div class="max-h-[60vh] overflow-y-auto pr-2">
        <!-- 没有角色时的提示 -->
        <div v-if="availableCharacters.length === 0" class="text-center py-12">
          <svg class="w-16 h-16 mx-auto mb-4 text-ink-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
          <h3 class="text-lg font-medium text-ink-2 mb-2">暂无可养成角色</h3>
          <p class="text-ink-2 text-sm">去抽取一些角色卡吧！</p>
        </div>

        <!-- 角色网格 -->
        <div v-else>
          <div class="mb-4 text-sm text-ink-2">
            {{ availableCharacters.length }} 个角色可进行养成
          </div>
          <!-- S9：虚拟化（养成角色池可达 665 项） -->
          <VirtualGrid
            :items="availableCharacters"
            :item-height="330"
            :container-height="500"
            :min-item-width="150"
            :gap="16"
            @item-click="handleSelect(($event as typeof availableCharacters[number]).id)"
          >
            <template #default="{ item }">
            <template v-for="character in [item as typeof availableCharacters[number]]" :key="character.id">
            <div
              class="relative group h-full nurture-card bg-surface-2 rounded-lg p-3 border-2 transition-all duration-300 hover:border-accent hover:bg-surface-2"
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
              <h4 class="text-sm font-medium text-ink truncate mb-1">{{ character.name }}</h4>

              <!-- 等级和羁绊等级 -->
              <div class="space-y-1">
                <div class="text-xs text-highlight font-bold">
                  Lv.{{ character.nurtureData.level }}
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span :class="getBondLevel(character.nurtureData.affection || 0).color">
                    {{ getBondLevel(character.nurtureData.affection || 0).icon }}
                  </span>
                  <span :class="getBondLevel(character.nurtureData.affection || 0).color">
                    {{ getBondLevel(character.nurtureData.affection || 0).level }}
                  </span>
                </div>
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
                class="absolute -top-2 -right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center shadow-lg"
              >
                <svg class="w-4 h-4 text-on-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
            </template>
            </template>
          </VirtualGrid>
        </div>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<style scoped>
.nurture-card {
  transition: all 0.3s ease;
}

.nurture-card:hover {
  transform: translateY(-2px);
}
</style>
