<script setup lang="ts">
import { ref } from 'vue';
import type { Card } from '@/types/card';
import { useDeckEditor } from '@/composables/useDeckEditor';
import { useCollectionStore } from '@/stores/modules/collectionStore';
import { useGameDataStore } from '@/stores/gameDataStore';

// Components
import DeckCollectionPanel from './DeckCollectionPanel.vue';
import DeckActivePanel from './DeckActivePanel.vue';
import CardDetailModal from '@/components/CardDetailModal.vue';

const props = defineProps<{
  deckName: string | null;
}>();

const emit = defineEmits(['back']);

// --- LOGIC SOURCE ---
const {
  currentDeckName,
  currentDeck,
  animeIdInDeck,
  characterIdInDeck,
  addToDeck,
  removeFromDeck,
  saveDeck,
  stopEditing
} = useDeckEditor();

const collectionStore = useCollectionStore();
const gameDataStore = useGameDataStore();

// --- UI STATE (ORCHESTRATION) ---
const selectedCard = ref<Card | null>(null);
const selectedCardType = ref<'anime' | 'character'>('anime');

function showCardDetails(card: Card, type: 'anime' | 'character') {
    selectedCard.value = card;
    selectedCardType.value = type;
}

async function handleSave() {
  try {
    await saveDeck();
    alert('卡组已保存！');
    emit('back');
  } catch (e: any) {
    alert(e.message || '保存失败');
  }
}

// Helper for UI to get card objects for the active panel
const animeInDeckObjects = ref<Card[]>([]);
const characterInDeckObjects = ref<Card[]>([]);

// Sync card objects based on IDs in deck
import { watchEffect } from 'vue';
watchEffect(() => {
  animeInDeckObjects.value = currentDeck.value.anime
    .map(id => gameDataStore.getAnimeCardById(id))
    .filter(Boolean) as Card[];
    
  characterInDeckObjects.value = currentDeck.value.character
    .map(id => gameDataStore.getCharacterCardById(id))
    .filter(Boolean) as Card[];
});
</script>

<template>
  <div class="deck-editor-container">
    <div class="deck-editor-layout">
      <!-- Left: Collection (Stateless UI) -->
      <DeckCollectionPanel
        :anime-id-in-deck="animeIdInDeck"
        :character-id-in-deck="characterIdInDeck"
        @add-to-deck="addToDeck"
        @show-details="showCardDetails"
        class="flex-1"
      />

      <!-- Right: Active Deck (Stateless UI) -->
      <DeckActivePanel
        v-model:deck-name="currentDeckName"
        :anime-in-deck="animeInDeckObjects"
        :character-in-deck="characterInDeckObjects"
        @remove-from-deck="removeFromDeck"
        @save="handleSave"
        @back="$emit('back')"
        class="w-[380px]"
      />
    </div>
    
    <!-- Modals -->
    <CardDetailModal
        v-if="selectedCard"
        :card="selectedCard"
        :card-type="selectedCardType"
        :count="selectedCardType === 'anime' ? collectionStore.getAnimeCardCount(selectedCard.id) : collectionStore.getCharacterCardCount(selectedCard.id)"
        @close="selectedCard = null"
    />
  </div>
</template>

<style scoped>
.deck-editor-container {
  @apply h-[85vh] overflow-hidden;
}

.deck-editor-layout {
  @apply flex gap-4 h-full;
}

/* Custom transitions for the editor layout */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
