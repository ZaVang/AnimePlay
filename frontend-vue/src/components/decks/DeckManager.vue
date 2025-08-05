<script setup lang="ts">
import { ref } from 'vue';
import DeckList from './DeckList.vue';
import DeckEditor from './DeckEditor.vue';

type Mode = 'list' | 'editor';

const mode = ref<Mode>('list');
const deckToEdit = ref<string | null>(null);

function handleNewDeck() {
  deckToEdit.value = null;
  mode.value = 'editor';
}

function handleEditDeck(deckName: string) {
  deckToEdit.value = deckName;
  mode.value = 'editor';
}

function backToList() {
  mode.value = 'list';
}
</script>

<template>
  <div>
    <div v-if="mode === 'list'">
      <DeckList @newDeck="handleNewDeck" @editDeck="handleEditDeck" />
    </div>
    <div v-else>
      <DeckEditor :deckName="deckToEdit" @back="backToList" />
    </div>
  </div>
</template>
