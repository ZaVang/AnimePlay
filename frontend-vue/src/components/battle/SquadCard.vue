<script setup lang="ts">
/**
 * Squad Card - Tactical Unit Manifest Standard
 */
import { computed } from 'vue';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useSquadManager } from '@/composables/useSquadManager';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

interface PresetSquad {
  id: number;
  name: string;
  members: (number | null)[];
}

interface Props {
  squad: PresetSquad;
  currentTowerFloor?: number;
  hasCompletedFloor?: boolean;
  towerEnemyData?: any;
}

interface Emits {
  (e: 'startBattle', squadId: number): void;
  (e: 'openCharacterSelect', squadId: number, position: number): void;
  (e: 'updateName', squadId: number, newName: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const gameDataStore = useGameDataStore();
const { getSquadPower, getSquadMemberCount } = useSquadManager();

const squadPower = computed(() => getSquadPower(props.squad.id));
const memberCount = computed(() => getSquadMemberCount(props.squad.id));

const canStartBattle = computed(() => {
  if (memberCount.value < 4) return false;
  if (props.hasCompletedFloor) return false;
  if (!props.towerEnemyData) return false;
  return true;
});

const buttonText = computed(() => {
  if (memberCount.value === 0) return '需要整备';
  if (memberCount.value < 4) return `尚未就绪_[${memberCount.value}/4]`;
  if (props.hasCompletedFloor) return '区域已清扫';
  if (!props.towerEnemyData) return '等待情报';
  return '立即部署';
});

function handleNameUpdate(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('updateName', props.squad.id, target.value);
}

function openCharacterSelect(position: number) {
  emit('openCharacterSelect', props.squad.id, position);
}

function startBattle() {
  emit('startBattle', props.squad.id);
}

function getCharacterImage(characterId: number | null): string {
  if (!characterId) return '';
  const character = gameDataStore.getCharacterCardById(characterId);
  return character?.image_path || '/data/images/character/default.jpg';
}

function getCharacterName(characterId: number | null): string {
  if (!characterId) return '';
  const character = gameDataStore.getCharacterCardById(characterId);
  return character?.name || '';
}
</script>

<template>
  <GlassPanel :reveal="false" class="squad-unit-manifest group border-white/10 transition-all duration-500 hover:border-gold/40 relative overflow-hidden">
    <!-- Card Metadata -->
    <div class="absolute top-0 right-0 p-2 text-[6px] font-mono text-industrial-700 uppercase tracking-tighter transition-colors group-hover:text-gold/40">
      UID: SQ-{{ String(squad.id).padStart(4, '0') }} // TYPE: TACTICAL_UNIT
    </div>

    <!-- Header Section -->
    <div class="flex items-end justify-between mb-8 p-1">
      <div class="flex-1 mr-4">
        <div class="text-[7px] font-display font-black text-industrial-300 uppercase tracking-widest mb-1">小队标识符</div>
        <input
          :value="squad.name"
          @change="handleNameUpdate"
          class="w-full bg-transparent border-b border-white/10 text-white font-display font-black text-sm p-1 focus:border-gold/60 outline-none tracking-tighter uppercase transition-all"
          maxlength="20"
          placeholder="未命名单元"
        >
      </div>
      <div class="text-right">
        <div class="text-[7px] font-display font-black text-industrial-300 uppercase tracking-widest mb-1">装载进度</div>
        <div class="text-lg font-mono font-bold text-white tabular-nums opacity-60">
          [{{ memberCount }}/4]
        </div>
      </div>
    </div>

    <!-- Member Deployment Grid -->
    <div class="grid grid-cols-4 gap-4 mb-8">
      <div
        v-for="position in 4"
        :key="position"
        @click="openCharacterSelect(position - 1)"
        class="tactical-deployment-slot relative aspect-[4/5] bg-white/[0.02] border border-white/5 cursor-pointer overflow-hidden transition-all duration-500 hover:border-gold/50 hover:bg-white/[0.05]"
        :class="squad.members[position - 1] ? 'border-gold/20' : 'border-dashed border-white/10'"
      >
        <!-- Slot Grid Overlay -->
        <div class="absolute inset-0 bg-grid opacity-5"></div>
        
        <div v-if="squad.members[position - 1]" class="absolute inset-0 slide-in-from-bottom duration-700">
          <img
            :src="getCharacterImage(squad.members[position - 1])"
            :alt="getCharacterName(squad.members[position - 1])"
            class="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-700"
            @error="($event.target as HTMLImageElement).src = '/data/images/character/default.jpg'"
          >
          <!-- Gradient Mask -->
          <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
          
          <!-- Position Tag -->
          <div class="absolute bottom-1 right-2 text-[8px] font-mono font-bold text-gold/60">
            SEC_{{ position }}
          </div>
        </div>
        
        <div v-else class="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <div class="text-white/10 font-thin text-2xl group-hover:text-gold/40 transition-colors">+</div>
          <div class="text-[6px] font-mono text-industrial-600 uppercase tracking-tighter">EMPTY_SLOT</div>
        </div>
      </div>
    </div>

    <!-- Tactical Metrics -->
    <div class="flex justify-between items-center mb-8 px-2 py-4 bg-white/[0.01] border-y border-white/5">
      <div class="space-y-1">
        <span class="text-[8px] font-display font-black text-industrial-300 uppercase tracking-widest block leading-none">综合战力强度</span>
        <span class="text-[7px] font-mono text-industrial-500 uppercase leading-none">身份验证评级</span>
      </div>
      <div class="text-2xl font-display font-black text-gold tabular-nums transition-transform group-hover:scale-105 duration-500">
        {{ squadPower.toLocaleString() }}
      </div>
    </div>

    <!-- Deployment Trigger -->
    <div class="p-1">
       <TacticalButton
         variant="primary"
         class="w-full !rounded-none"
         size="sm"
         :disabled="!canStartBattle"
         @click="startBattle"
       >
         {{ buttonText }}
       </TacticalButton>
    </div>
  </GlassPanel>
</template>

<style scoped>
.tactical-deployment-slot {
  clip-path: polygon(0 0, 100% 0, 100% 85%, 85% 100%, 0 100%);
}
.squad-unit-manifest:hover {
  transform: translateY(-4px);
  box-shadow: 0 15px 30px -15px rgba(212, 165, 116, 0.15);
}
.bg-grid {
  background-size: 15px 15px;
  background-image: 
    linear-gradient(to right, rgba(212, 165, 116, 0.1) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(212, 165, 116, 0.1) 1px, transparent 1px);
}
</style>
