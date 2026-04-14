<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/modules/authStore';
import { useNurtureStore } from '@/stores/modules/nurtureStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import type { CharacterCard } from '@/types/card';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';
import CharacterCardComponent from '@/components/CharacterCard.vue';

const authStore = useAuthStore();
const nurtureStore = useNurtureStore();
const gameDataStore = useGameDataStore();

const selectedCharacterId = ref<number | null>(null);

const ownedCharacters = computed(() => {
  return Array.from(nurtureStore.characterNurtureData.keys())
    .map(id => gameDataStore.getCharacterCardById(id))
    .filter(Boolean) as CharacterCard[];
});

const selectedCharacter = computed(() => {
  if (selectedCharacterId.value === null) return null;
  return gameDataStore.getCharacterCardById(selectedCharacterId.value);
});

const selectedCharacterMeta = computed(() => {
  if (selectedCharacterId.value === null) return null;
  return nurtureStore.getNurtureData(selectedCharacterId.value);
});

function selectCharacter(id: number) {
  selectedCharacterId.value = id;
}

onMounted(() => {
  if (ownedCharacters.value.length > 0 && !selectedCharacterId.value) {
    selectedCharacterId.value = ownedCharacters.value[0].id;
  }
});
</script>

<template>
  <div class="nurture-terminal p-8 md:p-12 space-y-12 quantic-reveal h-full overflow-y-auto font-ui">
    <!-- Header: Personnel Strategic Tuning -->
    <header class="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/10 pb-10">
      <div class="space-y-2">
        <div class="flex items-center gap-3">
           <div class="w-1 h-4 bg-gold"></div>
           <h2 class="text-[10px] font-display font-bold text-gold tracking-[0.6em] uppercase opacity-70">人员进化管理系统</h2>
        </div>
        <h1 class="text-5xl font-display font-black tracking-tighter uppercase text-white leading-none">角色同步中心</h1>
        <div class="text-[8px] font-mono text-industrial-300 uppercase tracking-widest mt-2 overflow-hidden">
          权限节点: SECTOR_B3 // 链路状态: 稳定 // 同步协议: APV.1044-N
        </div>
      </div>
      
      <div class="flex items-center gap-6 pb-1">
         <div class="text-right border-r border-white/10 pr-6">
            <span class="block text-[8px] font-display text-industrial-400 uppercase tracking-widest mb-1">同步效率</span>
            <div class="text-xs font-mono text-white opacity-80 uppercase">SYNC_GAIN: 1.25x</div>
         </div>
         <TacticalButton variant="secondary" size="sm">批量同步报告</TacticalButton>
      </div>
    </header>

    <div v-if="!authStore.isLoggedIn" class="py-32 text-center space-y-4">
      <div class="text-4xl opacity-10">🔒</div>
      <p class="text-industrial-400 font-display text-[10px] tracking-[0.4em] uppercase">身份验证生效中 // 数据库已锁定</p>
      <TacticalButton variant="primary" size="sm">同步身份令牌</TacticalButton>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
      <!-- Left: Personnel Manifest -->
      <div class="lg:col-span-4 space-y-6">
         <div class="border-l-2 border-gold/40 pl-4 py-1 flex justify-between items-end">
            <div>
               <h3 class="text-[10px] font-display font-black text-white uppercase tracking-widest">已同步人员名录</h3>
               <p class="text-[7px] font-mono text-industrial-500 uppercase mt-1">
                  当前登记资产: {{ ownedCharacters.length }} / {{ gameDataStore.allCharacterCards.length }}
               </p>
            </div>
         </div>

         <div class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-tactical p-1">
            <div 
               v-for="char in ownedCharacters" 
               :key="char.id"
               @click="selectCharacter(char.id)"
               class="relative aspect-[3/4] cursor-pointer group transition-all duration-500"
               :class="selectedCharacterId === char.id ? 'ring-1 ring-gold ring-offset-4 ring-offset-black scale-[0.95]' : 'opacity-40 hover:opacity-100'"
            >
               <CharacterCardComponent :character="char" :is-in-deck="false" class="pointer-events-none" />
               <div v-if="selectedCharacterId === char.id" class="absolute inset-0 bg-gold/5 pointer-events-none"></div>
            </div>
         </div>
      </div>

      <!-- Right: Tuning Interface -->
      <div class="lg:col-span-8">
         <div v-if="selectedCharacter && selectedCharacterMeta" class="space-y-12 animate-in fade-in slide-in-from-right-8 duration-700">
            <!-- Asset Briefing -->
            <div class="flex items-start gap-10">
               <div class="w-48 aspect-[3/4] border border-white/10 relative overflow-hidden group">
                  <img :src="selectedCharacter.image_path" :alt="selectedCharacter.name" class="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700">
                  <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                  <div class="absolute bottom-2 left-2 text-[10px] font-display font-black text-white uppercase tracking-tighter">{{ selectedCharacter.rarity }}</div>
               </div>
               
               <div class="flex-1 space-y-6">
                  <div class="space-y-2">
                     <h2 class="text-5xl font-display font-black text-white tracking-tighter uppercase leading-none">{{ selectedCharacter.name }}</h2>
                     <p class="text-[10px] font-mono text-industrial-400 uppercase tracking-widest max-w-lg">{{ selectedCharacter.description }}</p>
                  </div>
                  
                  <div class="grid grid-cols-3 gap-8 pt-6 border-t border-white/5">
                     <div class="space-y-1">
                        <span class="text-[8px] font-display font-black text-industrial-500 uppercase tracking-widest">同步能级</span>
                        <div class="text-2xl font-display font-bold text-gold tabular-nums">LV.{{ selectedCharacterMeta.level }}</div>
                     </div>
                     <div class="space-y-1">
                        <span class="text-[8px] font-display font-black text-industrial-500 uppercase tracking-widest">信任振幅</span>
                        <div class="text-2xl font-display font-bold text-white tabular-nums">{{ Math.floor((selectedCharacterMeta.experience / Math.max(1, nurtureStore.getRequiredExpForLevel(selectedCharacterMeta.level))) * 100) || 0 }}%</div>
                     </div>
                     <div class="space-y-1">
                        <span class="text-[8px] font-display font-black text-industrial-500 uppercase tracking-widest">链路状态</span>
                        <div class="text-xs font-display font-black text-clinical-blue uppercase tracking-widest mt-1">NOMINAL</div>
                     </div>
                  </div>
               </div>
            </div>

            <!-- Evolutionary Progression -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
               <GlassPanel :reveal="false" class="border-white/5 bg-white/[0.01] p-8 space-y-8">
                  <div class="flex items-center justify-between border-b border-white/5 pb-4">
                     <h3 class="text-[10px] font-display font-black text-white uppercase tracking-widest">能级提升协议</h3>
                     <span class="text-[8px] font-mono text-industrial-500 uppercase">Cost: 500_Units</span>
                  </div>
                  <div class="space-y-6">
                     <div class="flex justify-between items-end text-[10px] font-display font-bold uppercase">
                        <span class="text-industrial-400">下一步骤同步概率</span>
                        <span class="text-gold">98.5%</span>
                     </div>
                     <div class="h-1 bg-white/5 relative overflow-hidden">
                        <div class="absolute inset-y-0 left-0 bg-gold w-3/4 transition-all duration-1000"></div>
                     </div>
                     <TacticalButton variant="primary" class="w-full" size="md">初始化能级进化</TacticalButton>
                  </div>
               </GlassPanel>

               <GlassPanel :reveal="false" class="border-white/5 bg-white/[0.01] p-8 space-y-8">
                  <div class="flex items-center justify-between border-b border-white/5 pb-4">
                     <h3 class="text-[10px] font-display font-black text-white uppercase tracking-widest">记忆重构协议</h3>
                     <span class="text-[8px] font-mono text-industrial-500 uppercase">Access: GRANTED</span>
                  </div>
                  <div class="space-y-4">
                     <p class="text-[8px] text-industrial-400 font-ui uppercase leading-relaxed tracking-widest">
                        通过介入该角色的核心记忆片段，可以提升其在作战中的协同效率与信任振幅。
                     </p>
                     <TacticalButton variant="secondary" class="w-full" size="md">进入记忆之门</TacticalButton>
                  </div>
               </GlassPanel>
            </div>
         </div>
         
         <div v-else class="h-[600px] border border-dashed border-white/5 flex flex-col items-center justify-center space-y-6 opacity-30">
            <div class="text-5xl">👤</div>
            <p class="text-[10px] font-display font-black text-industrial-500 uppercase tracking-[0.4em]">请选择待同步的人员信号</p>
         </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nurture-terminal {
  box-shadow: inset 0 0 100px rgba(0,0,0,0.8);
}
.scrollbar-tactical::-webkit-scrollbar {
  width: 2px;
}
.scrollbar-tactical::-webkit-scrollbar-track {
  @apply bg-transparent;
}
.scrollbar-tactical::-webkit-scrollbar-thumb {
  @apply bg-white/10 hover:bg-gold/40;
}
</style>