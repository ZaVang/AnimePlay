<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/modules/authStore';
import { useCollectionStore } from '@/stores/modules/collectionStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import type { CharacterCard } from '@/types/card';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';
import RarityTag from '@/components/ui/RarityTag.vue';

const props = defineProps<{
  isOpen: boolean;
  position: number; // 0-3
  currentCharacterId?: number; 
  usedCharacterIds?: number[]; 
}>();

const emit = defineEmits<{
  close: [];
  select: [characterId: number, position: number];
  remove: [position: number];
}>();

const authStore = useAuthStore();
const collectionStore = useCollectionStore();
const gameDataStore = useGameDataStore();

const searchKeyword = ref('');

const availableCharacters = computed(() => {
  if (!authStore.isLoggedIn) return [];

  return Array.from(collectionStore.characterCollection.entries())
    .map(([id, data]) => ({
      id,
      count: data.count,
      character: gameDataStore.getCharacterCardById(id)
    }))
    .filter(item => item.character && item.count > 0)
    .map(item => ({
      ...item.character!,
      count: item.count
    }))
    .filter(character => {
      if (searchKeyword.value) {
        const matchesSearch = character.name.toLowerCase().includes(searchKeyword.value.toLowerCase());
        if (!matchesSearch) return false;
      }
      if (props.usedCharacterIds && props.usedCharacterIds.length > 0) {
        return !props.usedCharacterIds.includes(character.id) || character.id === props.currentCharacterId;
      }
      return true;
    })
    .sort((a, b) => {
      const rarityOrder = { 'UR': 6, 'HR': 5, 'SSR': 4, 'SR': 3, 'R': 2, 'N': 1 };
      return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
    });
});

function selectCharacter(character: CharacterCard) {
  if (props.usedCharacterIds && 
      props.usedCharacterIds.includes(character.id) && 
      character.id !== props.currentCharacterId) {
    return; 
  }
  emit('select', character.id, props.position);
  closeModal();
}

function removeCharacter() {
  emit('remove', props.position);
  closeModal();
}

function closeModal() {
  searchKeyword.value = '';
  emit('close');
}
</script>

<template>
  <div 
    v-if="isOpen"
    class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-500"
    @click.self="closeModal"
  >
    <GlassPanel class="max-w-4xl w-full border-white/10 shadow-3xl quantic-reveal overflow-hidden">
      <template #header>
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
           <div class="space-y-1">
              <div class="text-[8px] font-display font-bold text-gold tracking-[0.5em] uppercase opacity-70">Unit Deployment Protocol</div>
              <h2 class="text-3xl font-display font-black text-white uppercase tracking-tighter">
                Personnel Selection // Slot_{{ position + 1 }}
              </h2>
           </div>
           
           <!-- Search Logic -->
           <div class="relative w-full md:w-64 group">
             <input
               v-model="searchKeyword"
               placeholder="IDENTIFY_NAME..."
               class="w-full pl-4 pr-10 py-2 bg-white/5 border border-white/10 text-[10px] font-display text-white outline-none focus:border-gold/50 transition-all uppercase tracking-widest"
             />
             <div class="absolute right-3 top-2.5 text-industrial-500 group-focus-within:text-gold transition-colors">◈</div>
           </div>
        </div>

        <!-- Current Active Slot Profile -->
        <div v-if="currentCharacterId" class="mb-6 p-4 bg-gold/5 border-l-2 border-gold flex items-center justify-between">
           <div class="flex items-center gap-4">
              <div class="w-16 h-16 border border-gold/20 overflow-hidden relative">
                 <img 
                   :src="gameDataStore.getCharacterCardById(currentCharacterId)?.image_path"
                   class="w-full h-full object-cover object-top"
                 >
                 <div class="absolute inset-0 bg-gradient-to-t from-gold/20 to-transparent"></div>
              </div>
              <div class="space-y-1">
                 <div class="text-[8px] font-display font-bold text-gold uppercase tracking-widest opacity-60">Current_Deployment</div>
                 <div class="text-lg font-display font-black text-white uppercase">{{ gameDataStore.getCharacterCardById(currentCharacterId)?.name }}</div>
                 <div class="text-[9px] font-mono text-gold/40">READY_FOR_ENGAGEMENT</div>
              </div>
           </div>
           <TacticalButton variant="danger" size="sm" @click="removeCharacter">TERMINATE_UPLINK</TacticalButton>
        </div>
      </template>

      <!-- Selection Grid -->
      <div class="h-[50vh] overflow-y-auto pr-2 scrollbar-none">
        <div v-if="availableCharacters.length === 0" class="flex flex-col items-center justify-center h-full py-12 text-center">
           <div class="text-[10px] font-display font-bold text-industrial-600 uppercase tracking-[0.5em] mb-4">
             {{ searchKeyword ? 'SIGNAL_NOT_FOUND' : 'COLLECTION_EMPTY' }}
           </div>
           <TacticalButton v-if="!searchKeyword" variant="primary" size="md" @click="$router.push('/gacha')">INDUCT_NEW_PERSONNEL</TacticalButton>
        </div>
        
        <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <div 
            v-for="character in availableCharacters"
            :key="character.id"
            @click="selectCharacter(character)"
            class="group relative cursor-pointer border transition-all duration-300 overflow-hidden"
            :class="[
              character.id === currentCharacterId ? 'border-gold bg-gold/5 scale-95' : 'border-white/5 bg-black/40 hover:border-gold/30',
              usedCharacterIds?.includes(character.id) && character.id !== currentCharacterId ? 'opacity-30 grayscale cursor-not-allowed border-clinical-danger/20' : ''
            ]"
          >
            <!-- Background Decoration -->
            <div class="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-30 transition-opacity">
               <div class="text-xl font-display font-black">UN_{{ character.id }}</div>
            </div>

            <div class="aspect-[3/4] relative">
              <img 
                :src="character.image_path"
                class="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
              >
              
              <!-- Gradient Overlay -->
              <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
              
              <!-- Selection Icons -->
              <div v-if="character.id === currentCharacterId" class="absolute top-1 right-1 w-5 h-5 bg-gold flex items-center justify-center">
                 <span class="text-black text-[10px] font-black">✓</span>
              </div>
              <div v-else-if="usedCharacterIds?.includes(character.id)" class="absolute top-1 right-1 w-5 h-5 bg-clinical-danger flex items-center justify-center shadow-lg">
                 <span class="text-white text-[8px] font-black italic">!</span>
              </div>
              
              <div v-if="character.count > 1" class="absolute top-1 left-1 px-1.5 py-0.5 bg-blue-500/80 text-[8px] font-display font-bold text-white uppercase tracking-tighter">
                DUPx{{ character.count }}
              </div>
              
              <!-- Info Strip -->
              <div class="absolute bottom-0 left-0 right-0 p-2 space-y-1">
                 <div class="text-[9px] font-display font-black text-white uppercase truncate text-center group-hover:text-gold transition-colors">{{ character.name }}</div>
                 <div class="flex justify-center">
                    <RarityTag :rarity="character.rarity" size="sm" />
                 </div>
              </div>
            </div>
            
            <!-- Surge effect on hover -->
            <div class="absolute inset-0 border border-gold opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity"></div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="mt-6 pt-6 border-t border-white/5 flex justify-between items-center text-[8px] font-display font-bold text-industrial-600 uppercase tracking-widest">
           <div>UPLINK_STATUS: STABLE</div>
           <div>PERSONNEL_COUNT: {{ availableCharacters.length }}</div>
        </div>
      </template>
    </GlassPanel>
  </div>
</template>

<style scoped>
.shadow-3xl {
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.9);
}
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>