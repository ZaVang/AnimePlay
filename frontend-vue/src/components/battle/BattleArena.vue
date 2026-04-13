<script setup lang="ts">
/**
 * Battle Arena - Holographic Engagement Overlay Standard
 */
import { computed } from 'vue';
import type { CharacterCard } from '@/types/card';
import type { BattleStats } from '@/utils/battleCalculator';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

interface SquadMember {
  character: CharacterCard;
  battleStats: BattleStats;
  currentHP: number;
  maxHP: number;
  isDefeated: boolean;
  position: number;
}

interface Props {
  playerSquad: SquadMember[];
  enemySquad: SquadMember[];
  battleLog: string[];
  currentTurn: number;
  isPlayerTurn: boolean;
}

interface Emits {
  (e: 'executeRound'): void;
  (e: 'autoFinish'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

function getHPPercentage(member: SquadMember): number {
  return (member.currentHP / member.maxHP) * 100;
}

const reversedBattleLog = computed(() => props.battleLog.slice().reverse());
</script>

<template>
  <div class="battle-arena-slate space-y-6 font-ui h-full flex flex-col">
    <!-- Main Combat Theater -->
    <GlassPanel :reveal="false" class="combat-theater flex-grow border-white/5 bg-black/20">
      <template #header>
        <div class="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
           <div class="space-y-1">
             <div class="text-[8px] font-display font-bold text-gold tracking-[0.4em] uppercase opacity-70">Operational Cycle</div>
             <div class="text-xl font-display font-black text-white uppercase tracking-tighter">Cycle-{{ String(currentTurn + 1).padStart(2, '0') }}</div>
           </div>
           
           <div class="text-right">
             <div class="text-[8px] font-display font-bold tracking-[0.3em] uppercase opacity-60" :class="isPlayerTurn ? 'text-cyan-400' : 'text-clinical-danger'">Active Protocol</div>
             <div class="text-xs font-display font-bold uppercase tracking-widest" :class="isPlayerTurn ? 'text-cyan-400' : 'text-clinical-danger'">
               {{ isPlayerTurn ? 'Friendly Unit Turn' : 'Hostile Unit Turn' }}
             </div>
           </div>
        </div>
      </template>

      <!-- Combatants Grid -->
      <div class="grid grid-cols-2 gap-12 h-full content-start">
        <!-- Player Side -->
        <div class="space-y-4">
           <div class="flex items-center gap-3 mb-2">
             <div class="w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_#22D3EE]"></div>
             <h3 class="text-[9px] font-display font-bold text-cyan-400/80 tracking-[0.3em] uppercase">Friendly Deployment</h3>
           </div>
           
           <div class="space-y-3">
             <div
               v-for="(member, index) in playerSquad"
               :key="member.character.id"
               class="engagement-frame relative flex items-center gap-4 p-3 border transition-all duration-300"
               :class="[
                 index === 0 && !member.isDefeated ? 'bg-cyan-400/[0.08] border-cyan-400/30 ring-1 ring-cyan-400/10' : 'bg-black/40 border-white/5',
                 member.isDefeated ? 'opacity-40 grayscale pointer-events-none' : ''
               ]"
             >
               <!-- Portrait -->
               <div class="relative w-12 h-12 flex-shrink-0">
                  <div class="absolute inset-0 border border-white/10 overflow-hidden skew-x-[-12deg]">
                    <img 
                      :src="member.character.image_path" 
                      class="w-full h-full object-cover grayscale-[0.5] scale-125"
                      @error="($event.target as HTMLImageElement).src = '/data/images/character/77.jpg'"
                    >
                  </div>
                  <div v-if="member.isDefeated" class="absolute inset-0 flex items-center justify-center text-clinical-danger text-xl">💀</div>
               </div>

               <!-- Subject Data -->
               <div class="flex-1 space-y-2">
                  <div class="flex justify-between items-end">
                    <span class="text-[10px] font-display font-black text-white uppercase tracking-tight">{{ member.character.name }}</span>
                    <span class="text-[8px] font-mono text-industrial-500 tabular-nums">{{ member.currentHP }} / {{ member.maxHP }}</span>
                  </div>
                  <div class="h-1 bg-white/5 overflow-hidden">
                    <div 
                      class="h-full transition-all duration-1000"
                      :class="member.isDefeated ? 'bg-clinical-danger' : 'bg-green-400'"
                      :style="{ width: `${getHPPercentage(member)}%` }"
                    ></div>
                  </div>
               </div>
             </div>
           </div>
        </div>

