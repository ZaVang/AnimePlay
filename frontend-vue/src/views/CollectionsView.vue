<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/modules/authStore';
import { useCollectionStore } from '@/stores/modules/collectionStore';
import { useEconomyStore } from '@/stores/modules/economyStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import type { AnimeCard as AnimeCardType, CharacterCard as CharacterCardType, Rarity } from '@/types/card';
import CardDetailModal from '@/components/CardDetailModal.vue';
import DeckManager from '@/components/decks/DeckManager.vue';
import AnimeCard from '@/components/AnimeCard.vue';
import CharacterCard from '@/components/CharacterCard.vue';
import VirtualGrid from '@/components/VirtualGrid.vue';
import { useDeckEditor } from '@/composables/useDeckEditor';
import '@/utils/performanceMonitor'; // 启动性能监控

const authStore = useAuthStore();
const collectionStore = useCollectionStore();
const economyStore = useEconomyStore();
const gameDataStore = useGameDataStore();

// --- STATE for UI ---
const activeTab = ref<'anime' | 'character' | 'decks'>('anime');
const selectedCard = ref<AnimeCardType | CharacterCardType | null>(null);
const selectedCardType = ref<'anime' | 'character'>('anime');
const rarityOrder: Rarity[] = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];

// Deck Editor Integration
const { isEditing, addToDeck, currentDeckName } = useDeckEditor();

// Filters
const animeFilters = ref({ name: '', rarity: '', tag: '' });
const characterFilters = ref({ name: '', rarity: '' });

// 虚拟化配置 - 确保卡片名字完全可见
const VIRTUAL_GRID_CONFIG = {
  itemHeight: 180,      // 增加卡片高度，确保名字完全显示
  containerHeight: 650, // 容器高度
  minItemWidth: 100,    // 最小卡片宽度
  gap: 16              // 间隙
};

// 虚拟化阈值 - 提高阈值，减少虚拟化触发频率
const VIRTUALIZATION_THRESHOLD = 100;

// 虚拟化开关 - 用户可以选择禁用虚拟化
const enableVirtualization = ref(true);


// --- Event Handlers ---
function openDetail(card: AnimeCardType | CharacterCardType, type: 'anime' | 'character') {
    selectedCard.value = card;
    selectedCardType.value = type;
}

function closeDetail() {
    selectedCard.value = null;
}

// 统一点击处理
function handleCardClick(card: AnimeCardType | CharacterCardType, type: 'anime' | 'character') {
    if (isEditing.value) {
        const success = addToDeck(card.id, type);
        if (!success) {
            alert(`无法添加 ${card.name} (重复或已满)`);
        }
    } else {
        openDetail(card, type);
    }
}

function handleDismantleAll(type: 'anime' | 'character') {
    const typeText = type === 'anime' ? '动画' : '角色';
    if (confirm(`确定要分解所有重复的${typeText}卡吗？`)) {
        economyStore.dismantleAllDuplicates(type);
    }
}

// --- COMPUTED Properties ---
const hasDuplicateAnime = computed(() => {
    return Array.from(collectionStore.animeCollection.values()).some(c => c.count > 1);
});
const hasDuplicateCharacters = computed(() => {
    return Array.from(collectionStore.characterCollection.values()).some(c => c.count > 1);
});

