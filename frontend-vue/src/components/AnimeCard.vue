<script setup lang="ts">
import { computed } from 'vue';
import { GAME_CONFIG } from '@/config/gameConfig';
import { useCollectionStore } from '@/stores/modules/collectionStore';
import { useGameStore, usePlayerStore } from '@/stores/battle';
import { CostCalculator } from '@/core/calculation/CostCalculator';
import { SkillSystem } from '@/core/systems/SkillSystem';
import type { AnimeCard } from '@/types/card';

const props = defineProps<{
  anime: AnimeCard;
  count?: number;
  isNew?: boolean;
  isDuplicate?: boolean;
  isInDeck?: boolean;
  showCost?: boolean; // New prop to control cost visibility
  showStrength?: boolean; // New prop to control strength visibility
  playerId?: 'playerA' | 'playerB'; // New prop for cost calculation
}>();

const collectionStore = useCollectionStore();
const gameStore = useGameStore();
const playerStore = usePlayerStore();

const rarityData = computed(() => GAME_CONFIG.animeSystem.rarityConfig[props.anime.rarity] || {});
const rarityColorClass = computed(() => rarityData.value.c || 'bg-gray-500');
const rarityEffectClass = computed(() => rarityData.value.effect || '');
const isFavorite = computed(() => collectionStore.isFavorite(props.anime.id, 'anime'));

// 获取卡牌的基础强度（优先使用points字段，回退到稀有度默认值）
const baseStrength = computed(() => {
  // 直接使用卡牌的points字段作为强度
  if (props.anime.points !== undefined) {
    return props.anime.points;
  }

  // 如果没有points字段，按稀有度提供默认值（仅作为后备）
  const rarityStrength = {
    'UR': 10,
    'HR': 8,
    'SSR': 6,
    'SR': 4,
    'R': 3,
    'N': 2
  };
  return rarityStrength[props.anime.rarity as keyof typeof rarityStrength] || 2;
});

// 计算强度信息（包含被动技能加成）
const strengthInfo = computed(() => {
  const base = baseStrength.value;

  // 只在战斗状态下且有playerId时计算强度加成
  if (props.playerId && gameStore) {
    try {
      const auraBonus = SkillSystem.getAuraStrengthBonus(props.anime, props.playerId);
      const finalStrength = base + auraBonus;

      return {
        baseStrength: base,
        finalStrength,
        bonus: auraBonus,
        hasBonus: auraBonus > 0
      };
    } catch {
      // 如果计算失败，返回基础强度
      return {
        baseStrength: base,
        finalStrength: base,
        bonus: 0,
        hasBonus: false
      };
    }
  }

  return {
    baseStrength: base,
    finalStrength: base,
    bonus: 0,
    hasBonus: false
  };
});

// 计算卡牌费用（考虑减免效果）
const costInfo = computed(() => {
  const baseCost = props.anime.cost || 0;

  // 只在战斗状态下计算费用修改
  if (props.playerId && gameStore) {
    try {
      return CostCalculator.getCostModification(props.anime, props.playerId);
    } catch {
      // 如果计算失败，返回基础费用
      return {
        baseCost,
        finalCost: baseCost,
        reduction: 0,
        hasModification: false
      };
    }
  }

  return {
    baseCost,
    finalCost: baseCost,
    reduction: 0,
    hasModification: false
  };
});

function onImageError(event: Event) {
  const target = event.target as HTMLImageElement;
  const placeholderText = encodeURIComponent('动画图片');
  target.src = `https://placehold.co/240x360/e2e8f0/334155?text=${placeholderText}`;
}

function toggleFavorite(event: MouseEvent) {
  event.stopPropagation();
  collectionStore.toggleFavorite(props.anime.id, 'anime');
}
</script>

