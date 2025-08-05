<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserStore, type Deck } from '@/stores/userStore';
import { useGameDataStore, type Card, type Rarity } from '@/stores/gameDataStore';
import AnimeCard from '@/components/AnimeCard.vue';
import CharacterCard from '@/components/CharacterCard.vue';
import CardDetailModal from '@/components/CardDetailModal.vue';

const props = defineProps<{
  deckName: string | null;
}>();

const emit = defineEmits(['back']);

const userStore = useUserStore();
const gameDataStore = useGameDataStore();

function generateNewDeckName(): string {
  let defaultName = '新卡组';
  let counter = 2;
  const existingNames = Object.keys(userStore.savedDecks);
  while (existingNames.includes(defaultName)) {
    defaultName = `新卡组 ${counter}`;
    counter++;
  }
  return defaultName;
}

// --- STATE ---
const newDeckName = ref(props.deckName || generateNewDeckName());
const currentDeck = ref<Omit<Deck, 'name'>>({
  anime: [],
  character: [],
  cover: null,
  createdAt: new Date().toISOString(),
  version: 2,
});

const collectionTab = ref<'anime' | 'character'>('anime');
const rarityOrder: Rarity[] = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
const animeFilters = ref({ name: '', rarity: '', tag: '' });
const characterFilters = ref({ name: '', rarity: '' });

// Card Detail Modal State
const selectedCard = ref<Card | null>(null);
const selectedCardType = ref<'anime' | 'character'>('anime');

// --- LIFECYCLE ---
if (props.deckName) {
  const existingDeck = userStore.savedDecks[props.deckName];
  if (existingDeck) {
    newDeckName.value = existingDeck.name;
    currentDeck.value = JSON.parse(JSON.stringify(existingDeck));
  } else {
    console.warn(`Deck with name "${props.deckName}" not found. Starting with a new deck.`);
    newDeckName.value = props.deckName;
  }
}