const allAnimeTags = computed(() => {
    const tags = new Set<string>();
    gameDataStore.allAnimeCards.forEach(card => {
        card.synergy_tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
});

const sortCards = <T extends AnimeCardType | CharacterCardType>(cards: (T & { count: number })[]) => {
    return cards.sort((a, b) => {
        const rarityA = rarityOrder.indexOf(a.rarity);
        const rarityB = rarityOrder.indexOf(b.rarity);
        if (rarityA !== rarityB) return rarityA - rarityB;
        return a.name.localeCompare(b.name, 'zh-Hans-CN');
    });
};

const filteredAnimeCards = computed(() => {
  if (!authStore.isLoggedIn || gameDataStore.allAnimeCards.length === 0) return [];

  let cards: (AnimeCardType & { count: number })[] = [];
  for (const [id, collectionData] of collectionStore.animeCollection.entries()) {
    const cardDetails = gameDataStore.getAnimeCardById(id);
    if (cardDetails) {
      cards.push({ ...cardDetails, count: collectionData.count });
    }
  }

  if (animeFilters.value.name) {
      cards = cards.filter(card => card.name.toLowerCase().includes(animeFilters.value.name.toLowerCase()));
  }
  if (animeFilters.value.rarity) {
      cards = cards.filter(card => card.rarity === animeFilters.value.rarity);
  }
  if (animeFilters.value.tag) {
      cards = cards.filter(card => card.synergy_tags?.includes(animeFilters.value.tag));
  }
  
  return sortCards(cards);
});

// 判断是否需要虚拟化
const shouldVirtualizeAnime = computed(() => {
  return enableVirtualization.value && filteredAnimeCards.value.length > VIRTUALIZATION_THRESHOLD;
});

const shouldVirtualizeCharacter = computed(() => {
  return enableVirtualization.value && filteredCharacterCards.value.length > VIRTUALIZATION_THRESHOLD;
});

// 性能监控（开发环境）
if (import.meta.env.DEV) {
  // 监控卡片数量变化
  import('vue').then(({ watch }) => {
    watch(
      () => filteredAnimeCards.value.length,
      (newCount, oldCount) => {
        console.log(`📊 [虚拟化] 动画卡数量变化: ${oldCount} → ${newCount}, 虚拟化: ${newCount > VIRTUALIZATION_THRESHOLD ? '✅' : '❌'}`);
      }
    );
    
    watch(
      () => filteredCharacterCards.value.length,
      (newCount, oldCount) => {
        console.log(`📊 [虚拟化] 角色卡数量变化: ${oldCount} → ${newCount}, 虚拟化: ${newCount > VIRTUALIZATION_THRESHOLD ? '✅' : '❌'}`);
      }
    );
  });
}

const filteredCharacterCards = computed(() => {
  if (!authStore.isLoggedIn || gameDataStore.allCharacterCards.length === 0) return [];

  let cards: (CharacterCardType & { count: number })[] = [];
  for (const [id, collectionData] of collectionStore.characterCollection.entries()) {
    const cardDetails = gameDataStore.getCharacterCardById(id);
    if (cardDetails) {
      cards.push({ ...cardDetails, count: collectionData.count });
    }
  }

  if (characterFilters.value.name) {
      cards = cards.filter(card => card.name.toLowerCase().includes(characterFilters.value.name.toLowerCase()));
  }
  if (characterFilters.value.rarity) {
      cards = cards.filter(card => card.rarity === characterFilters.value.rarity);
  }

  return sortCards(cards);
});
</script>

<template>
  <div class="space-y-6">
    <!-- Deck Editing Mode Banner -->
    <div v-if="isEditing" class="bg-indigo-600 text-white px-4 py-3 rounded-lg shadow-md flex justify-between items-center animate-pulse">
      <div class="flex items-center gap-3">
        <span class="flex h-3 w-3 relative">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
        <span class="font-bold tracking-widest">正在为卡组 [{{ currentDeckName }}] 选择成员...</span>
      </div>
      <button @click="activeTab = 'decks'" class="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full backdrop-blur-sm transition-colors uppercase font-black">
        返回编辑器
      </button>
    </div>

    <!-- Header, Tabs, and Filters -->
    <div class="bg-white rounded-lg shadow-sm text-gray-800 border-2 border-gray-200">
      <div class="border-b border-gray-200 px-6 pt-4 pb-2">
        <h3 class="text-xl font-bold text-gray-800 mb-3">我的收藏</h3>
        <nav class="-mb-px flex space-x-6" aria-label="Collection Tabs">
          <a href="#" @click.prevent="activeTab = 'anime'" :class="['collection-tab', { 'active': activeTab === 'anime' }]">动画收藏</a>
          <a href="#" @click.prevent="activeTab = 'character'" :class="['collection-tab', { 'active': activeTab === 'character' }]">角色收藏</a>
          <a href="#" @click.prevent="activeTab = 'decks'" :class="['collection-tab', { 'active': activeTab === 'decks' }]">我的卡组</a>
        </nav>
      </div>

      <!-- Filters Section for Collections -->
      <div v-if="activeTab !== 'decks'" class="p-6 border-b border-gray-200">
        <div v-if="activeTab === 'anime'">
            <div class="flex flex-wrap gap-4 items-center">
                <input type="text" v-model="animeFilters.name" placeholder="按动画名称搜索..." class="p-2 border rounded-lg flex-grow min-w-0 text-gray-800">
                <select v-model="animeFilters.rarity" class="p-2 border rounded-lg text-gray-800 bg-white">
                    <option value="">所有稀有度</option>
                    <option v-for="r in rarityOrder" :key="r" :value="r">{{ r }}</option>
                </select>
                <select v-model="animeFilters.tag" class="p-2 border rounded-lg text-gray-800 bg-white">
                    <option value="">所有标签</option>
                    <option v-for="tag in allAnimeTags" :key="tag" :value="tag">{{ tag }}</option>
                </select>
                <button @click="handleDismantleAll('anime')" :disabled="!hasDuplicateAnime" class="p-2 border rounded-lg bg-red-600 text-white disabled:bg-gray-400">
                    一键分解重复卡
                </button>
                <label class="flex items-center space-x-2 text-gray-700">
                    <input type="checkbox" v-model="enableVirtualization" class="rounded">
                    <span class="text-sm">启用虚拟化 (>{{ VIRTUALIZATION_THRESHOLD }}张)</span>
                </label>
            </div>
        </div>
        <div v-if="activeTab === 'character'">
            <div class="flex flex-wrap gap-4 items-center">
                <input type="text" v-model="characterFilters.name" placeholder="按角色名称搜索..." class="p-2 border rounded-lg flex-grow min-w-0 text-gray-800">
                 <select v-model="characterFilters.rarity" class="p-2 border rounded-lg text-gray-800 bg-white">
                    <option value="">所有稀有度</option>
                    <option v-for="r in rarityOrder" :key="r" :value="r">{{ r }}</option>
                </select>
                <button @click="handleDismantleAll('character')" :disabled="!hasDuplicateCharacters" class="p-2 border rounded-lg bg-red-600 text-white disabled:bg-gray-400">
                    一键分解重复卡
                </button>
                <label class="flex items-center space-x-2 text-gray-700">
                    <input type="checkbox" v-model="enableVirtualization" class="rounded">
                    <span class="text-sm">启用虚拟化 (>{{ VIRTUALIZATION_THRESHOLD }}张)</span>
                </label>
            </div>
        </div>
      </div>

      <!-- Content Area -->
      <div class="p-6">
        <div v-if="!authStore.isLoggedIn" class="text-center py-12">
          <p class="text-gray-500 text-lg font-medium">请先登录以查看您的收藏。</p>
        </div>
        
        <!-- Anime Cards List -->
        <div v-else-if="activeTab === 'anime'">
          <div v-if="filteredAnimeCards.length === 0" class="text-center py-12">
              <p class="text-gray-500 text-lg font-medium">找不到匹配的动画卡</p>
          </div>
          <!-- 虚拟化版本 -->
          <VirtualGrid
            v-else-if="shouldVirtualizeAnime"
            :items="filteredAnimeCards"
            :item-height="VIRTUAL_GRID_CONFIG.itemHeight"
            :container-height="VIRTUAL_GRID_CONFIG.containerHeight"
            :min-item-width="VIRTUAL_GRID_CONFIG.minItemWidth"
            :gap="VIRTUAL_GRID_CONFIG.gap"
            @item-click="handleCardClick($event, 'anime')"
          >
            <template #default="{ item }">
              <AnimeCard :anime="item as AnimeCardType & { count: number }" :count="item.count" :show-strength="true" />
            </template>
          </VirtualGrid>
          <!-- 传统版本（数据量少时使用） -->
          <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            <AnimeCard v-for="card in filteredAnimeCards" :key="card.id" :anime="card" :count="card.count" :show-strength="true" @click="handleCardClick(card, 'anime')"/>
          </div>
        </div>

        <!-- Character Cards List -->
        <div v-else-if="activeTab === 'character'">
           <div v-if="filteredCharacterCards.length === 0" class="text-center py-12">
              <p class="text-gray-500 text-lg font-medium">找不到匹配的角色卡</p>
           </div>
          <!-- 虚拟化版本 -->
          <VirtualGrid
            v-else-if="shouldVirtualizeCharacter"
            :items="filteredCharacterCards"
            :item-height="VIRTUAL_GRID_CONFIG.itemHeight"
            :container-height="VIRTUAL_GRID_CONFIG.containerHeight"
            :min-item-width="VIRTUAL_GRID_CONFIG.minItemWidth"
            :gap="VIRTUAL_GRID_CONFIG.gap"
            @item-click="handleCardClick($event, 'character')"
          >
            <template #default="{ item }">
              <CharacterCard :character="item as CharacterCardType & { count: number }" :count="item.count" />
            </template>
          </VirtualGrid>
          <!-- 传统版本（数据量少时使用） -->
          <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            <CharacterCard v-for="card in filteredCharacterCards" :key="card.id" :character="card" :count="card.count" @click="handleCardClick(card, 'character')"/>
          </div>
        </div>
        
        <!-- Deck Manager -->
        <div v-else-if="activeTab === 'decks'">
            <DeckManager />
        </div>

      </div>
    </div>

    <!-- Card Detail Modal -->
    <CardDetailModal
        v-if="selectedCard"
        :card="selectedCard"
        :card-type="selectedCardType"
        :count="selectedCardType === 'anime' ? collectionStore.getAnimeCardCount(selectedCard.id) : collectionStore.getCharacterCardCount(selectedCard.id)"
        @close="closeDetail"
    />
  </div>
</template>

<style scoped>
.collection-tab {
  @apply whitespace-nowrap py-2 px-3 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300;
}
.collection-tab.active {
  @apply border-indigo-500 text-indigo-600;
}
</style>

