<script setup lang="ts">
import { ref } from 'vue';
import DeckList from './DeckList.vue';
import DeckEditor from './DeckEditor.vue';
import { useDeckEditor } from '@/composables/useDeckEditor';

type Mode = 'list' | 'editor';

const {
  isEditing,
  currentDeckName,
  currentDeck,
  animeIdInDeck,
  characterIdInDeck,
  addToDeck,
  removeFromDeck,
  saveDeck,
  startEditing,
  stopEditing
} = useDeckEditor();

function handleNewDeck() {
  startEditing(null);
}

function handleEditDeck(deckName: string) {
  startEditing(deckName);
}

function backToList() {
  stopEditing();
}
</script>

<template>
  <div>
    <div v-if="!isEditing">
      <DeckList @newDeck="handleNewDeck" @editDeck="handleEditDeck" />
    </div>
    <div v-else>
      <DeckEditor :deckName="currentDeckName" @back="backToList" />
    </div>
  </div>
</template>
