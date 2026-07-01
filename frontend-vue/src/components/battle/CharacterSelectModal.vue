<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { assetUrl } from '@/utils/assetUrl';
import VirtualGrid from '@/components/VirtualGrid.vue';
import type { CharacterCard, Rarity } from '@/types/card';

const props = defineProps<{
  isOpen: boolean;
  position: number; // 0-based，选择的位置
  currentCharacterId?: number; // 当前位置已选中的角色ID
  usedCharacterIds?: number[]; // 已被其他位置使用的角色ID列表
  allowedRarities?: readonly Rarity[]; // 为空时允许全部稀有度；挑战塔传 HR/UR
  isCharacterSelectable?: (character: CharacterCard) => boolean;
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

      if (props.allowedRarities?.length && !props.allowedRarities.includes(character.rarity)) {
        return false;
      }

      if (props.isCharacterSelectable && !props.isCharacterSelectable(character)) {
        return false;
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
  if (props.isCharacterSelectable && !props.isCharacterSelectable(character)) {
    return;
  }

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
  <!-- S9：Teleport 到 body——页面内 transform 祖先会劫持 fixed 定位，弹窗被压缩 -->
  <Teleport to="body">
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    @click="handleBackdropClick"
  >
    <div class="bg-elevated rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden border border-line">

      <!-- 头部 -->
      <div class="p-6 border-b border-line">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-bold text-ink">
            选择位置 {{ position + 1 }} 的角色
          </h2>
          <button
            @click="closeModal"
            class="w-8 h-8 bg-surface-2 rounded-full flex items-center justify-center text-ink-2 hover:text-ink transition-colors"
          >
            ✕
          </button>
        </div>
        
        <!-- 搜索框 -->
        <div class="relative">
          <input
            v-model="searchKeyword"
            placeholder="搜索角色名称..."
            class="w-full px-4 py-2 bg-surface-2 text-ink rounded-lg border border-line focus:border-accent focus:outline-none"
          >
          <div class="absolute right-3 top-2 text-ink-2">🔍</div>
        </div>

        <!-- 当前选中的角色 -->
        <div v-if="currentCharacterId" class="mt-4 p-4 bg-accent-soft rounded-lg border border-accent">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 rounded-full overflow-hidden">
                <img loading="lazy" decoding="async" 
                  :src="gameDataStore.getCharacterCardById(currentCharacterId)?.image_path"
                  :alt="gameDataStore.getCharacterCardById(currentCharacterId)?.name"
                  class="w-full h-full object-cover object-top"
                  @error="($event.target as HTMLImageElement).src = assetUrl('/data/images/character/77.jpg')"
                >
              </div>
              <div>
                <div class="text-ink font-medium">
                  当前：{{ gameDataStore.getCharacterCardById(currentCharacterId)?.name }}
                </div>
                <div class="text-accent text-sm">位置 {{ position + 1 }}</div>
              </div>
            </div>
            <button
              @click="removeCharacter"
              class="btn-danger"
            >
              移除
            </button>
          </div>
        </div>
      </div>
      
      <!-- 角色列表 -->
      <div class="p-6 overflow-y-auto max-h-96">
        <div v-if="availableCharacters.length === 0" class="text-center py-8">
          <div class="text-ink-2 mb-4">
            {{ searchKeyword ? '未找到匹配的角色' : (allowedRarities?.length ? '你还没有可加入挑战塔的 HR/UR 角色' : '你还没有收藏任何角色') }}
          </div>
          <router-link
            v-if="!searchKeyword"
            to="/gacha"
            class="text-accent hover:text-accent-strong"
            @click="closeModal"
          >
            去抽卡获得角色 →
          </router-link>
        </div>
        
        <!-- S9：虚拟化（角色池可达 665 项；列表区本就固定高度，无条件虚拟化） -->
        <VirtualGrid
          v-else
          :items="availableCharacters"
          :item-height="252"
          :container-height="384"
          :min-item-width="150"
          :gap="16"
          @item-click="selectCharacter($event as typeof availableCharacters[number])"
        >
          <template #default="{ item }">
          <div
            :key="(item as typeof availableCharacters[number]).id"
            class="relative h-full bg-surface-2 rounded-lg border-2 overflow-hidden transition-all"
            :class="{
              'border-success bg-success/20': (item as typeof availableCharacters[number]).id === currentCharacterId,
              'border-line hover:border-accent': (item as typeof availableCharacters[number]).id !== currentCharacterId && (!usedCharacterIds || !usedCharacterIds.includes((item as typeof availableCharacters[number]).id)),
              'border-danger bg-danger/20 opacity-60 cursor-not-allowed': usedCharacterIds && usedCharacterIds.includes((item as typeof availableCharacters[number]).id) && (item as typeof availableCharacters[number]).id !== currentCharacterId
            }"
          >
            <template v-for="character in [item as typeof availableCharacters[number]]" :key="character.id">
            <div class="h-full relative">
              <!-- 角色图片 -->
              <img loading="lazy" decoding="async" 
                :src="character.image_path"
                :alt="character.name"
                class="w-full h-full object-cover object-top"
                @error="($event.target as HTMLImageElement).src = assetUrl('/data/images/character/77.jpg')"
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
                class="absolute top-2 right-2 w-8 h-8 bg-accent rounded-full flex items-center justify-center shadow-lg"
              >
                <span class="text-on-accent font-bold">✓</span>
              </div>

              <!-- 拥有数量 -->
              <div
                v-if="character.count > 1"
                class="absolute top-2 left-2 px-2 py-1 bg-accent rounded-full text-xs text-on-accent font-bold"
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
            </template>
          </div>
          </template>
        </VirtualGrid>
      </div>

    </div>
  </div>
  </Teleport>
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

.bg-elevated {
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
