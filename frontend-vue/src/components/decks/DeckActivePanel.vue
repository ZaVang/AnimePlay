
<script setup lang="ts">
import { computed } from 'vue';
import type { Card } from '@/types/card';
import { GAME_CONFIG } from '@/config/gameConfig';

const props = defineProps<{
  deckName: string;
  animeInDeck: Card[];
  characterInDeck: Card[];
}>();

const emit = defineEmits<{
  (e: 'update:deckName', name: string): void;
  (e: 'remove-from-deck', id: number, type: 'anime' | 'character'): void;
  (e: 'save'): void;
  (e: 'back'): void;
}>();

const deckNameModel = computed({
  get: () => props.deckName,
  set: (val) => emit('update:deckName', val)
});

function handleImageError(event: Event) {
    (event.target as HTMLImageElement).src = 'https://placehold.co/100x100/e2e8f0/334155?text=...';
}
</script>

<template>
  <div class="deck-pane">
    <div class="deck-header">
      <input 
        type="text" 
        v-model="deckNameModel" 
        class="deck-name-input" 
        placeholder="输入卡组名称"
      >
      <div class="deck-actions">
        <button @click="emit('back')" class="btn-secondary">返回</button>
        <button @click="emit('save')" class="btn-primary">保存</button>
      </div>
    </div>
    
    <div class="deck-stats">
       <div class="stat-item" :class="{'text-clinical-danger': animeInDeck.length > GAME_CONFIG.deckBuilding.AnimeMaxNum}">
         <span class="label">动画卡</span>
         <span class="value">{{ animeInDeck.length }} / {{ GAME_CONFIG.deckBuilding.AnimeMaxNum }}</span>
       </div>
       <div class="stat-item" :class="{'text-clinical-danger': characterInDeck.length > GAME_CONFIG.deckBuilding.CharacterMaxNum}">
         <span class="label">角色卡</span>
         <span class="value">{{ characterInDeck.length }} / {{ GAME_CONFIG.deckBuilding.CharacterMaxNum }}</span>
       </div>
    </div>

    <div class="deck-content custom-scrollbar">
      <!-- Anime Cards -->
      <div class="section">
        <h4 class="section-title">
          <span class="icon">🎬</span> 动画序列 
          <span class="badge">{{ animeInDeck.length }}</span>
        </h4>
        <div class="deck-card-list">
          <div v-for="card in animeInDeck" :key="card.id" 
               @click="emit('remove-from-deck', card.id, 'anime')"
               class="deck-list-item group">
            <img :src="card.image_path" class="thumb" @error="handleImageError">
            <div class="info">
              <span class="rarity" :class="'rarity-' + card.rarity">{{ card.rarity }}</span>
              <span class="name truncate">{{ card.name }}</span>
            </div>
            <div class="remove-hint">移除</div>
          </div>
          <p v-if="animeInDeck.length === 0" class="empty-placeholder">从左侧点击添加动画卡</p>
        </div>
      </div>

      <!-- Character Cards -->
      <div class="section mt-6">
        <h4 class="section-title">
          <span class="icon">👤</span> 参战角色
          <span class="badge">{{ characterInDeck.length }}</span>
        </h4>
        <div class="deck-card-list">
           <div v-for="card in characterInDeck" :key="card.id" 
                @click="emit('remove-from-deck', card.id, 'character')"
                class="deck-list-item group">
            <img :src="card.image_path" class="thumb thumb-char" @error="handleImageError">
            <div class="info">
              <span class="rarity" :class="'rarity-' + card.rarity">{{ card.rarity }}</span>
              <span class="name truncate">{{ card.name }}</span>
            </div>
            <div class="remove-hint">移除</div>
          </div>
          <p v-if="characterInDeck.length === 0" class="empty-placeholder">从左侧点击添加角色卡</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.deck-pane {
  @apply bg-industrial-800 border-l border-industrial-700;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.deck-header {
  @apply p-4 border-b border-industrial-700 bg-industrial-900/50;
}

.deck-name-input {
  @apply text-lg font-black text-white p-2 border-b-2 border-transparent focus:border-clinical-warning outline-none w-full bg-transparent tracking-widest placeholder-industrial-600;
}

.deck-actions {
  @apply mt-4 flex gap-2;
}

.btn-primary {
  @apply flex-1 bg-clinical-warning text-black font-black py-2 px-4 text-xs tracking-widest hover:bg-yellow-400 clip-chamfer-sm transition-colors;
}

.btn-secondary {
  @apply flex-1 bg-industrial-700 text-industrial-300 font-bold py-2 px-4 text-xs tracking-widest hover:bg-industrial-600 clip-chamfer-sm transition-colors;
}

.deck-stats {
  @apply p-4 bg-industrial-900/30 grid grid-cols-2 gap-4 border-b border-industrial-700;
}

.stat-item {
  @apply flex flex-col items-center p-2 border border-industrial-700/50 bg-black/20;
}

.stat-item .label {
  @apply text-[10px] text-industrial-500 uppercase tracking-tighter;
}

.stat-item .value {
  @apply text-sm font-black text-industrial-100 font-mono;
}

.deck-content {
  @apply p-4 overflow-y-auto flex-1;
}

.section-title {
  @apply text-[10px] font-black text-industrial-500 uppercase tracking-widest mb-3 flex items-center gap-2;
}

.section-title .badge {
  @apply bg-industrial-700 text-industrial-300 px-1.5 py-0.5 rounded-none text-[9px];
}

.deck-card-list {
  @apply space-y-1.5;
}

.deck-list-item {
  @apply flex items-center p-2 bg-industrial-900/40 border border-industrial-700/50 hover:border-clinical-danger/50 cursor-pointer relative overflow-hidden;
}

.deck-list-item .thumb {
  @apply w-10 h-7 object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all;
}

.deck-list-item .thumb-char {
  @apply w-8 h-10;
}

.deck-list-item .info {
  @apply flex flex-col ml-3 flex-1 min-w-0;
}

.deck-list-item .rarity {
  @apply text-[9px] font-black uppercase;
}

.deck-list-item .name {
  @apply text-xs text-industrial-200 font-bold;
}

.remove-hint {
  @apply absolute right-2 inset-y-0 flex items-center text-[10px] font-black text-clinical-danger opacity-0 group-hover:opacity-100 transition-opacity;
}

.empty-placeholder {
  @apply text-[10px] text-industrial-600 py-8 text-center border-2 border-dashed border-industrial-700 italic;
}

.rarity-UR { @apply text-red-500; }
.rarity-HR { @apply text-purple-500; }
.rarity-SSR { @apply text-amber-500; }
.rarity-SR { @apply text-indigo-400; }
.rarity-R { @apply text-green-500; }
.rarity-N { @apply text-gray-500; }

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #334155;
}
</style>
