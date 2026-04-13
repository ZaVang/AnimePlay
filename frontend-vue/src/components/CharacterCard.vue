<script setup lang="ts">
import { computed } from 'vue';
import { GAME_CONFIG } from '@/config/gameConfig';
import { useCollectionStore } from '@/stores/modules/collectionStore';

// 定义组件接收的 props
// 我们假设会传入一个包含角色所有信息的对象
const props = defineProps<{
  character: {
    id: number;
    name: string;
    rarity: 'N' | 'R' | 'SR' | 'SSR' | 'HR' | 'UR';
    image_path: string;
    anime_count?: number;
    // ... 其他未来可能用到的属性
  };
  count?: number; // 卡片数量，可选
  isNew?: boolean; // 是否是新卡片，可选
  isDuplicate?: boolean; // 是否是重复卡片，可选
  isInDeck?: boolean; // 是否已在卡组中，可选
}>();

const collectionStore = useCollectionStore();

const rarityData = computed(() => GAME_CONFIG.characterSystem.rarityConfig[props.character.rarity] || {});
const rarityColorClass = computed(() => rarityData.value.c || 'bg-industrial-600');
const rarityEffectClass = computed(() => rarityData.value.effect || '');
const isFavorite = computed(() => collectionStore.isFavorite(props.character.id, 'character'));

// 处理图片加载失败
function onImageError(event: Event) {
  const target = event.target as HTMLImageElement;
  const placeholderText = encodeURIComponent('角色头像');
  target.src = `https://placehold.co/240x360/e2e8f0/334155?text=${placeholderText}`;
}

function toggleFavorite(event: MouseEvent) {
  event.stopPropagation(); // 阻止事件冒泡到父元素
  collectionStore.toggleFavorite(props.character.id, 'character');
}
</script>

<template>
  <div
    class="card bg-industrial-800 border border-industrial-700 hover:border-clinical-blue transition-all duration-300 cursor-pointer group relative datapad-reveal"
    :class="[
        rarityEffectClass,
        { 'opacity-50 grayscale': isInDeck },
        'clip-chamfer-sm'
    ]"
    :data-item-id="character.id"
    data-item-type="角色"
  >
    <div class="relative overflow-hidden">
      <img
        :src="character.image_path"
        class="w-full aspect-[2/3] object-cover object-top opacity-80 group-hover:opacity-100 transition-opacity duration-500"
        @error="onImageError"
      />
      
      <!-- Scanline Overlay on Image -->
      <div class="absolute inset-0 bg-scanline pointer-events-none opacity-10"></div>

      <!-- Favorite Star (Tactical Style) -->
      <div 
        @click="toggleFavorite"
        class="absolute top-2 left-2 w-8 h-8 flex items-center justify-center cursor-pointer rounded-none hover:bg-industrial-700/50 transition-colors z-30"
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
        {{ character.rarity }}
      </div>
      
      <!-- 数量角标 (Tactical Style) -->
      <div
        v-if="count && count > 1"
        class="absolute bottom-2 right-2 bg-industrial-900 border border-industrial-600 text-clinical-blue text-[10px] font-mono font-bold px-2 py-0.5"
      >
        STAFF.x{{ count }}
      </div>
      
      <!-- 新卡片/重复卡片提示 -->
      <div v-if="isDuplicate" class="absolute inset-0 bg-industrial-900/80 flex items-center justify-center text-center p-1 font-mono">
        <span class="text-clinical-blue font-bold text-2xl tracking-tighter">DATA_OVERLAP</span>
      </div>
      <div v-if="isNew" class="absolute top-10 left-0 bg-clinical-blue text-industrial-900 text-[10px] font-bold px-2 py-0.5 clip-chamfer-sm z-10">
        NEW_PROFILE
      </div>
    </div>
    
    <div class="px-3 py-2 bg-industrial-900/50 border-t border-industrial-700">
      <p class="text-[11px] font-mono font-bold truncate text-industrial-100 uppercase tracking-tighter" :title="character.name">
        {{ character.name }}
      </p>
      <p v-if="character.anime_count" class="text-[9px] font-mono text-industrial-400 mt-1 flex items-center gap-1">
        <span class="w-1.5 h-1.5 bg-industrial-600 inline-block"></span>
        RECORDS: {{ String(character.anime_count).padStart(2, '0') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.card {
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.card:hover {
  transform: scale(1.02);
  box-shadow: 0 0 15px rgba(56, 189, 248, 0.2);
}

/* 稀有度光效增强 */
.rarity-ur { box-shadow: inset 0 0 15px rgba(239, 68, 68, 0.2); }
.rarity-ssr { box-shadow: inset 0 0 15px rgba(250, 204, 21, 0.1); }
</style>


<style scoped>
/* 这里可以放一些这个组件独有的样式，如果需要的话 */
/* 我们旧的 CSS 效果是从全局 style 标签里来的，后续可以移到这里 */
</style>
