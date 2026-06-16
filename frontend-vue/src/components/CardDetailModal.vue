<script setup lang="ts">
import { computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { GAME_CONFIG } from '@/config/gameConfig';
import type { Card, AnimeCard, CharacterCard } from '@/types/card';
import type { Skill } from '@/types/skill';
import { getEffectText, getTriggerText } from '@/skills/effects/descriptions';
import { isSkillImplemented } from '@/skills/effects';

const props = defineProps<{
  card: Card | null;
  cardType: 'anime' | 'character';
  count: number;
}>();

const emit = defineEmits(['close']);
const userStore = useUserStore();
const gameDataStore = useGameDataStore();

const cardRarityConfig = computed(() => {
    if (!props.card) return { p: 0, c: '', dismantleValue: 0, color: '', chartColor: '' };
    const config = props.cardType === 'anime' ? GAME_CONFIG.animeSystem : GAME_CONFIG.characterSystem;
    return config.rarityConfig[props.card.rarity] || { p: 0, c: '', dismantleValue: 0, color: '', chartColor: '' };
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

// --- NEW: Anime effects descriptions ---
const animeEffectsDescriptions = computed(() => {
  if (props.cardType !== 'anime' || !props.card) return [] as string[];
  const anime = props.card as AnimeCard;
  return (anime.effects || []).map(e => {
    const t = getTriggerText(e.trigger);
    const desc = getEffectText(e.effectId);
    return `${t}：${desc}`;
  });
});

// --- E2-T2: 番剧真实元数据（Bangumi 送达，竞品物理上拿不到） ---
const animeMeta = computed(() => {
  if (props.cardType !== 'anime' || !props.card) return null;
  return props.card as AnimeCard;
});

/** 放送年：date 取前 4 位（如 "2025-04-01" → "2025"），缺失/非法返回空。 */
const releaseYear = computed(() => {
  const date = animeMeta.value?.date;
  if (!date || typeof date !== 'string' || date.length < 4) return '';
  const year = date.slice(0, 4);
  return /^\d{4}$/.test(year) ? year : '';
});

const characterMeta = computed(() => {
  if (props.cardType !== 'character' || !props.card) return null;
  return props.card as CharacterCard;
});

/** anime 卡是否有任一真实资料可展示。 */
const hasAnimeMeta = computed(() => {
  const m = animeMeta.value;
  return !!m && (typeof m.rating_score === 'number' || typeof m.rating_rank === 'number' || !!releaseYear.value);
});

/** character 卡是否有任一真实资料可展示。 */
const hasCharacterMeta = computed(() => {
  const m = characterMeta.value;
  if (!m) return false;
  return typeof m.anime_count === 'number'
    || typeof m.popularity_score === 'number'
    || typeof m.comprehensive_popularity === 'number';
});

const processedAnimeNames = computed(() => {
    if (props.cardType !== 'character' || !props.card) return [];
    const charCard = props.card as CharacterCard;
    if (!charCard.anime_names) return [];
    
    return charCard.anime_names.map((name: string) => {
        const animeCard = gameDataStore.allAnimeCards.find((c: AnimeCard) => c.name === name);
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
      class="bg-elevated p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col text-ink"
    >
      <div class="flex-shrink-0 flex justify-between items-start mb-4">
        <h2 class="text-2xl font-bold">{{ card.name }}</h2>
        <button @click="closeModal" class="text-2xl text-ink-2 hover:text-ink">&times;</button>
      </div>

      <div class="flex-grow overflow-y-auto pr-4 -mr-4">
        <div class="flex flex-col md:flex-row gap-6">
          <!-- Left side: Image -->
          <div class="md:w-1/3 flex-shrink-0">
            <img loading="lazy" decoding="async" :src="card.image_path" class="w-full rounded-md shadow-lg" :alt="card.name">
            <div class="mt-4 text-center">
                <span 
                    class="font-bold px-3 py-1 rounded-full text-white"
                    :class="cardRarityConfig.c?.includes('from') ? `bg-gradient-to-r ${cardRarityConfig.c}` : cardRarityConfig.c || 'bg-gray-500'"
                >
                    {{ card.rarity }}
                </span>
            </div>
            <div class="mt-2 text-center text-sm text-ink-2">
                拥有数量: <span class="font-bold">{{ count }}</span>
            </div>
          </div>

          <!-- Right side: Details -->
          <div class="md:w-2/3">
            <div v-if="card.description" class="prose max-w-none">
              <h3 class="font-bold text-lg mb-2">简介</h3>
              <p class="text-sm whitespace-pre-wrap">{{ card.description }}</p>
            </div>

            <!-- E2-T2: 番剧资料（Bangumi 真实元数据，缺失字段不显示该行） -->
            <div v-if="hasAnimeMeta || hasCharacterMeta" class="mt-4 border-t pt-4">
              <h3 class="font-bold text-lg mb-2">番剧资料</h3>
              <!-- Anime 真实评分 / 排名 / 放送年 -->
              <div v-if="cardType === 'anime' && animeMeta" class="text-sm space-y-2">
                <div v-if="typeof animeMeta.rating_score === 'number'">
                  <strong>Bangumi 评分:</strong>
                  <span class="font-semibold text-accent">{{ animeMeta.rating_score }}</span>
                  <span v-if="typeof animeMeta.rating_total === 'number'" class="text-ink-2"> · {{ animeMeta.rating_total }} 人评分</span>
                </div>
                <div v-if="typeof animeMeta.rating_rank === 'number'">
                  <strong>排名:</strong> <span class="font-semibold text-ink">#{{ animeMeta.rating_rank }}</span>
                </div>
                <div v-if="releaseYear">
                  <strong>放送年:</strong> <span class="font-semibold text-ink">{{ releaseYear }}</span>
                </div>
              </div>
              <!-- Character 登场作品数 / 人气 -->
              <div v-if="cardType === 'character' && characterMeta" class="text-sm space-y-2">
                <div v-if="typeof characterMeta.anime_count === 'number'">
                  <strong>登场作品数:</strong> <span class="font-semibold text-ink">{{ characterMeta.anime_count }}</span>
                </div>
                <div v-if="typeof characterMeta.popularity_score === 'number'">
                  <strong>人气值:</strong> <span class="font-semibold text-accent">{{ characterMeta.popularity_score }}</span>
                </div>
                <div v-if="typeof characterMeta.comprehensive_popularity === 'number'">
                  <strong>综合人气:</strong> <span class="font-semibold text-ink">{{ characterMeta.comprehensive_popularity }}</span>
                </div>
              </div>
            </div>

            <!-- NEW: Battle Information Section -->
            <div class="mt-4 border-t pt-4">
              <h3 class="font-bold text-lg mb-2">战斗信息</h3>
              <!-- Anime Card Battle Info -->
              <div v-if="cardType === 'anime'" class="text-sm space-y-2">
                <div><strong>TP 消耗:</strong> <span class="font-semibold text-blue-600">{{ (card as AnimeCard).cost }}</span></div>
                <div v-if="(card as AnimeCard).effectDescription"><strong>效果:</strong> <span class="italic">{{ (card as AnimeCard).effectDescription }}</span></div>
                <div v-if="animeEffectsDescriptions.length" class="mt-2">
                  <strong>卡面效果:</strong>
                  <ul class="mt-2 space-y-2">
                    <li v-for="line in animeEffectsDescriptions" :key="line"
                        class="px-3 py-2 rounded-md border text-sm"
                        :class="[
                          'bg-gradient-to-r from-accent/10 to-info/10',
                          'border-accent/50',
                          'text-ink'
                        ]"
                    >
                      <span class="inline-block mr-2 px-2 py-0.5 rounded bg-accent text-on-accent text-xs">效果</span>
                      <span class="font-medium">{{ line }}</span>
                    </li>
                  </ul>
                </div>
              </div>
              <!-- Character Card Battle Info -->
              <div v-if="cardType === 'character'" class="space-y-4">
                <div v-if="activeSkill" class="p-3 bg-danger/10 rounded-lg">
                  <h4 class="font-bold text-danger">主动技能: {{ activeSkill.name }}
                    <span v-if="!isSkillImplemented(activeSkill)" class="badge-unimplemented" title="该技能尚未实装：当前不产生实际效果（S8 实装中）">⚠️ 未实装</span>
                  </h4>
                  <p class="text-xs text-ink-2 mt-1">[消耗: {{ activeSkill.cost || 0 }} TP] [冷却: {{ activeSkill.cooldown || 0 }} 回合]</p>
                  <p class="text-sm mt-2">{{ activeSkill.description }}</p>
                  <div v-if="activeSkill.effectId" class="mt-2">
                    <ul class="mt-1">
                      <li class="px-3 py-2 rounded-md border text-sm"
                          :class="[
                            'bg-gradient-to-r from-danger/10 to-warning/10',
                            'border-danger/50',
                            'text-ink'
                          ]"
                      >
                        <span class="inline-block mr-2 px-2 py-0.5 rounded bg-danger text-white text-xs">技能</span>
                        <span class="font-medium">{{ getEffectText(activeSkill.effectId) }}</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div v-if="passiveSkill" class="p-3 bg-accent-soft rounded-lg">
                  <h4 class="font-bold text-accent">被动光环: {{ passiveSkill.name }}
                    <span v-if="!isSkillImplemented(passiveSkill)" class="badge-unimplemented" title="该技能尚未实装：当前不产生实际效果（S8 实装中）">⚠️ 未实装</span>
                  </h4>
                  <p class="text-sm mt-2">{{ passiveSkill.description }}</p>
                  <div v-if="passiveSkill.effectId" class="mt-2">
                    <ul class="mt-1">
                      <li class="px-3 py-2 rounded-md border text-sm"
                          :class="[
                            'bg-gradient-to-r from-accent/10 to-info/10',
                            'border-accent/50',
                            'text-ink'
                          ]"
                      >
                        <span class="inline-block mr-2 px-2 py-0.5 rounded bg-accent text-on-accent text-xs">光环</span>
                        <span class="font-medium">{{ getEffectText(passiveSkill.effectId) }}</span>
                      </li>
                    </ul>
                  </div>
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

            <div v-if="cardType === 'character' && (card as CharacterCard)?.anime_names && (card as CharacterCard)?.anime_names?.length" class="mt-4 border-t pt-4">
              <h3 class="font-bold text-lg mb-2">登场作品</h3>
              <div class="flex flex-wrap gap-2">
                <span v-for="anime in processedAnimeNames" :key="anime.name"
                  class="text-xs font-semibold px-2.5 py-1 rounded-full"
                  :class="anime.isOwned ? 'bg-green-100 text-green-800' : 'bg-surface-2 text-ink-2'"
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
          <p class="text-sm text-ink-2 mb-3">分解一张多余的 [{{card.rarity}}] {{ card.name }} 可获得 <span class="font-bold text-emerald-600">{{ dismantleValue }}</span> 知识点。</p>
          <button @click="handleDismantle" class="bg-danger text-white font-bold py-2 px-4 rounded-lg hover:opacity-85 text-sm">
              分解一张
          </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.badge-unimplemented {
  @apply ml-1 align-middle text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/40;
}
</style>