<template>
  <div
    class="card bg-industrial-800 border border-industrial-700 hover:border-clinical-warning transition-all duration-300 cursor-pointer group relative datapad-reveal"
    :class="[
        rarityEffectClass,
        { 'opacity-50 grayscale': isInDeck },
        'clip-chamfer-sm'
    ]"
    :data-item-id="anime.id"
    data-item-type="动画"
  >
    <!-- Tactical Cost Tag -->
    <div v-if="anime.cost > 0 && showCost" 
         class="absolute top-0 left-0 z-20 bg-industrial-900 border-b border-r border-industrial-700 px-3 py-1 font-mono font-bold text-clinical-warning clip-chamfer-sm"
         :class="{ 'border-clinical-warning animate-pulse': costInfo.hasModification }">
      <div v-if="!costInfo.hasModification" class="text-lg">{{ costInfo.finalCost }}</div>
      <div v-else class="flex flex-col items-start leading-none">
        <span class="text-[10px] line-through opacity-50">{{ costInfo.baseCost }}</span>
        <span class="text-sm font-black">{{ costInfo.finalCost }}</span>
      </div>
    </div>

    <div class="relative overflow-hidden">
      <img
        :src="anime.image_path"
        class="w-full aspect-[2/3] object-cover object-top opacity-80 group-hover:opacity-100 transition-opacity duration-500"
        @error="onImageError"
      />
      
      <!-- Scanline Overlay on Image -->
      <div class="absolute inset-0 bg-scanline pointer-events-none opacity-10"></div>

      <!-- Favorite Star (Tactical Style) -->
      <div 
        @click="toggleFavorite"
        class="absolute top-2 right-10 w-8 h-8 flex items-center justify-center cursor-pointer rounded-none hover:bg-industrial-700/50 transition-colors z-30"
        :title="isFavorite ? '取消喜爱' : '设为喜爱'"
      >
        <svg v-if="isFavorite" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-clinical-warning">
          <path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.007z" clip-rule="evenodd" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-industrial-300 group-hover:text-clinical-warning">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.31h5.418a.562.562 0 01.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-3.355a.563.563 0 00-.586 0L6.982 21.03a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988h5.418a.563.563 0 00.475-.31L11.48 3.5z" />
        </svg>
      </div>

      <div
        class="absolute top-0 right-0 px-3 py-1 text-[10px] font-mono font-bold text-industrial-900 bg-industrial-100 clip-chamfer-sm"
        :class="[
          rarityColorClass,
          rarityColorClass.includes('from') ? 'bg-gradient-to-r' : ''
        ]"
      >
        {{ anime.rarity }}
      </div>
      
      <div
        v-if="count && count > 1"
        class="absolute bottom-2 right-2 bg-industrial-900 border border-industrial-600 text-industrial-100 text-[10px] font-mono font-bold px-2 py-0.5"
      >
        x{{ count }}
      </div>
      
      <div v-if="isDuplicate" class="absolute inset-0 bg-industrial-900/80 flex items-center justify-center text-center p-1 font-mono">
        <span class="text-clinical-warning font-bold text-3xl tracking-tighter">DATA_REDUNDANT</span>
      </div>
      <div v-if="isNew" class="absolute top-10 left-0 bg-clinical-warning text-industrial-900 text-[10px] font-bold px-2 py-0.5 clip-chamfer-sm z-10">
        NEW_ENTRY
      </div>
    </div>
    
    <div class="px-3 py-2 bg-industrial-900/50 border-t border-industrial-700">
      <p class="text-[11px] font-mono font-bold truncate text-industrial-100 uppercase tracking-wider" :title="anime.name">
        {{ anime.name }}
      </p>
      
      <!-- Strength display (Tactical Grid Style) -->
      <div v-if="showStrength" class="flex justify-between items-center mt-2 pt-2 border-t border-industrial-800/50 font-mono text-[10px]">
        <div class="flex items-center gap-2">
          <span class="text-industrial-600">STR:</span>
          <span v-if="!strengthInfo.hasBonus" class="text-clinical-blue font-bold">{{ strengthInfo.finalStrength }}</span>
          <span v-else class="text-clinical-warning font-bold flex items-center gap-1">
            {{ strengthInfo.finalStrength }}
            <span class="text-[8px] opacity-70">({{ strengthInfo.baseStrength }}+{{ strengthInfo.bonus }})</span>
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-industrial-600">TP:</span>
          <span class="text-industrial-100">{{ costInfo.finalCost }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px -10px rgba(0, 0, 0, 0.5);
}

/* 稀有度光效增强 */
.rarity-ur { box-shadow: inset 0 0 15px rgba(239, 68, 68, 0.2); }
.rarity-ssr { box-shadow: inset 0 0 15px rgba(250, 204, 21, 0.1); }

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 10px rgba(34, 197, 94, 0.2);
  }
  50% {
    box-shadow: 0 0 20px rgba(34, 197, 94, 0.4);
  }
}
</style>

