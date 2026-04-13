<script setup lang="ts">
import { computed } from 'vue';

type Rarity = 'UR' | 'HR' | 'SSR' | 'SR' | 'R' | 'N';

interface Props {
  rarity: Rarity | string;
  outline?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  outline: false
});

const rarityStyles = computed(() => {
  const r = props.rarity.toUpperCase();
  switch (r) {
    case 'UR': return 'bg-rarity-ur text-black font-black border-gold/50 shadow-gold/20';
    case 'HR': return 'bg-rarity-hr text-white font-bold border-clinical-danger/30';
    case 'SSR': return 'bg-rarity-ssr text-black font-bold border-gold/30';
    case 'SR': return 'bg-rarity-sr text-white border-industrial-400/30';
    case 'R': return 'bg-rarity-r text-white border-industrial-500/30';
    case 'N': return 'bg-rarity-n text-industrial-300 border-white/5';
    default: return 'bg-surface text-white border-white/10';
  }
});
</script>

<template>
  <div
    :class="[
      'rarity-tag px-2 py-0.5 text-[9px] tracking-tighter uppercase inline-flex items-center justify-center border transition-all duration-300',
      rarityStyles
    ]"
  >
    {{ rarity }}
  </div>
</template>

<style scoped>
.rarity-tag {
  font-family: 'JetBrains Mono', monospace;
  clip-path: polygon(10% 0%, 100% 0%, 100% 70%, 90% 100%, 0% 100%, 0% 30%);
}

/* ATL Utility Backgrounds (These should ideally be in tailwind.config or main.css, but mapping here for now) */
.bg-rarity-ur { background: linear-gradient(135deg, #FFB700 0%, #D4A574 50%, #F0C987 100%); }
.bg-rarity-hr { background: linear-gradient(135deg, #E51E5D 0%, #902142 100%); }
.bg-rarity-ssr { background: linear-gradient(135deg, #D4A574 0%, #8E92B2 100%); }
.bg-rarity-sr { background: linear-gradient(135deg, #48C5F4 0%, #0077A9 100%); }
.bg-rarity-r { background: linear-gradient(135deg, #8E92B2 0%, #4A4D62 100%); }
.bg-rarity-n { background: rgba(142, 146, 178, 0.1); }
</style>
