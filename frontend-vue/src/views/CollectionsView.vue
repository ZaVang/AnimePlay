<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import type { AnimeCard as AnimeCardType, CharacterCard as CharacterCardType, Rarity } from '@/types/card';
import CardDetailModal from '@/components/CardDetailModal.vue';
import DeckManager from '@/components/decks/DeckManager.vue';
import AnimeCard from '@/components/AnimeCard.vue';
import CharacterCard from '@/components/CharacterCard.vue';
import VirtualGrid from '@/components/VirtualGrid.vue';
import CodexPanel from '@/components/CodexPanel.vue';
import AchievementsPanel from '@/components/AchievementsPanel.vue';
import ShareCard from '@/components/ShareCard.vue';

const userStore = useUserStore();
const gameDataStore = useGameDataStore();
const router = useRouter();

// --- STATE for UI ---
const activeTab = ref<'anime' | 'character' | 'decks' | 'codex' | 'achievements'>('anime');
const selectedCard = ref<AnimeCardType | CharacterCardType | null>(null);
const selectedCardType = ref<'anime' | 'character'>('anime');
const rarityOrder: Rarity[] = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];

// Filters
const animeFilters = ref({ name: '', rarity: '', tag: '' });
const characterFilters = ref({ name: '', rarity: '' });

// E3-T2：成绩卡分享弹窗
const showShareCard = ref(false);

// 虚拟化配置 - 确保卡片名字完全可见
const VIRTUAL_GRID_CONFIG = {
  itemHeight: 180,      // 增加卡片高度，确保名字完全显示
  containerHeight: 650, // 容器高度
  minItemWidth: 100,    // 最小卡片宽度
  gap: 16              // 间隙
};

// 虚拟化阈值 - 提高阈值，减少虚拟化触发频率
const VIRTUALIZATION_THRESHOLD = 100;

// 虚拟化总开关（收成内部常量；曾是面向用户的调试开关，evolution-1 收口）
const ENABLE_VIRTUALIZATION = true;


// --- Event Handlers ---
function openDetail(card: AnimeCardType | CharacterCardType, type: 'anime' | 'character') {
    selectedCard.value = card;
    selectedCardType.value = type;
}

function closeDetail() {
    selectedCard.value = null;
}

function handleDismantleAll(type: 'anime' | 'character') {
    const typeText = type === 'anime' ? '动画' : '角色';
    if (confirm(`确定要分解所有重复的${typeText}卡吗？`)) {
        userStore.dismantleAllDuplicates(type);
    }
}

// --- COMPUTED Properties ---
// E3-T1 空态 CTA：区分「一张都没有」与「只是被筛选掉了」，给不同引导文案
const hasAnyAnime = computed(() => userStore.animeCollection.size > 0);
const hasAnyCharacter = computed(() => userStore.characterCollection.size > 0);

