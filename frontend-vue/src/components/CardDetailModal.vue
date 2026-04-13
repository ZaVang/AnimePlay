<script setup lang="ts">
import { computed, ref } from 'vue';
import { useCollectionStore } from '@/stores/modules/collectionStore';
import { useEconomyStore } from '@/stores/modules/economyStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { GAME_CONFIG } from '@/config/gameConfig';
import type { Card, AnimeCard, CharacterCard } from '@/types/card';
import type { Skill } from '@/types/skill';
import { getEffectText, getTriggerText } from '@/skills';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';
import RarityTag from '@/components/ui/RarityTag.vue';

const props = defineProps<{
  card: Card | null;
  cardType: 'anime' | 'character';
  count: number;
}>();

const emit = defineEmits(['close']);
const collectionStore = useCollectionStore();
const economyStore = useEconomyStore();
const gameDataStore = useGameDataStore();

const cardRarityConfig = computed(() => {
    if (!props.card) return {};
    const config = props.cardType === 'anime' ? GAME_CONFIG.animeSystem : GAME_CONFIG.characterSystem;
    return config.rarityConfig[props.card.rarity] || {};
});

const dismantleValue = computed(() => {
    return (cardRarityConfig.value as any)?.dismantleValue ?? 0;
});

const activeSkill = computed<Skill | undefined>(() => {
  if (props.cardType === 'character' && props.card) {
    const charCard = props.card as CharacterCard;
    return gameDataStore.getSkillById(charCard.activeSkillId);
  }
  return undefined;
});

const passiveSkill = computed<Skill | undefined>(() => {
  if (props.cardType === 'character' && props.card) {
    const charCard = props.card as CharacterCard;
    return gameDataStore.getSkillById(charCard.passiveSkillId);
  }
  return undefined;
});

const animeEffectsDescriptions = computed(() => {
  if (props.cardType !== 'anime' || !props.card) return [] as string[];
  const anime = props.card as AnimeCard;
  return (anime.effects || []).map(e => {
    const t = getTriggerText(e.trigger);
    const desc = getEffectText(e.effectId);
    return `${t}：${desc}`;
  });
});

const processedAnimeNames = computed(() => {
    if (props.cardType !== 'character' || !props.card || !(props.card as CharacterCard).anime_names) return [];

    return (props.card as CharacterCard).anime_names?.map(name => {
        const animeCard = gameDataStore.allAnimeCards.find(c => c.name === name);
        const isOwned = animeCard ? collectionStore.animeCollection.has(animeCard.id) : false;
        return { name, isOwned };
    }) || [];
});

function closeModal() {
  emit('close');
}

function handleDismantle() {
    if (props.card) {
        // Simple confirm for now, in future replace with a TacticalConfirm
        if (confirm(`确定要分解一张 [${props.card.rarity}] ${props.card.name} 吗？\n你将获得 ${dismantleValue.value} 知识点。`)) {
            economyStore.dismantleCard(props.card.id, props.cardType);
            closeModal();
        }
    }
}
</script>

