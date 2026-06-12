<script setup lang="ts">
import { useUserStore, type Deck } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { ref, computed, onMounted } from 'vue';
import { listAIProfiles, type AIProfile } from '@/config/aiProfiles';
import { useSettingsStore } from '@/stores/settings';
import BattleRulesModal from './BattleRulesModal.vue';

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

// 战斗规则弹窗
const showRulesModal = ref(false);

// 调试函数
function handleDeckClick(deck: Deck) {
  emit('deckSelected', deck, selectedAIId.value);
}

function handleRandomClick() {
  emit('randomDeck', selectedAIId.value);
}
</script>

<template>
  <div class="deck-selector-container">
    <div class="flex items-center justify-center mb-8">
      <h2 class="text-3xl font-bold text-center text-ink">请选择您的出战卡组</h2>
      <button
        @click="showRulesModal = true"
        class="ml-4 px-3 py-1 text-sm bg-accent text-on-accent rounded-full hover:bg-accent-strong transition-colors"
        title="查看战斗规则"
      >
        📋 规则详解
      </button>
    </div>
    <div class="ai-selection-section mb-8">
      <div class="flex items-center justify-center gap-3 mb-4">
        <label class="text-ink text-lg font-semibold">AI 对手：</label>
        <select v-model="selectedAIId" class="p-3 rounded-lg bg-surface-2 text-ink border border-line min-w-48">
          <option v-for="p in aiProfiles" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
      <div v-if="selectedAI" class="ai-info bg-surface-2/50 rounded-lg p-4 max-w-md mx-auto">
        <p class="text-ink-2 text-center mb-2">{{ selectedAI.description }}</p>
        <div class="flex justify-center gap-4 text-sm">
          <span class="text-info">
            🎴 卡组: {{ selectedAI.anime.length > 0 ? '固定' : '随机' }}
          </span>
          <span class="text-accent">
            👤 角色: {{ selectedAI.character.length > 0 ? '固定' : '随机' }}
          </span>
        </div>
      </div>
    </div>
    <div v-if="Object.keys(userStore.savedDecks).length === 0" class="text-center">
      <p class="text-ink-2">没有找到已保存的卡组。</p>
      <button @click="handleRandomClick" class="btn-primary mt-4">使用随机卡组开始</button>
    </div>
    <div v-else>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        <div
          v-for="deck in userStore.savedDecks"
          :key="deck.name"
          class="bg-surface rounded-lg shadow-lg overflow-hidden group cursor-pointer border-2 border-transparent hover:border-highlight transition-all"
          @click="handleDeckClick(deck)"
        >
          <div class="relative aspect-w-10 aspect-h-12 bg-surface-2">
            <img loading="lazy" decoding="async" :src="getCoverImage(deck)" class="w-full h-full object-cover" :alt="`${deck.name} cover`" />
          </div>
          <div class="p-4">
            <h4 class="font-bold text-lg truncate text-ink">{{ deck.name }}</h4>
            <p class="text-sm text-ink-2">{{ deck.anime.length }} 动画 / {{ deck.character.length }} 角色</p>
          </div>
        </div>
      </div>
      <div class="text-center mt-8">
        <button @click="handleRandomClick" class="btn-secondary">或使用随机卡组开始</button>
      </div>
    </div>
    
    <!-- Battle Rules Modal -->
    <BattleRulesModal 
      :show="showRulesModal" 
      @close="showRulesModal = false"
    />
  </div>
</template>

<style scoped>
.deck-selector-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}
/* .btn-primary / .btn-secondary 使用 main.css 全局组件类（语义令牌），不再本地覆写颜色 */
</style>
