<script setup lang="ts">
import { computed } from 'vue';
import { usePlayerStore } from '@/stores/battle';
import { SkillSystem } from '@/core/systems/SkillSystem';
import type { Card, Skill } from '@/types';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';
import RarityTag from '@/components/ui/RarityTag.vue';

const props = defineProps<{
  character: Card;
  playerId: 'playerA' | 'playerB';
  isMainDebater: boolean;
  isVisible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'useSkill', skill: Skill): void;
  (e: 'rotate'): void;
}>();

const playerStore = usePlayerStore();

// Check if character can rotate
const canRotate = computed(() => {
  return playerStore.canRotateCharacter(props.playerId);
});
</script>

<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[1000] p-4 transition-all duration-500" @click.self="emit('close')">
    <GlassPanel class="max-w-2xl w-full border-white/10 shadow-3xl quantic-reveal overflow-hidden">
      <!-- Tactical Header -->
      <template #header>
        <div class="flex justify-between items-center mb-8">
           <div class="space-y-1">
              <div class="text-[8px] font-display font-bold text-gold tracking-[0.5em] uppercase opacity-70">Personnel Uplink Protocol</div>
              <h2 class="text-3xl font-display font-black text-white uppercase tracking-tighter">
                {{ isMainDebater ? 'COMMAND_ACTIVE // 主辩手指令' : 'STANDBY_SUPPORT // 备选支援' }}
              </h2>
           </div>
           <TacticalButton variant="ghost" size="sm" @click="emit('close')">DISCONNECT</TacticalButton>
        </div>
      </template>

      <!-- Character Profile Section -->
      <div class="flex flex-col md:flex-row gap-8 mb-8">
        <div class="w-full md:w-40 aspect-[3/4] flex-shrink-0 border border-white/10 bg-black/40 relative group overflow-hidden">
          <img :src="character.image_path" :alt="character.name" class="w-full h-full object-cover object-top transition-transform duration-1000 group-hover:scale-110">
          <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
          <div class="absolute bottom-2 left-2">
             <RarityTag :rarity="character.rarity" size="sm" />
          </div>
        </div>
        
        <div class="flex-1 space-y-4">
          <div class="space-y-1">
             <h3 class="text-2xl font-display font-black text-white uppercase tracking-tighter">{{ character.name }}</h3>
             <div class="text-[10px] font-mono text-gold/60 uppercase tracking-widest">{{ character.anime_names?.[0] || 'REGISTRY_UNKNOWN' }}</div>
          </div>
          <p class="text-xs text-industrial-300 leading-relaxed font-ui italic border-l-2 border-gold/30 pl-4 opacity-70">{{ character.description }}</p>
        </div>
      </div>

      <!-- Skills Section -->
      <div class="space-y-4">
        <h4 class="text-[10px] font-display font-bold text-gold/60 tracking-widest uppercase border-b border-white/5 pb-2">Integrated_Skills // 战术技能</h4>
        <div v-if="!character.skills || character.skills.length === 0" class="text-industrial-600 text-[10px] italic py-4">NO_SKILLS_MAPPED</div>
        <div v-else class="space-y-3">
          <div v-for="skill in character.skills" :key="skill.id" 
               class="p-4 bg-white/[0.02] border relative group transition-all"
               :class="skill.type === '被动光环' ? 'border-indigo-500/20' : 'border-gold/20'">
            <div class="absolute top-0 right-0 p-2 text-[7px] font-mono text-industrial-500 uppercase">{{ skill.type === '被动光环' ? 'PASSIVE_RESONANCE' : 'ACTIVE_BURST' }}</div>
            
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
               <div class="flex items-center gap-3">
                  <span class="w-1.5 h-1.5" :class="skill.type === '被动光环' ? 'bg-indigo-400' : 'bg-gold'"></span>
                  <span class="text-sm font-display font-black text-white uppercase tracking-tight">{{ skill.name }}</span>
               </div>
               
               <div v-if="skill.type === '主动技能'" class="flex items-center gap-4 text-[9px] font-mono text-industrial-400">
                  <span>COST: {{ skill.cost || 0 }} TP</span>
                  <span>COOLDOWN: {{ skill.cooldown || 0 }} RND</span>
               </div>
            </div>

            <p class="text-xs text-industrial-200 opacity-60 leading-relaxed mb-4 pl-4">{{ skill.description }}</p>
            
            <div v-if="skill.type === '主动技能' && isMainDebater" class="flex justify-end">
               <TacticalButton
                size="sm"
                :disabled="!SkillSystem.canUseSkill(playerId, skill)"
                @click="emit('useSkill', skill)"
               >
                EXECUTE_SKILL
               </TacticalButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Actions: Rotation Control -->
      <template #footer>
        <div class="mt-8 pt-6 border-t border-white/5" v-if="!isMainDebater">
           <TacticalButton 
             block
             variant="primary"
             size="lg"
             @click="emit('rotate')" 
             :disabled="!canRotate"
           >
             <div class="flex flex-col items-center">
                <span>ROTATE_TO_MAIN_POSITION // 切换为主辩手</span>
                <span v-if="!canRotate" class="text-[8px] opacity-60 tracking-[0.2em] font-mono">PROTOCOL_ON_COOLDOWN</span>
             </div>
           </TacticalButton>
        </div>
        <div v-else class="mt-8 pt-6 border-t border-white/5 flex justify-between items-center opacity-40">
           <div class="text-[8px] font-display font-bold text-industrial-500 uppercase tracking-widest">Operator Clearance Confirmed</div>
           <div class="text-[8px] font-mono text-gold italic">UPLINK_STABLE</div>
        </div>
      </template>
    </GlassPanel>
  </div>
</template>

<style scoped>
.shadow-3xl {
  box-shadow: 0 0 50px rgba(0, 0, 0, 0.9);
}
</style>
