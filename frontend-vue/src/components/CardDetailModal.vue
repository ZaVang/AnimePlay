<script setup lang="ts">
import { computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { GAME_CONFIG } from '@/config/gameConfig';
import type { Card, AnimeCard, CharacterCard } from '@/types/card';
import type { Skill } from '@/types/skill';

const props = defineProps<{
  card: Card | null;
  cardType: 'anime' | 'character';
  count: number;
}>();

const emit = defineEmits(['close']);
const userStore = useUserStore();
const gameDataStore = useGameDataStore();

const cardRarityConfig = computed(() => {
    if (!props.card) return {};
    const config = props.cardType === 'anime' ? GAME_CONFIG.animeSystem : GAME_CONFIG.characterSystem;
    return config.rarityConfig[props.card.rarity] || {};
});

// FIXED: Added `const` back
const dismantleValue = computed(() => {
    return cardRarityConfig.value.dismantleValue || 0;
});

// --- NEW: Computed properties for skills ---
const activeSkill = computed<Skill | undefined>(() => {
  if (props.cardType === 'character' && props.card) {
    const charCard = props.card as CharacterCard;
    // Assumes a getter in your store, which you may need to implement
    return gameDataStore.getSkillById(charCard.activeSkillId);
  }
  return undefined;
});

const passiveSkill = computed<Skill | undefined>(() => {
  if (props.cardType === 'character' && props.card) {
    const charCard = props.card as CharacterCard;
    // Assumes a getter in your store
    return gameDataStore.getSkillById(charCard.passiveSkillId);
  }
  return undefined;
});
// --- END NEW ---

const processedAnimeNames = computed(() => {
    if (props.cardType !== 'character' || !props.card || !(props.card as CharacterCard).anime_names) return [];
    
    return (props.card as CharacterCard).anime_names.map(name => {
        const animeCard = gameDataStore.allAnimeCards.find(c => c.name === name);
        const isOwned = animeCard ? userStore.animeCollection.has(animeCard.id) : false;
        return { name, isOwned };
    });
});

function closeModal() {
  emit('close');
}

function handleDismantle() {
    if (props.card) {
        if (confirm(`确定要分解一张 [${props.card.rarity}] ${props.card.name} 吗？\n你将获得 ${dismantleValue.value} 知识点。`)) {
            userStore.dismantleCard(props.card.id, props.cardType);
            closeModal();
        }
    }
}
</script>

<template>
  <div 
    v-if="card" 
    @click="closeModal"
    class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300"
  >
    <div 
      @click.stop 
      class="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col text-gray-800"
    >
      <div class="flex-shrink-0 flex justify-between items-start mb-4">
        <h2 class="text-2xl font-bold">{{ card.name }}</h2>
        <button @click="closeModal" class="text-2xl text-gray-500 hover:text-gray-800">&times;</button>
      </div>

      <div class="flex-grow overflow-y-auto pr-4 -mr-4">
        <div class="flex flex-col md:flex-row gap-6">
          <!-- Left side: Image -->
          <div class="md:w-1/3 flex-shrink-0">
            <img :src="card.image_path" class="w-full rounded-md shadow-lg" :alt="card.name">
            <div class="mt-4 text-center">
                <span 
                    class="font-bold px-3 py-1 rounded-full text-white"
                    :class="cardRarityConfig.c?.includes('from') ? `bg-gradient-to-r ${cardRarityConfig.c}` : cardRarityConfig.c || 'bg-gray-400'"
                >
                    {{ card.rarity }}
                </span>
            </div>
            <div class="mt-2 text-center text-sm text-gray-600">
                拥有数量: <span class="font-bold">{{ count }}</span>
            </div>
          </div>

          <!-- Right side: Details -->
          <div class="md:w-2/3">
            <div v-if="card.description" class="prose max-w-none">
              <h3 class="font-bold text-lg mb-2">简介</h3>
              <p class="text-sm whitespace-pre-wrap">{{ card.description }}</p>
            </div>

            <!-- NEW: Battle Information Section -->
            <div class="mt-4 border-t pt-4">
              <h3 class="font-bold text-lg mb-2">战斗信息</h3>
              <!-- Anime Card Battle Info -->
              <div v-if="cardType === 'anime'" class="text-sm space-y-2">
                <div><strong>TP 消耗:</strong> <span class="font-semibold text-blue-600">{{ (card as AnimeCard).cost }}</span></div>
                <div v-if="(card as AnimeCard).effectDescription"><strong>效果:</strong> <span class="italic">{{ (card as AnimeCard).effectDescription }}</span></div>
              </div>
              <!-- Character Card Battle Info -->
              <div v-if="cardType === 'character'" class="space-y-4">
                <div v-if="activeSkill" class="p-3 bg-red-50 rounded-lg">
                  <h4 class="font-bold text-red-800">主动技能: {{ activeSkill.name }}</h4>
                  <p class="text-xs text-gray-600 mt-1">[消耗: {{ activeSkill.cost || 0 }} TP] [冷却: {{ activeSkill.cooldown || 0 }} 回合]</p>
                  <p class="text-sm mt-2">{{ activeSkill.description }}</p>
                </div>
                <div v-if="passiveSkill" class="p-3 bg-indigo-50 rounded-lg">
                  <h4 class="font-bold text-indigo-800">被动光环: {{ passiveSkill.name }}</h4>
                  <p class="text-sm mt-2">{{ passiveSkill.description }}</p>
                </div>
              </div>
            </div>
            <!-- END NEW -->
            
            <div v-if="card.synergy_tags && card.synergy_tags.length" class="mt-4 border-t pt-4">
                <h3 class="font-bold text-lg mb-2">标签</h3>
                <div class="flex flex-wrap gap-2">
                    <span v-for="tag in card.synergy_tags" :key="tag" class="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        {{ tag }}
                    </span>
                </div>
            </div>

            <div v-if="cardType === 'character' && (card as CharacterCard).anime_names && (card as CharacterCard).anime_names.length" class="mt-4 border-t pt-4">
              <h3 class="font-bold text-lg mb-2">登场作品</h3>
              <div class="flex flex-wrap gap-2">
                <span v-for="anime in processedAnimeNames" :key="anime.name"
                  class="text-xs font-semibold px-2.5 py-1 rounded-full"
                  :class="anime.isOwned ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'"
                >
                  {{ anime.name }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Dismantle Section -->
      <div v-if="count > 1" class="flex-shrink-0 border-t mt-4 pt-4">
          <h3 class="font-bold mb-2">分解卡牌</h3>
          <p class="text-sm text-gray-600 mb-3">分解一张多余的 [{{card.rarity}}] {{ card.name }} 可获得 <span class="font-bold text-emerald-600">{{ dismantleValue }}</span> 知识点。</p>
          <button @click="handleDismantle" class="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 text-sm">
              分解一张
          </button>
      </div>
    </div>
  </div>
</template>