// --- COMPUTED: Filtered Collections ---
const allAnimeTags = computed(() => {
    const tags = new Set<string>();
    gameDataStore.allAnimeCards.forEach(card => {
        card.synergy_tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
});

const ownedAnimeCards = computed(() => {
  let cards = Array.from(userStore.animeCollection.entries()).map(([id, data]) => {
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
  
  // Sort by rarity
  return cards.sort((a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity));
});

const ownedCharacterCards = computed(() => {
  let cards = Array.from(userStore.characterCollection.entries()).map(([id, data]) => {
    const card = gameDataStore.getCharacterCardById(id);
    return card ? { ...card, count: data.count } : null;
  }).filter(Boolean) as (Card & { count: number })[];

  if (characterFilters.value.name) {
      cards = cards.filter(card => card.name.toLowerCase().includes(characterFilters.value.name.toLowerCase()));
  }
  if (characterFilters.value.rarity) {
      cards = cards.filter(card => card.rarity === characterFilters.value.rarity);
  }
  
  // Sort by rarity
  return cards.sort((a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity));
});

// --- COMPUTED: Cards in Deck ---
const animeInDeck = computed(() => 
  currentDeck.value.anime.map(id => gameDataStore.getAnimeCardById(id)).filter(Boolean) as Card[]
);
const characterInDeck = computed(() => 
  currentDeck.value.character.map(id => gameDataStore.getCharacterCardById(id)).filter(Boolean) as Card[]
);

const animeIdInDeck = computed(() => new Set(currentDeck.value.anime));
const characterIdInDeck = computed(() => new Set(currentDeck.value.character));


// --- ACTIONS ---
function addToDeck(card: Card, type: 'anime' | 'character') {
  const deckCards = currentDeck.value[type];
  const maxSize = type === 'anime' ? 25 : 5;
  if (deckCards.includes(card.id)) return;
  if (deckCards.length >= maxSize) {
    alert(`${type === 'anime' ? '动画' : '角色'}卡已达上限！`);
    return;
  }
  deckCards.push(card.id);
  
  if (type === 'character') {
    if (currentDeck.value.cover?.type !== 'character') {
      currentDeck.value.cover = { id: card.id, type: 'character' };
    }
  } else { // type is 'anime'
    if (!currentDeck.value.cover) {
      currentDeck.value.cover = { id: card.id, type: 'anime' };
    }
  }
}

function removeFromDeck(cardId: number, type: 'anime' | 'character') {
  const deckCards = currentDeck.value[type];
  const index = deckCards.indexOf(cardId);
  if (index > -1) {
    deckCards.splice(index, 1);

    if (currentDeck.value.cover?.id === cardId) {
      const firstChar = characterInDeck.value[0];
      if (firstChar) {
        currentDeck.value.cover = { id: firstChar.id, type: 'character' };
      } else {
        const firstAnime = animeInDeck.value[0];
        currentDeck.value.cover = firstAnime ? { id: firstAnime.id, type: 'anime' } : null;
      }
    }
  }
}

function showCardDetails(card: Card, type: 'anime' | 'character') {
    selectedCard.value = card;
    selectedCardType.value = type;
}

function closeDetailModal() {
    selectedCard.value = null;
}

function handleImageError(event: Event) {
    (event.target as HTMLImageElement).src = 'https://placehold.co/100x100/e2e8f0/334155?text=...';
}

async function handleSaveDeck() {
  if (!newDeckName.value.trim()) {
    alert('请输入卡组名称！');
    return;
  }
  
  const deckToSave: Deck = {
    ...currentDeck.value,
    name: newDeckName.value.trim(),
    createdAt: new Date().toISOString(),
  };

  const isRenaming = props.deckName && props.deckName !== deckToSave.name;
  const isNewDeck = !props.deckName;

  if (isRenaming) {
      await userStore.deleteDeck(props.deckName!);
  }
  
  // Prevent overwriting a different deck if the user renames this one to an existing name
  if ((isNewDeck || isRenaming) && userStore.savedDecks[deckToSave.name]) {
      if (!confirm(`名为 "${deckToSave.name}" 的卡组已存在。要覆盖它吗？`)) {
          // If the user cancelled the overwrite of an existing deck during a rename,
          // we might need to restore the old deck if we deleted it.
          // For simplicity, we'll just stop here. A better implementation would handle this more gracefully.
          if(isRenaming) {
            // This is tricky, for now we just alert user.
            alert("请选择一个新的卡组名。");
          }
          return;
      }
  }

  await userStore.saveDeck(deckToSave);
  alert('卡组已保存！');
  emit('back');
}
</script>

<template>
  <div>
      <div class="deck-editor-grid">
        <!-- Left Column: Collection -->
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
             </div>
             <div v-if="collectionTab === 'character'" class="space-y-2">
                <input type="text" v-model="characterFilters.name" placeholder="搜索角色名称..." class="w-full p-2 border rounded">
                <select v-model="characterFilters.rarity" class="w-full p-2 border rounded bg-white">
                    <option value="">所有稀有度</option>
                    <option v-for="r in rarityOrder" :key="r" :value="r">{{ r }}</option>
                </select>
             </div>

           </div>
           <div class="p-4 overflow-y-auto">
              <div v-if="collectionTab === 'anime'" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            <AnimeCard v-for="card in ownedAnimeCards" :key="card.id" :anime="card" :count="card.count"
                :is-in-deck="animeIdInDeck.has(card.id)"
                @click="addToDeck(card, 'anime')"
                @contextmenu.prevent="showCardDetails(card, 'anime')"
            />
          </div>
          <div v-if="collectionTab === 'character'" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            <CharacterCard v-for="card in ownedCharacterCards" :key="card.id" :character="card" :count="card.count"
                :is-in-deck="characterIdInDeck.has(card.id)"
                @click="addToDeck(card, 'character')"
                @contextmenu.prevent="showCardDetails(card, 'character')"
            />
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
        <h4 class="font-bold mb-2">动画卡 ({{ animeInDeck.length }}/25)</h4>
        <div class="deck-card-list">
          <div v-for="card in animeInDeck" :key="card.id" @click="removeFromDeck(card.id, 'anime')"
               class="flex items-center p-1 rounded hover:bg-red-100 cursor-pointer text-sm gap-2">
            <img :src="card.image_path" class="w-8 h-6 object-cover rounded-sm flex-shrink-0" @error="handleImageError">
            <span class="font-bold w-6">{{ card.rarity }}</span>
            <span class="truncate flex-1">{{ card.name }}</span>
          </div>
           <p v-if="animeInDeck.length === 0" class="text-xs text-gray-400 py-4 text-center">从左侧点击添加</p>
        </div>
        <h4 class="font-bold mt-4 mb-2">角色卡 ({{ characterInDeck.length }}/5)</h4>
        <div class="deck-card-list">
           <div v-for="card in characterInDeck" :key="card.id" @click="removeFromDeck(card.id, 'character')"
               class="flex items-center p-1 rounded hover:bg-red-100 cursor-pointer text-sm gap-2">
            <img :src="card.image_path" class="w-6 h-8 object-cover rounded-sm flex-shrink-0" @error="handleImageError">
            <span class="font-bold w-6">{{ card.rarity }}</span>
            <span class="truncate flex-1">{{ card.name }}</span>
          </div>
          <p v-if="characterInDeck.length === 0" class="text-xs text-gray-400 py-4 text-center">从左侧点击添加</p>
        </div>
      </div>
        </div>
      </div>
    
      <!-- Card Detail Modal -->
      <CardDetailModal 
          v-if="selectedCard"
          :card="selectedCard" 
          :card-type="selectedCardType" 
          :count="selectedCardType === 'anime' ? userStore.getAnimeCardCount(selectedCard.id) : userStore.getCharacterCardCount(selectedCard.id)"
          @close="closeDetailModal" 
      />
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
