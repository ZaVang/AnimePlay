<script setup lang="ts">
import { ref, watch } from 'vue';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

interface Props {
  isVisible: boolean;
  availableTypes: string[];
  title: string;
  description?: string;
  allowCancel?: boolean;
  typeDescriptions?: Record<string, string>;
}

const props = withDefaults(defineProps<Props>(), {
  allowCancel: true,
  typeDescriptions: () => ({})
});

const emit = defineEmits<{
  select: [type: string];
  cancel: [];
  close: [];
}>();

const selectedType = ref<string | null>(null);

const defaultTypeDescriptions: Record<string, string> = {
  '科幻': 'FUTURE_SYNC // 高科技全息投影与数字主权',
  '战斗': 'COMBAT_LINK // 极致的物理碰撞与战术博弈',
  '恋爱': 'NEURAL_SYNC // 神经层面的情感共振与同步',
  '日常': 'LIFE_CYCLE // 平凡时空中的语义碎片',
  '校园': 'ACADEMIC_GRID // 青春记忆的逻辑矩阵',
  '音乐': 'SONIC_WAVE // 调频共振与听觉中枢干预',
  '奇幻': 'MYSTIC_PROTOCOL // 逻辑之外的魔法代码与奇迹',
  '运动': 'KINETIC_FLOW // 物理极限的突破与竞技意志'
};

function getTypeDescription(type: string): string {
  return props.typeDescriptions[type] || defaultTypeDescriptions[type] || 'UNDEFINED_PROTOCOL';
}

function selectType(type: string) {
  selectedType.value = type;
}

function confirm() {
  if (selectedType.value) {
    emit('select', selectedType.value);
    selectedType.value = null;
    emit('close');
  }
}

function cancel() {
  selectedType.value = null;
  emit('cancel');
  emit('close');
}

// Reset selection on visibility change
watch(() => props.isVisible, (visible) => {
  if (!visible) {
    selectedType.value = null;
  }
});
</script>

<template>
  <div
    v-if="isVisible"
    @click.self="allowCancel ? cancel() : null"
    class="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4 transition-all duration-500"
  >
    <GlassPanel
      class="max-w-md w-full border-white/10 shadow-3xl quantic-reveal"
    >
      <!-- Header -->
      <template #header>
        <div class="mb-8">
           <div class="text-[8px] font-display font-bold text-gold tracking-[0.5em] uppercase opacity-70 mb-1">Semantic Origin Selector</div>
           <h2 class="text-2xl font-display font-black text-white uppercase tracking-tighter">{{ title }}</h2>
           <div v-if="description" class="mt-2 text-xs text-industrial-500 font-ui italic opacity-80 border-l border-gold/40 pl-3">
             {{ description }}
           </div>
        </div>
      </template>

      <!-- Type Options -->
      <div class="space-y-3 max-h-[50vh] overflow-y-auto pr-2 scrollbar-none">
        <button
          v-for="type in availableTypes"
          :key="type"
          @click="selectType(type)"
          :class="[
            'w-full p-4 text-left transition-all duration-300 border relative group overflow-hidden',
            selectedType === type
              ? 'border-gold bg-gold/5'
              : 'border-white/5 bg-black/40 hover:border-white/20'
          ]"
        >
          <!-- Active Glow -->
          <div v-if="selectedType === type" class="absolute inset-0 bg-gold/5 animate-pulse pointer-events-none"></div>
          
          <div class="flex items-center justify-between relative z-10">
            <span class="font-display font-black text-xs uppercase tracking-widest" :class="selectedType === type ? 'text-gold' : 'text-white/80'">{{ type }}</span>
            <div 
              class="w-4 h-4 border flex items-center justify-center transition-colors"
              :class="selectedType === type ? 'border-gold bg-gold' : 'border-white/10'"
            >
              <span v-if="selectedType === type" class="text-black text-[10px] font-black">✓</span>
            </div>
          </div>
          <p class="text-[9px] font-mono mt-2 uppercase tracking-tighter" :class="selectedType === type ? 'text-gold/70' : 'text-industrial-500'">
            {{ getTypeDescription(type) }}
          </p>

          <!-- Hover Surge Decoration -->
          <div class="absolute bottom-0 right-0 p-1 opacity-0 group-hover:opacity-10 pointer-events-none">
             <div class="text-xl font-black italic">LINK</div>
          </div>
        </button>

        <div v-if="availableTypes.length === 0" class="flex flex-col items-center justify-center py-12 opacity-30">
           <div class="text-[10px] font-display font-bold text-industrial-600 uppercase tracking-[0.5em]">SIGNAL_LOST</div>
        </div>
      </div>

      <!-- Footer -->
      <template #footer>
        <div class="flex justify-between items-center gap-4 mt-8 pt-6 border-t border-white/5">
          <TacticalButton
            v-if="allowCancel"
            variant="ghost"
            size="md"
            @click="cancel"
          >
            ABORT
          </TacticalButton>
          <div v-else></div>
          
          <TacticalButton
            variant="primary"
            size="lg"
            :disabled="!selectedType"
            @click="confirm"
          >
            EXECUTE_SELECTION
          </TacticalButton>
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