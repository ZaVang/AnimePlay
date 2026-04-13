<script setup lang="ts">
/**
 * Character Selector - Personnel Uplink Interface
 */
import { ref, computed } from 'vue';
import { useCollectionStore } from '@/stores/modules/collectionStore';
import { useNurtureStore } from '@/stores/modules/nurtureStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import type { CharacterCard } from '@/types/card';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';
import RarityTag from '@/components/ui/RarityTag.vue';

const props = defineProps<{
  selectedCharacterId: number | null;
}>();

const emit = defineEmits<{
  select: [characterId: number];
}>();

const collectionStore = useCollectionStore();
const nurtureStore = useNurtureStore();
const gameDataStore = useGameDataStore();
const isModalOpen = ref(false);

const availableCharacters = computed(() => {
  const rarityOrder: Record<string, number> = {
    'UR': 6, 'HR': 5, 'SSR': 4, 'SR': 3, 'R': 2, 'N': 1
  };

  return Array.from(collectionStore.characterCollection.entries())
    .map(([id, data]) => {
      const character = gameDataStore.getCharacterCardById(id);
      if (!character) return null;
      const nurtureData = nurtureStore.getNurtureData(id);
      return { ...character, count: data.count, nurtureData };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const rarityDiff = (rarityOrder[b!.rarity] || 0) - (rarityOrder[a!.rarity] || 0);
      if (rarityDiff !== 0) return rarityDiff;
      return (b!.nurtureData.affection || 0) - (a!.nurtureData.affection || 0);
    }) as (CharacterCard & { count: number; nurtureData: any })[];
});

const currentCharacter = computed(() => {
  if (!props.selectedCharacterId) return null;
  return availableCharacters.value.find(c => c.id === props.selectedCharacterId) || null;
});

function getBondLevel(affection: number) {
  if (affection >= 1000) return { level: 'ETERNAL', color: 'text-hazard-rose', icon: '◈' };
  if (affection >= 800) return { level: 'DESTINY', color: 'text-hazard-rose/80', icon: '◇' };
  if (affection >= 600) return { level: 'SYNERGY', color: 'text-gold', icon: '◆' };
  if (affection >= 400) return { level: 'TRUST', color: 'text-blue-400', icon: '△' };
  if (affection >= 200) return { level: 'BOND', color: 'text-green-400', icon: '▽' };
  return { level: 'INITIAL', color: 'text-industrial-500', icon: '○' };
}

function handleSelect(characterId: number) {
  emit('select', characterId);
  isModalOpen.value = false;
}
</script>

<template>
  <div class="character-selector-container">
    <!-- Trigger Button -->
    <button 
      @click="isModalOpen = true"
      class="group relative flex items-center gap-4 bg-white/[0.02] border border-white/5 px-4 py-2 transition-all hover:bg-white/[0.05] hover:border-gold/30"
    >
      <div v-if="currentCharacter" class="flex items-center gap-3">
        <div class="w-8 h-8 overflow-hidden border border-white/10 skew-x-[-12deg]">
          <img :src="currentCharacter.image_path" class="w-full h-full object-cover scale-125" @error="($event.target as HTMLImageElement).src = '/data/images/character/77.jpg'">
        </div>
        <div class="text-left">
          <div class="text-[10px] font-display font-black text-white uppercase">{{ currentCharacter.name }}</div>
          <div class="text-[8px] font-display text-gold uppercase tracking-widest">LV.{{ currentCharacter.nurtureData.level }} // SYNC: {{ currentCharacter.nurtureData.affection }}</div>
        </div>
      </div>
      <div v-else class="flex items-center gap-2">
        <span class="text-gold opacity-40">⊕</span>
        <span class="text-[10px] font-display font-bold text-industrial-500 uppercase tracking-widest">Select Subject</span>
      </div>
      <div class="w-px h-4 bg-white/10 mx-2"></div>
      <span class="text-[8px] font-display text-gold group-hover:translate-x-1 transition-transform">>>></span>
    </button>

    <!-- Modal -->
    <div v-if="isModalOpen" class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 quantic-reveal" @click.self="isModalOpen = false">
      <GlassPanel class="max-w-4xl w-full border-gold/20 shadow-2xl">
        <template #header>
          <div class="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
            <div class="space-y-1">
              <h2 class="text-[10px] font-display font-bold text-hazard-rose tracking-[0.4em] uppercase opacity-70">Neural Uplink</h2>
              <h2 class="text-2xl font-display font-black text-white uppercase tracking-tighter">Personnel Selection</h2>
            </div>
            <TacticalButton variant="secondary" size="xs" @click="isModalOpen = false">ABORT</TacticalButton>
          </div>
        </template>
        
        <div class="max-h-[60vh] overflow-y-auto pr-4 scrollbar-none">
          <div v-if="availableCharacters.length === 0" class="py-24 text-center space-y-4">
            <div class="text-6xl opacity-10">🧬</div>
            <p class="text-[10px] font-display font-bold text-industrial-500 uppercase tracking-widest">No accessible personnel data found.</p>
          </div>

          <div v-else class="space-y-8">
            <div class="text-[8px] font-display font-bold text-industrial-500 uppercase tracking-[0.2em]">Available Subjects: {{ availableCharacters.length }}</div>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              <div 
                v-for="character in availableCharacters" 
                :key="character.id"
                class="nurture-card-v2 group relative bg-black/40 border border-white/5 p-3 transition-all cursor-pointer hover:border-hazard-rose/30 hover:bg-white/[0.02]"
                :class="{ 'ring-1 ring-hazard-rose/40': selectedCharacterId === character.id }"
                @click="handleSelect(character.id)"
              >
                <!-- Portrait -->
                <div class="aspect-[2/3] overflow-hidden mb-3 relative border border-white/5">
                  <img :src="character.image_path" class="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-500" loading="lazy">
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  <div class="absolute top-2 right-2">
                    <RarityTag :rarity="character.rarity" />
                  </div>
                </div>

                <!-- Info -->
                <div class="space-y-1">
                  <div class="text-[10px] font-display font-bold text-white uppercase tracking-tight truncate border-b border-white/5 pb-1">{{ character.name }}</div>
                  <div class="flex justify-between items-center text-[8px] font-mono">
                    <span class="text-gold">LV.{{ character.nurtureData.level }}</span>
                    <span :class="getBondLevel(character.nurtureData.affection).color">{{ getBondLevel(character.nurtureData.affection).level }}</span>
                  </div>
                </div>

                <!-- Selected Indicator -->
                <div v-if="selectedCharacterId === character.id" class="absolute -top-1 -right-1 w-3 h-3 bg-hazard-rose rounded-full shadow-[0_0_8px_#E51E5D]"></div>
              </div>
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  </div>
</template>

<style scoped>
.character-selector-container {
  display: inline-block;
}
.nurture-card-v2 {
  clip-path: polygon(0 0, 100% 0, 100% 90%, 90% 100%, 0 100%);
}
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
.text-hazard-rose { color: #E51E5D; }
</style>