        <!-- Enemy Side -->
        <div class="space-y-4">
           <div class="flex items-center gap-3 mb-2 justify-end text-right">
             <h3 class="text-[9px] font-display font-bold text-clinical-danger tracking-[0.3em] uppercase">Hostile Presence</h3>
             <div class="w-1 h-1 bg-clinical-danger rounded-full shadow-[0_0_8px_#FF4D4D]"></div>
           </div>
           
           <div class="space-y-3">
             <div
               v-for="(member, index) in enemySquad"
               :key="member.character.id"
               class="engagement-frame relative flex flex-row-reverse items-center gap-4 p-3 border transition-all duration-300"
               :class="[
                 index === 0 && !member.isDefeated ? 'bg-clinical-danger/[0.08] border-clinical-danger/30 ring-1 ring-clinical-danger/10' : 'bg-black/40 border-white/5',
                 member.isDefeated ? 'opacity-40 grayscale pointer-events-none' : ''
               ]"
             >
               <!-- Portrait -->
               <div class="relative w-12 h-12 flex-shrink-0">
                  <div class="absolute inset-0 border border-white/10 overflow-hidden skew-x-[12deg]">
                    <img 
                      :src="member.character.image_path" 
                      class="w-full h-full object-cover grayscale-[0.5] scale-125"
                      @error="($event.target as HTMLImageElement).src = '/data/images/character/77.jpg'"
                    >
                  </div>
                  <div v-if="member.isDefeated" class="absolute inset-0 flex items-center justify-center text-clinical-danger text-xl">💀</div>
               </div>

               <!-- Subject Data -->
               <div class="flex-1 space-y-2 text-right">
                  <div class="flex flex-row-reverse justify-between items-end">
                    <span class="text-[10px] font-display font-black text-white uppercase tracking-tight">{{ member.character.name }}</span>
                    <span class="text-[8px] font-mono text-industrial-500 tabular-nums">{{ member.currentHP }} / {{ member.maxHP }}</span>
                  </div>
                  <div class="h-1 bg-white/5 overflow-hidden">
                    <div 
                      class="h-full bg-clinical-danger transition-all duration-1000 float-right"
                      :style="{ width: `${getHPPercentage(member)}%` }"
                    ></div>
                  </div>
               </div>
             </div>
           </div>
        </div>
      </div>

      <!-- Command Console -->
      <div v-if="isPlayerTurn" class="mt-12 flex justify-center gap-6">
         <TacticalButton variant="primary" size="md" class="min-w-[160px]" @click="emit('executeRound')">EXECUTE LOGIC</TacticalButton>
         <TacticalButton variant="secondary" size="md" class="min-w-[160px]" @click="emit('autoFinish')">INSTANT WIN</TacticalButton>
      </div>
    </GlassPanel>

    <!-- Signal Log (Battle Log) -->
    <GlassPanel :reveal="false" class="h-40 border-white/5 bg-black/40">
       <template #header>
         <h3 class="text-[8px] font-display font-bold text-industrial-500 tracking-[0.4em] uppercase mb-4 flex items-center gap-2">
            <span class="w-1 h-1 bg-gold animate-pulse rounded-full"></span>
            Signal Stream
         </h3>
       </template>
       <div class="font-mono text-[10px] h-24 overflow-y-auto space-y-1 pr-4 scrollbar-none">
          <div
            v-for="(log, index) in reversedBattleLog"
            :key="index"
            class="text-industrial-400 p-1 border-l border-white/5 pl-4 hover:bg-white/5 transition-colors"
          >
            <span class="text-gold/40 mr-2">[{{ String(battleLog.length - index).padStart(3, '0') }}]</span>
            {{ log }}
          </div>
       </div>
    </GlassPanel>
  </div>
</template>

<style scoped>
.engagement-frame {
  clip-path: polygon(4% 0, 100% 0, 100% 100%, 0 100%, 0 15%);
}
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
.text-clinical-danger { color: #FF4D4D; }
.bg-clinical-danger { background-color: #FF4D4D; }
</style>
