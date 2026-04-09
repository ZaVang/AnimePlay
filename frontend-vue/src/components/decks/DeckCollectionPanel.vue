
<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Card, Rarity, AnimeCard as AnimeCardType, CharacterCard as CharacterCardType } from '@/types/card';
import AnimeCard from '@/components/AnimeCard.vue';
import CharacterCard from '@/components/CharacterCard.vue';
import VirtualGrid from '@/components/VirtualGrid.vue';
import { useCollectionStore } from '@/stores/modules/collectionStore';
import { useGameDataStore } from '@/stores/gameDataStore';

const props = defineProps<{
  animeIdInDeck: Set<number>;
  characterIdInDeck: Set<number>;
}>();

const emit = defineEmits<{
  (e: 'add-to-deck', card: Card, type: 'anime' | 'character'): void;
  (e: 'show-details', card: Card, type: 'anime' | 'character'): void;
}>();

const collectionStore = useCollectionStore();
const gameDataStore = useGameDataStore();

const collectionTab = ref<'anime' | 'character'>('anime');
const rarityOrder: Rarity[] = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
const animeFilters = ref({ name: '', rarity: '', tag: '' });
const characterFilters = ref({ name: '', rarity: '' });

// 虚拟化配置
const DECK_VIRTUAL_CONFIG = {
  itemHeight: 150,
  containerHeight: 550,
  minItemWidth: 90,
  gap: 10
};
const DECK_VIRTUALIZATION_THRESHOLD = 80;
const enableVirtualization = ref(true);

