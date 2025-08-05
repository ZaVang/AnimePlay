<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserStore, type Deck } from '@/stores/userStore';
import { useGameDataStore, type Card } from '@/stores/gameDataStore';
import AnimeCard from '@/components/AnimeCard.vue';
import CharacterCard from '@/components/CharacterCard.vue';

const props = defineProps<{
  deckName: string | null;
}>();

const emit = defineEmits(['back']);

const userStore = useUserStore();
const gameDataStore = useGameDataStore();

// --- STATE ---
const newDeckName = ref(props.deckName || '新卡组');
const currentDeck = ref<Omit<Deck, 'name'>>({
  anime: [],
  character: [],
  cover: null,
  createdAt: new Date().toISOString(),
  version: 2,
});

const collectionTab = ref<'anime' | 'character'>('anime');
const searchQuery = ref('');

// --- LIFECYCLE ---
// Load existing deck data if editing
if (props.deckName && userStore.savedDecks[props.deckName]) {
  const existingDeck = userStore.savedDecks[props.deckName];
  newDeckName.value = existingDeck.name;
  // Create a deep copy for editing to avoid mutating the store directly
  currentDeck.value = JSON.parse(JSON.stringify(existingDeck));
}

// --- COMPUTED: Filtered Collections ---
const ownedAnimeCards = computed(() => {
  return Array.from(userStore.animeCollection.entries()).map(([id, data]) => {
    const card = gameDataStore.getAnimeCardById(id);
    return card ? { ...card, count: data.count } : null;
  }).filter(Boolean).filter(card => 
    searchQuery.value ? card!.name.toLowerCase().includes(searchQuery.value.toLowerCase()) : true
  ) as (Card & { count: number })[];
});

const ownedCharacterCards = computed(() => {
  return Array.from(userStore.characterCollection.entries()).map(([id, data]) => {
    const card = gameDataStore.getCharacterCardById(id);
    return card ? { ...card, count: data.count } : null;
  }).filter(Boolean).filter(card => 
    searchQuery.value ? card!.name.toLowerCase().includes(searchQuery.value.toLowerCase()) : true
  ) as (Card & { count: number })[];
});

// --- COMPUTED: Cards in Deck (resolved with full data) ---
const animeInDeck = computed(() => 
  currentDeck.value.anime.map(id => gameDataStore.getAnimeCardById(id)).filter(Boolean) as Card[]
);
const characterInDeck = computed(() => 
  currentDeck.value.character.map(id => gameDataStore.getCharacterCardById(id)).filter(Boolean) as Card[]
);


// --- ACTIONS ---
function addToDeck(card: Card, type: 'anime' | 'character') {
  const deckCards = currentDeck.value[type];
  const maxSize = type === 'anime' ? 25 : 5;

  if (deckCards.includes(card.id)) {
    // Already in deck
    return;
  }

  if (deckCards.length >= maxSize) {
    alert(`${type === 'anime' ? '动画' : '角色'}卡已达上限！`);
    return;
  }

  deckCards.push(card.id);

  // Set cover if it's the first anime card
  if (type === 'anime' && !currentDeck.value.cover) {
    currentDeck.value.cover = { id: card.id, type: 'anime' };
  }
}

function removeFromDeck(cardId: number, type: 'anime' | 'character') {
  const deckCards = currentDeck.value[type];
  const index = deckCards.indexOf(cardId);
  if (index > -1) {
    deckCards.splice(index, 1);
  }

  // If the cover card was removed, clear it or find a new one
  if (currentDeck.value.cover?.id === cardId) {
    const newCoverCard = animeInDeck.value[0];
    currentDeck.value.cover = newCoverCard ? { id: newCoverCard.id, type: 'anime' } : null;
  }
}

async function handleSaveDeck() {
  if (!newDeckName.value.trim()) {
    alert('请输入卡组名称！');
    return;
  }
  const deckToSave: Deck = {
    ...currentDeck.value,
    name: newDeckName.value.trim(),
    createdAt: new Date().toISOString(), // Update timestamp
  };

  // If we are renaming a deck, we need to delete the old one.
  if (props.deckName && props.deckName !== deckToSave.name) {
      await userStore.deleteDeck(props.deckName);
  }

  await userStore.saveDeck(deckToSave);
  alert('卡组已保存！');
  emit('back');
}