<template>
  <div 
    v-if="card" 
    @click="closeModal"
    class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-opacity duration-500"
  >
    <GlassPanel 
      @click.stop 
      class="max-w-3xl w-full border-white/10 shadow-3xl quantic-reveal"
    >
      <template #header>
        <div class="flex justify-between items-center mb-6">
          <div class="space-y-1">
             <div class="text-[8px] font-display font-bold text-gold tracking-[0.4em] uppercase opacity-70">Information Protocol</div>
             <h2 class="text-3xl font-display font-black text-white uppercase tracking-tighter">{{ card.name }}</h2>
          </div>
          <TacticalButton variant="ghost" size="sm" @click="closeModal">CLOSE_UPLINK</TacticalButton>
        </div>
      </template>

      <div class="h-[70vh] overflow-y-auto pr-4 scrollbar-none">
        <div class="flex flex-col md:flex-row gap-8">
          <!-- Left side: Tactical Visual -->
          <div class="md:w-2/5 flex-shrink-0 space-y-4">
            <div class="relative group aspect-[3/4] overflow-hidden border border-white/5 bg-black/40">
               <img :src="card.image_path" class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" :alt="card.name">
               <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
               <div class="absolute bottom-4 left-4">
                 <RarityTag :rarity="card.rarity" />
               </div>
            </div>
            
            <div class="grid grid-cols-2 gap-2">
               <div class="bg-white/[0.03] border border-white/5 p-3 flex flex-col items-center">
                  <div class="text-[8px] font-display text-industrial-500 uppercase">Owned Unit</div>
                  <div class="text-xl font-display font-black text-white tabular-nums">{{ count }}</div>
               </div>
               <div class="bg-white/[0.03] border border-white/5 p-3 flex flex-col items-center">
                  <div class="text-[8px] font-display text-industrial-500 uppercase">Sync Level</div>
                  <div class="text-xl font-display font-black text-gold tabular-nums">S+</div>
               </div>
            </div>
          </div>

          <!-- Right side: Data Stream -->
          <div class="md:w-3/5 space-y-6">
            <div v-if="card.description" class="space-y-2">
              <h3 class="text-[10px] font-display font-bold text-gold/60 tracking-widest uppercase border-l-2 border-gold pl-4">Bio-Logic Brief</h3>
              <p class="text-xs text-industrial-200 leading-relaxed font-ui italic opacity-80">{{ card.description }}</p>
            </div>

            <!-- Battle Information Section -->
            <div class="space-y-4">
              <h3 class="text-[10px] font-display font-bold text-gold/60 tracking-widest uppercase border-l-2 border-gold pl-4">Combat Analytics</h3>
              
              <!-- Anime Card Battle Info -->
              <div v-if="cardType === 'anime'" class="space-y-4">
                <div class="flex items-center gap-6 bg-white/[0.02] border border-white/5 p-4 justify-around">
                   <div class="text-center">
                      <div class="text-[8px] font-display text-industrial-500 uppercase">Tactical Cost</div>
                      <div class="text-2xl font-display font-black text-blue-400 tabular-nums">{{ (card as AnimeCard).cost }} TP</div>
                   </div>
                   <div class="w-px h-8 bg-white/10"></div>
                   <div class="text-center">
                      <div class="text-[8px] font-display text-industrial-500 uppercase">Effect Class</div>
                      <div class="text-2xl font-display font-black text-white uppercase">{{ card.rarity === 'UR' ? 'OMEGA' : 'STABLE' }}</div>
                   </div>
                </div>

                <div v-if="animeEffectsDescriptions.length" class="space-y-2">
                   <div v-for="line in animeEffectsDescriptions" :key="line" 
                        class="p-3 bg-indigo-500/5 border border-indigo-500/20 text-indigo-200 text-xs font-mono relative overflow-hidden group">
                     <div class="absolute inset-y-0 left-0 w-1 bg-indigo-500"></div>
                     <span class="opacity-100 flex items-center gap-2">
                        <span class="text-indigo-400 font-bold tracking-widest">[EFFECT]</span> {{ line }}
                     </span>
                   </div>
                </div>
              </div>

              <!-- Character Card Battle Info -->
              <div v-if="cardType === 'character'" class="space-y-4">
                <!-- Active Skill -->
                <div v-if="activeSkill" class="p-4 bg-rose-500/5 border border-rose-500/20 relative group">
                  <div class="absolute top-0 right-0 p-2 text-[8px] font-display font-bold text-rose-400/40 uppercase">Active_Link</div>
                  <h4 class="text-sm font-display font-black text-rose-400 uppercase tracking-tight mb-1">{{ activeSkill.name }}</h4>
                  <div class="flex gap-4 text-[9px] font-mono text-industrial-400 uppercase mb-3">
                    <span class="flex items-center gap-1"><span class="w-1 h-1 bg-rose-400/40"></span> COST: {{ activeSkill.cost || 0 }} TP</span>
                    <span class="flex items-center gap-1"><span class="w-1 h-1 bg-rose-400/40"></span> COOLDOWN: {{ activeSkill.cooldown || 0 }} RND</span>
                  </div>
                  <p class="text-xs text-industrial-100 opacity-70 leading-relaxed mb-3">{{ activeSkill.description }}</p>
                  <div v-if="activeSkill.effectId" class="inline-block px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[9px] font-bold tracking-widest uppercase">
                    PRODUCED_OUTPUT: {{ getEffectText(activeSkill.effectId) }}
                  </div>
                </div>

                <!-- Passive Skill -->
                <div v-if="passiveSkill" class="p-4 bg-indigo-500/5 border border-indigo-500/20 relative group">
                  <div class="absolute top-0 right-0 p-2 text-[8px] font-display font-bold text-indigo-400/40 uppercase">Passive_Aura</div>
                  <h4 class="text-sm font-display font-black text-indigo-400 uppercase tracking-tight mb-1">{{ passiveSkill.name }}</h4>
                  <p class="text-xs text-industrial-100 opacity-70 leading-relaxed mb-3">{{ passiveSkill.description }}</p>
                  <div v-if="passiveSkill.effectId" class="inline-block px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[9px] font-bold tracking-widest uppercase">
                    SYSTEM_LINK: {{ getEffectText(passiveSkill.effectId) }}
                  </div>
                </div>
              </div>
            </div>

            <div v-if="card.synergy_tags && card.synergy_tags.length" class="space-y-2">
                <h3 class="text-[10px] font-display font-bold text-gold/60 tracking-widest uppercase border-l-2 border-gold pl-4">Semantic Identifiers</h3>
                <div class="flex flex-wrap gap-2">
                    <span v-for="tag in card.synergy_tags" :key="tag" class="px-3 py-1 bg-white/5 border border-white/5 text-[9px] font-display font-bold text-industrial-300 uppercase tracking-widest hover:border-gold/30 hover:text-gold transition-all">
                        #{{ tag }}
                    </span>
                </div>
            </div>

            <div v-if="cardType === 'character' && processedAnimeNames.length" class="space-y-2">
              <h3 class="text-[10px] font-display font-bold text-gold/60 tracking-widest uppercase border-l-2 border-gold pl-4">Registry Origin</h3>
              <div class="flex flex-wrap gap-2">
                <span v-for="anime in processedAnimeNames" :key="anime.name"
                  class="text-[9px] font-display font-bold px-3 py-1 border transition-colors uppercase tracking-tight"
                  :class="anime.isOwned ? 'border-gold/40 text-gold bg-gold/5' : 'border-white/5 text-industrial-600'"
                >
                  {{ anime.name }} {{ anime.isOwned ? '[SYNCED]' : '[RESTRICTED]' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Footer Actions -->
      <template #footer>
        <div v-if="count > 1" class="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
           <div class="space-y-1">
              <div class="text-[8px] font-display font-bold text-clinical-danger tracking-widest uppercase opacity-60">Scrap Protocol</div>
              <div class="text-xs text-industrial-500 uppercase">Extract <span class="text-gold font-bold">{{ dismantleValue }}</span> KB Data from redundant unit</div>
           </div>
           <TacticalButton variant="danger" size="md" @click="handleDismantle">EXECUTE_DISMANTLE</TacticalButton>
        </div>
        <div v-else class="mt-8 pt-6 border-t border-white/5 text-center">
            <div class="text-[8px] font-display font-bold text-industrial-700 tracking-[0.5em] uppercase">Security Clearance: Personnel Confirmed</div>
        </div>
      </template>
    </GlassPanel>
  </div>
</template>

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>
