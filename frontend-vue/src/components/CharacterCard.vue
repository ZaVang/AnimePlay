<script setup lang="ts">
import { computed } from 'vue';
import { GAME_CONFIG } from '@/config/gameConfig';
import { useUserStore } from '@/stores/userStore';

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

const userStore = useUserStore();

const rarityData = computed(() => GAME_CONFIG.characterSystem.rarityConfig[props.character.rarity] || {});
const rarityColorClass = computed(() => rarityData.value.c || 'bg-gray-500');
const rarityEffectClass = computed(() => rarityData.value.effect || '');
const isFavorite = computed(() => userStore.isFavorite(props.character.id, 'character'));

// 处理图片加载失败
function onImageError(event: Event) {
  const target = event.target as HTMLImageElement;
  const placeholderText = encodeURIComponent('角色头像');
  target.src = `https://placehold.co/240x360/e2e8f0/334155?text=${placeholderText}`;
}

function toggleFavorite(event: MouseEvent) {
  event.stopPropagation(); // 阻止事件冒泡到父元素
  userStore.toggleFavorite(props.character.id, 'character');
}
</script>

<template>
  <div
    class="card bg-white rounded-lg shadow-md overflow-hidden cursor-pointer group relative"
    :class="[
        rarityEffectClass,
        { 'opacity-50 grayscale': isInDeck }
    ]"
    :data-item-id="character.id"
    data-item-type="角色"
  >
    <div class="relative">
      <img
        :src="character.image_path"
        class="w-full aspect-[2/3] object-contain"
        @error="onImageError"
      />
      
      <!-- Favorite Star -->
      <div 
        @click="toggleFavorite"
        class="absolute top-1 left-1 w-7 h-7 flex items-center justify-center cursor-pointer rounded-full hover:bg-black/20 transition-colors"
        :title="isFavorite ? '取消喜爱' : '设为喜爱'"
      >
        <svg v-if="isFavorite" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-yellow-400 drop-shadow-lg">
          <path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.007z" clip-rule="evenodd" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-white text-opacity-80 group-hover:text-yellow-300 drop-shadow-md" style="filter: drop-shadow(0 0 2px rgba(0,0,0,0.7));">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.31h5.418a.562.562 0 01.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-3.355a.563.563 0 00-.586 0L6.982 21.03a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988h5.418a.563.563 0 00.475-.31L11.48 3.5z" />
        </svg>
      </div>
      
      <div
        class="absolute top-1 right-1 px-2 py-0.5 text-xs font-bold text-white rounded-bl-lg rounded-tr-lg"
        :class="[
          rarityColorClass,
          rarityColorClass.includes('from') ? 'bg-gradient-to-r' : ''
        ]"
      >
        {{ character.rarity }}
      </div>
      
      <!-- 数量角标 -->
      <div
        v-if="count && count > 1"
        class="absolute bottom-1 right-1 bg-pink-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
      >
        x{{ count }}
      </div>
      
      <!-- 新卡片/重复卡片提示 -->
      <div v-if="isDuplicate" class="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center text-center p-1">
        <span class="text-white font-bold text-2xl">+1</span>
      </div>
      <div v-if="isNew" class="absolute top-1 left-1 bg-green-500 text-white text-xs font-bold px-1 rounded">
        NEW
      </div>
    </div>
    
    <div class="p-2">
      <p class="text-xs text-center font-bold truncate text-gray-900" :title="character.name">{{ character.name }}</p>
      <p v-if="character.anime_count" class="text-xs text-center text-gray-500 mt-1">
        {{ character.anime_count }}部作品
      </p>
    </div>
  </div>
</template>

<style scoped>
/* 这里可以放一些这个组件独有的样式，如果需要的话 */
/* 我们旧的 CSS 效果是从全局 style 标签里来的，后续可以移到这里 */
</style>
