<script setup lang="ts">
import { useUserStore, type Deck } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { ref, computed, onMounted } from 'vue';
import { listAIProfiles, type AIProfile } from '@/core/ai/aiProfiles';
import { useSettingsStore } from '@/stores/settings';

const userStore = useUserStore();
const gameDataStore = useGameDataStore();
const settingsStore = useSettingsStore();

// AI 档案选择：与设置联动
const aiProfiles = listAIProfiles();
const selectedAIId = computed<string>({
  get: () => settingsStore.selectedAIProfileId,
  set: (v: string) => { settingsStore.selectedAIProfileId = v; settingsStore.saveSettings(); },
});
const selectedAI = computed<AIProfile | undefined>(() => aiProfiles.find(p => p.id === selectedAIId.value));

onMounted(() => {
  // 若设置中的AI ID无效，则初始化为第一个可用档案
  if (!aiProfiles.find(p => p.id === selectedAIId.value)) {
    const fallback = aiProfiles[0]?.id;
    if (fallback) {
      settingsStore.selectedAIProfileId = fallback;
      settingsStore.saveSettings();
    }
  }
});

const getCoverImage = (deck: Deck) => {
  if (!deck.cover) {
    return `https://placehold.co/300x180/e2e8f0/334155?text=无封面`;
  }
  const card = deck.cover.type === 'anime'
    ? gameDataStore.getAnimeCardById(deck.cover.id)
    : gameDataStore.getCharacterCardById(deck.cover.id);
  return card ? card.image_path : `https://placehold.co/300x180/e2e8f0/334155?text=封面加载失败`;
};

const emit = defineEmits<{
  (e: 'deckSelected', deck: Deck, aiProfileId?: string): void;
  (e: 'randomDeck', aiProfileId?: string): void;
}>();
</script>

<template>
  <div class="deck-selector-container">
    <h2 class="text-3xl font-bold text-center text-white mb-8">请选择您的出战卡组</h2>
    <div class="flex items-center justify-center gap-3 mb-6">
      <label class="text-white">AI 对手：</label>
      <select v-model="selectedAIId" class="p-2 rounded bg-gray-800 text-white border border-gray-600">
        <option v-for="p in aiProfiles" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
    </div>
    <div v-if="Object.keys(userStore.savedDecks).length === 0" class="text-center">
      <p class="text-gray-400">没有找到已保存的卡组。</p>
      <button @click="emit('randomDeck', selectedAIId)" class="btn-primary mt-4">使用随机卡组开始</button>
    </div>
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      <div
        v-for="deck in userStore.savedDecks"
        :key="deck.name"
        class="bg-gray-800 rounded-lg shadow-lg overflow-hidden group cursor-pointer border-2 border-transparent hover:border-yellow-400 transition-all"
        @click="emit('deckSelected', deck, selectedAIId)"
      >
        <div class="relative aspect-w-10 aspect-h-12 bg-gray-700">
          <img :src="getCoverImage(deck)" class="w-full h-full object-cover" :alt="`${deck.name} cover`" />
        </div>
        <div class="p-4">
          <h4 class="font-bold text-lg truncate text-white">{{ deck.name }}</h4>
          <p class="text-sm text-gray-400">{{ deck.anime.length }} 动画 / {{ deck.character.length }} 角色</p>
        </div>
      </div>
    </div>
    <div class="text-center mt-8">
      <button @click="emit('randomDeck', selectedAIId)" class="btn-secondary">或使用随机卡组开始</button>
    </div>
  </div>
</template>

<style scoped>
.deck-selector-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}
.btn-primary {
  @apply bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors;
}
.btn-secondary {
  @apply bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors;
}
</style>
