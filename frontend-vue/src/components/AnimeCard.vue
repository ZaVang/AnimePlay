<script setup lang="ts">
import { computed } from 'vue';
import type { Rarity } from '@/stores/gameDataStore';

// 定义组件接收的 props
const props = defineProps<{
  anime: {
    id: number;
    name: string;
    rarity: Rarity;
    image_path: string;
    // ... 其他未来可能用到的属性
  };
  count?: number; // 卡片数量，可选
  isNew?: boolean; // 是否是新卡片，可选
  isDuplicate?: boolean; // 是否是重复卡片，可选
}>();

const rarityConfig: Record<string, { c: string; effect?: string }> = {
    'N': { c: 'bg-gray-400' },
    'R': { c: 'bg-blue-500' },
    'SR': { c: 'bg-purple-600' },
    'SSR': { c: 'bg-yellow-500', effect: 'popular-sparkle' },
    'HR': { c: 'bg-pink-500', effect: 'masterpiece-shine' },
    'UR': { c: 'from-amber-400 to-red-500', effect: 'legendary-glow' }
};

const rarityData = computed(() => rarityConfig[props.anime.rarity] || {});
const rarityColorClass = computed(() => rarityData.value.c || 'bg-gray-500');
const rarityEffectClass = computed(() => rarityData.value.effect || '');

function onImageError(event: Event) {
  const target = event.target as HTMLImageElement;
  const placeholderText = encodeURIComponent('动画图片');
  target.src = `https://placehold.co/240x360/e2e8f0/334155?text=${placeholderText}`;
}
</script>

<template>
  <div
    class="card bg-white rounded-lg shadow-md overflow-hidden cursor-pointer group relative"
    :class="rarityEffectClass"
    :data-item-id="anime.id"
    data-item-type="动画"
  >
    <div class="relative">
      <img
        :src="anime.image_path"
        class="w-full aspect-[2/3] object-contain"
        @error="onImageError"
      />
      <div
        class="absolute top-1 right-1 px-2 py-0.5 text-xs font-bold text-white rounded-bl-lg rounded-tr-lg"
        :class="[
          rarityColorClass,
          rarityColorClass.includes('from') ? 'bg-gradient-to-r' : ''
        ]"
      >
        {{ anime.rarity }}
      </div>
      
      <div
        v-if="count && count > 1"
        class="absolute bottom-1 right-1 bg-indigo-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
      >
        x{{ count }}
      </div>
      
      <div v-if="isDuplicate" class="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center text-center p-1">
        <span class="text-white font-bold text-2xl">+1</span>
      </div>
      <div v-if="isNew" class="absolute top-1 left-1 bg-green-500 text-white text-xs font-bold px-1 rounded">
        NEW
      </div>
    </div>
    
    <div class="p-2">
      <p class="text-xs text-center font-bold truncate" :title="anime.name">{{ anime.name }}</p>
    </div>
  </div>
</template>