// --- COMPUTED: Filtered Collections ---
const allAnimeTags = computed(() => {
    const tags = new Set<string>();
    gameDataStore.allAnimeCards.forEach(card => {
        card.synergy_tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
});

const ownedAnimeCards = computed(() => {
  let cards = Array.from(collectionStore.animeCollection.entries()).map(([id, data]) => {
    const card = gameDataStore.getAnimeCardById(id);
    return card ? { ...card, count: data.count } : null;
  }).filter(Boolean) as (Card & { count: number })[];
  
  if (animeFilters.value.name) {
      cards = cards.filter(card => card.name.toLowerCase().includes(animeFilters.value.name.toLowerCase()));
  }
  if (animeFilters.value.rarity) {
      cards = cards.filter(card => card.rarity === animeFilters.value.rarity);
  }
  if (animeFilters.value.tag) {
      cards = cards.filter(card => card.synergy_tags?.includes(animeFilters.value.tag));
  }
  
  return cards.sort((a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity));
});

const ownedCharacterCards = computed(() => {
  let cards = Array.from(collectionStore.characterCollection.entries()).map(([id, data]) => {
    const card = gameDataStore.getCharacterCardById(id);
    return card ? { ...card, count: data.count } : null;
  }).filter(Boolean) as (Card & { count: number })[];

  if (characterFilters.value.name) {
      cards = cards.filter(card => card.name.toLowerCase().includes(characterFilters.value.name.toLowerCase()));
  }
  if (characterFilters.value.rarity) {
      cards = cards.filter(card => card.rarity === characterFilters.value.rarity);
  }
  
  return cards.sort((a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity));
});

const shouldVirtualizeAnimeCollection = computed(() => {
  return enableVirtualization.value && ownedAnimeCards.value.length > DECK_VIRTUALIZATION_THRESHOLD;
});

const shouldVirtualizeCharacterCollection = computed(() => {
  return enableVirtualization.value && ownedCharacterCards.value.length > DECK_VIRTUALIZATION_THRESHOLD;
});
</script>

<template>
  <div class="collection-pane">
    <div class="p-4 border-b">
      <div class="flex border-b mb-4">
        <button @click="collectionTab = 'anime'" :class="{'text-indigo-600 border-indigo-600': collectionTab === 'anime'}" class="flex-1 py-2 text-center font-semibold border-b-2">动画收藏</button>
        <button @click="collectionTab = 'character'" :class="{'text-indigo-600 border-indigo-600': collectionTab === 'character'}" class="flex-1 py-2 text-center font-semibold border-b-2">角色收藏</button>
      </div>
      
      <!-- Filters -->
      <div v-if="collectionTab === 'anime'" class="space-y-2">
        <input type="text" v-model="animeFilters.name" placeholder="搜索动画名称..." class="w-full p-2 border rounded">
        <div class="flex gap-2">
            <select v-model="animeFilters.rarity" class="w-full p-2 border rounded bg-white">
                <option value="">所有稀有度</option>
                <option v-for="r in rarityOrder" :key="r" :value="r">{{ r }}</option>
            </select>
            <select v-model="animeFilters.tag" class="w-full p-2 border rounded bg-white">
                <option value="">所有标签</option>
                <option v-for="tag in allAnimeTags" :key="tag" :value="tag">{{ tag }}</option>
            </select>
        </div>
        <label class="flex items-center space-x-2 text-gray-700 text-sm">
            <input type="checkbox" v-model="enableVirtualization" class="rounded">
            <span>启用虚拟化 (>{{ DECK_VIRTUALIZATION_THRESHOLD }}张)</span>
        </label>
      </div>
      <div v-if="collectionTab === 'character'" class="space-y-2">
        <input type="text" v-model="characterFilters.name" placeholder="搜索角色名称..." class="w-full p-2 border rounded">
        <select v-model="characterFilters.rarity" class="w-full p-2 border rounded bg-white">
            <option value="">所有稀有度</option>
            <option v-for="r in rarityOrder" :key="r" :value="r">{{ r }}</option>
        </select>
        <label class="flex items-center space-x-2 text-gray-700 text-sm">
            <input type="checkbox" v-model="enableVirtualization" class="rounded">
            <span>启用虚拟化 (>{{ DECK_VIRTUALIZATION_THRESHOLD }}张)</span>
        </label>
      </div>
    </div>
    <div class="p-4 overflow-y-auto min-h-0 flex-1">
      <div v-if="collectionTab === 'anime'">
        <VirtualGrid
          v-if="shouldVirtualizeAnimeCollection"
          :items="ownedAnimeCards"
          :item-height="DECK_VIRTUAL_CONFIG.itemHeight"
          :container-height="DECK_VIRTUAL_CONFIG.containerHeight"
          :min-item-width="DECK_VIRTUAL_CONFIG.minItemWidth"
          :gap="DECK_VIRTUAL_CONFIG.gap"
          @item-click="emit('add-to-deck', $event, 'anime')"
        >
          <template #default="{ item }">
            <AnimeCard 
              :anime="item as AnimeCardType & { count: number }" 
              :count="item.count"
              :is-in-deck="animeIdInDeck.has(item.id)"
              :show-cost="true"
              @contextmenu.prevent="emit('show-details', item, 'anime')"
            />
          </template>
        </VirtualGrid>
        <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          <AnimeCard v-for="card in ownedAnimeCards" :key="card.id" 
              :anime="card as AnimeCardType & { count: number }" 
              :count="card.count"
              :is-in-deck="animeIdInDeck.has(card.id)"
              :show-cost="true"
              @click="emit('add-to-deck', card, 'anime')"
              @contextmenu.prevent="emit('show-details', card, 'anime')"
          />
        </div>
      </div>

      <div v-if="collectionTab === 'character'">
        <VirtualGrid
          v-if="shouldVirtualizeCharacterCollection"
          :items="ownedCharacterCards"
          :item-height="DECK_VIRTUAL_CONFIG.itemHeight"
          :container-height="DECK_VIRTUAL_CONFIG.containerHeight"
          :min-item-width="DECK_VIRTUAL_CONFIG.minItemWidth"
          :gap="DECK_VIRTUAL_CONFIG.gap"
          @item-click="emit('add-to-deck', $event, 'character')"
        >
          <template #default="{ item }">
            <CharacterCard 
              :character="item as CharacterCardType & { count: number }" 
              :count="item.count"
              :is-in-deck="characterIdInDeck.has(item.id)"
              @contextmenu.prevent="emit('show-details', item, 'character')"
            />
          </template>
        </VirtualGrid>
        <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          <CharacterCard v-for="card in ownedCharacterCards" :key="card.id" 
              :character="card as CharacterCardType & { count: number }" 
              :count="card.count"
              :is-in-deck="characterIdInDeck.has(card.id)"
              @click="emit('add-to-deck', card, 'character')"
              @contextmenu.prevent="emit('show-details', card, 'character')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.collection-pane {
  @apply bg-white rounded-lg shadow-sm border;
  display: flex;
  flex-direction: column;
}
</style>