const hasDuplicateAnime = computed(() => {
    return Array.from(userStore.animeCollection.values()).some(c => c.count > 1);
});
const hasDuplicateCharacters = computed(() => {
    return Array.from(userStore.characterCollection.values()).some(c => c.count > 1);
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
  if (!userStore.isLoggedIn || gameDataStore.allAnimeCards.length === 0) return [];
  
  let cards: (AnimeCardType & { count: number })[] = [];
  for (const [id, collectionData] of userStore.animeCollection.entries()) {
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
  return ENABLE_VIRTUALIZATION && filteredAnimeCards.value.length > VIRTUALIZATION_THRESHOLD;
});

const shouldVirtualizeCharacter = computed(() => {
  return ENABLE_VIRTUALIZATION && filteredCharacterCards.value.length > VIRTUALIZATION_THRESHOLD;
});

const filteredCharacterCards = computed(() => {
  if (!userStore.isLoggedIn || gameDataStore.allCharacterCards.length === 0) return [];

  let cards: (CharacterCardType & { count: number })[] = [];
  for (const [id, collectionData] of userStore.characterCollection.entries()) {
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
    <!-- Header, Tabs, and Filters -->
    <div class="bg-surface-2 rounded-lg shadow text-ink border border-line">
      <div class="border-b border-line px-6 pt-4 pb-2">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xl font-bold text-ink">我的收藏</h3>
          <button
            v-if="userStore.isLoggedIn"
            class="btn-primary text-sm"
            @click="showShareCard = true"
          >
            🎴 生成成绩卡
          </button>
        </div>
        <nav class="-mb-px flex space-x-6" aria-label="Collection Tabs">
          <a href="#" @click.prevent="activeTab = 'anime'" :class="['collection-tab', { 'active': activeTab === 'anime' }]">动画收藏</a>
          <a href="#" @click.prevent="activeTab = 'character'" :class="['collection-tab', { 'active': activeTab === 'character' }]">角色收藏</a>
          <a href="#" @click.prevent="activeTab = 'codex'" :class="['collection-tab', { 'active': activeTab === 'codex' }]">图鉴</a>
          <a href="#" @click.prevent="activeTab = 'achievements'" :class="['collection-tab', { 'active': activeTab === 'achievements' }]">成就</a>
          <a href="#" @click.prevent="activeTab = 'decks'" :class="['collection-tab', { 'active': activeTab === 'decks' }]">我的卡组</a>
        </nav>
      </div>

      <!-- Filters Section for Collections -->
      <div v-if="activeTab === 'anime' || activeTab === 'character'" class="p-6 border-b border-line">
        <div v-if="activeTab === 'anime'">
            <div class="flex flex-wrap gap-4 items-center">
                <input type="text" v-model="animeFilters.name" placeholder="按动画名称搜索..." class="p-2 border rounded-lg flex-grow min-w-0 text-ink">
                <select v-model="animeFilters.rarity" class="p-2 border rounded-lg text-ink bg-surface">
                    <option value="">所有稀有度</option>
                    <option v-for="r in rarityOrder" :key="r" :value="r">{{ r }}</option>
                </select>
                <select v-model="animeFilters.tag" class="p-2 border rounded-lg text-ink bg-surface">
                    <option value="">所有标签</option>
                    <option v-for="tag in allAnimeTags" :key="tag" :value="tag">{{ tag }}</option>
                </select>
                <button @click="handleDismantleAll('anime')" :disabled="!hasDuplicateAnime" class="p-2 border rounded-lg bg-danger text-white disabled:opacity-45">
                    一键分解重复卡
                </button>
            </div>
        </div>
        <div v-if="activeTab === 'character'">
            <div class="flex flex-wrap gap-4 items-center">
                <input type="text" v-model="characterFilters.name" placeholder="按角色名称搜索..." class="p-2 border rounded-lg flex-grow min-w-0 text-ink">
                 <select v-model="characterFilters.rarity" class="p-2 border rounded-lg text-ink bg-surface">
                    <option value="">所有稀有度</option>
                    <option v-for="r in rarityOrder" :key="r" :value="r">{{ r }}</option>
                </select>
                <button @click="handleDismantleAll('character')" :disabled="!hasDuplicateCharacters" class="p-2 border rounded-lg bg-danger text-white disabled:opacity-45">
                    一键分解重复卡
                </button>
            </div>
        </div>
      </div>

      <!-- Content Area -->
      <div class="p-6">
        <div v-if="!userStore.isLoggedIn" class="text-center py-12">
          <p class="text-ink-2 text-lg font-medium">请先登录以查看您的收藏。</p>
        </div>
        
        <!-- Anime Cards List -->
        <div v-else-if="activeTab === 'anime'">
          <div v-if="filteredAnimeCards.length === 0" class="text-center py-12">
              <p class="text-ink-2 text-lg font-medium mb-1">
                {{ hasAnyAnime ? '没有匹配当前筛选的动画卡' : '你还没有任何动画卡' }}
              </p>
              <p class="text-ink-3 text-sm mb-4">
                {{ hasAnyAnime ? '试试清空搜索或稀有度筛选。' : '去抽卡开出你的第一张番剧卡吧！' }}
              </p>
              <button class="btn-primary" @click="router.push('/gacha')">🎴 去抽卡</button>
          </div>
          <!-- 虚拟化版本 -->
          <VirtualGrid
            v-else-if="shouldVirtualizeAnime"
            :items="filteredAnimeCards"
            :item-height="VIRTUAL_GRID_CONFIG.itemHeight"
            :container-height="VIRTUAL_GRID_CONFIG.containerHeight"
            :min-item-width="VIRTUAL_GRID_CONFIG.minItemWidth"
            :gap="VIRTUAL_GRID_CONFIG.gap"
            @item-click="openDetail($event, 'anime')"
          >
            <template #default="{ item }">
              <AnimeCard :anime="item as AnimeCardType & { count: number }" :count="item.count" />
            </template>
          </VirtualGrid>
          <!-- 传统版本（数据量少时使用） -->
          <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            <AnimeCard v-for="card in filteredAnimeCards" :key="card.id" :anime="card" :count="card.count" @click="openDetail(card, 'anime')"/>
          </div>
        </div>

        <!-- Character Cards List -->
        <div v-else-if="activeTab === 'character'">
           <div v-if="filteredCharacterCards.length === 0" class="text-center py-12">
              <p class="text-ink-2 text-lg font-medium mb-1">
                {{ hasAnyCharacter ? '没有匹配当前筛选的角色卡' : '你还没有任何角色卡' }}
              </p>
              <p class="text-ink-3 text-sm mb-4">
                {{ hasAnyCharacter ? '试试清空搜索或稀有度筛选。' : '去抽卡收集你喜欢的角色吧！' }}
              </p>
              <button class="btn-primary" @click="router.push('/gacha')">🎴 去抽卡</button>
           </div>
          <!-- 虚拟化版本 -->
          <VirtualGrid
            v-else-if="shouldVirtualizeCharacter"
            :items="filteredCharacterCards"
            :item-height="VIRTUAL_GRID_CONFIG.itemHeight"
            :container-height="VIRTUAL_GRID_CONFIG.containerHeight"
            :min-item-width="VIRTUAL_GRID_CONFIG.minItemWidth"
            :gap="VIRTUAL_GRID_CONFIG.gap"
            @item-click="openDetail($event, 'character')"
          >
            <template #default="{ item }">
              <CharacterCard :character="item as CharacterCardType & { count: number }" :count="item.count" />
            </template>
          </VirtualGrid>
          <!-- 传统版本（数据量少时使用） -->
          <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            <CharacterCard v-for="card in filteredCharacterCards" :key="card.id" :character="card" :count="card.count" @click="openDetail(card, 'character')"/>
          </div>
        </div>
        
        <!-- Codex (图鉴完成度 + 里程碑) -->
        <div v-else-if="activeTab === 'codex'">
            <CodexPanel />
        </div>

        <!-- Achievements (成就墙) -->
        <div v-else-if="activeTab === 'achievements'">
            <AchievementsPanel />
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
        :count="selectedCardType === 'anime' ? userStore.getAnimeCardCount(selectedCard.id) : userStore.getCharacterCardCount(selectedCard.id)"
        @close="closeDetail"
    />

    <!-- E3-T2：可分享成绩卡 -->
    <ShareCard v-if="showShareCard" @close="showShareCard = false" />
  </div>
</template>

<style scoped>
.collection-tab {
  @apply whitespace-nowrap py-2 px-3 border-b-2 font-medium text-sm border-transparent text-ink-2 hover:text-ink hover:border-line-2;
}
.collection-tab.active {
  @apply border-accent text-accent;
}
</style>