</script>

<template>
  <div class="deck-editor-grid">
    <!-- Left Column: Collection -->
    <div class="collection-pane">
       <div class="p-4 border-b">
         <div class="flex border-b mb-4">
            <button @click="collectionTab = 'anime'" :class="{'text-indigo-600 border-indigo-600': collectionTab === 'anime'}" class="flex-1 py-2 text-center font-semibold border-b-2">动画收藏</button>
            <button @click="collectionTab = 'character'" :class="{'text-indigo-600 border-indigo-600': collectionTab === 'character'}" class="flex-1 py-2 text-center font-semibold border-b-2">角色收藏</button>
         </div>
         <input type="text" v-model="searchQuery" placeholder="搜索..." class="w-full p-2 border rounded">
       </div>
       <div class="p-4 overflow-y-auto">
          <div v-if="collectionTab === 'anime'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            <AnimeCard v-for="card in ownedAnimeCards" :key="card.id" :anime="card" :count="card.count" @click="addToDeck(card, 'anime')" />
          </div>
          <div v-if="collectionTab === 'character'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            <CharacterCard v-for="card in ownedCharacterCards" :key="card.id" :character="card" :count="card.count" @click="addToDeck(card, 'character')" />
          </div>
       </div>
    </div>

    <!-- Right Column: Deck -->
    <div class="deck-pane">
      <div class="deck-header">
        <input type="text" v-model="newDeckName" class="deck-name-input" placeholder="输入卡组名称">
        <div class="deck-actions">
          <button @click="$emit('back')" class="btn-secondary">返回</button>
          <button @click="handleSaveDeck" class="btn-primary">保存</button>
        </div>
      </div>
      <div class="deck-stats">
         <p>动画: {{ currentDeck.anime.length }} / 25</p>
         <p>角色: {{ currentDeck.character.length }} / 5</p>
      </div>
      <div class="deck-content">
        <h4 class="font-bold mb-2">动画卡</h4>
        <div class="deck-card-list">
          <div v-for="card in animeInDeck" :key="card.id" @click="removeFromDeck(card.id, 'anime')"
               class="flex items-center p-1 rounded hover:bg-red-100 cursor-pointer text-sm">
            <span class="font-bold w-6">{{ card.rarity }}</span>
            <span class="truncate flex-1">{{ card.name }}</span>
          </div>
           <p v-if="animeInDeck.length === 0" class="text-xs text-gray-400">从左侧点击添加</p>
        </div>
        <h4 class="font-bold mt-4 mb-2">角色卡</h4>
        <div class="deck-card-list">
           <div v-for="card in characterInDeck" :key="card.id" @click="removeFromDeck(card.id, 'character')"
               class="flex items-center p-1 rounded hover:bg-red-100 cursor-pointer text-sm">
            <span class="font-bold w-6">{{ card.rarity }}</span>
            <span class="truncate flex-1">{{ card.name }}</span>
          </div>
          <p v-if="characterInDeck.length === 0" class="text-xs text-gray-400">从左侧点击添加</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.deck-editor-grid {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 1rem;
  height: 80vh;
}
.collection-pane, .deck-pane {
  @apply bg-white rounded-lg shadow-sm border;
  display: flex;
  flex-direction: column;
}
.collection-pane {
  overflow-y: hidden; /* Parent controls scroll */
}
.deck-pane {
  overflow-y: hidden;
}
.deck-header {
  @apply p-4 border-b flex items-center gap-4;
}
.deck-name-input {
  @apply text-xl font-bold p-2 border-b-2 border-transparent focus:border-indigo-500 outline-none w-full bg-transparent;
}
.deck-actions {
  @apply flex-shrink-0 flex gap-2;
}
.btn-primary {
  @apply bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700;
}
.btn-secondary {
  @apply bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300;
}
.deck-stats {
  @apply p-2 border-b text-sm text-gray-600 flex justify-around;
}
.deck-content {
  @apply p-4 overflow-y-auto flex-1;
}
.deck-card-list {
  @apply space-y-1;
}
</style>
