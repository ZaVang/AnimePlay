<script setup lang="ts">
import { computed } from 'vue';
import { GAME_CONFIG } from '@/config/gameConfig';

const props = defineProps<{
  gachaType: 'anime' | 'character';
  show: boolean;
}>();

const emit = defineEmits(['close']);

const title = computed(() => 
  props.gachaType === 'anime' ? '动画卡池概率详情' : '角色卡池概率详情'
);

const rarityConfig = computed(() => 
  props.gachaType === 'anime' ? GAME_CONFIG.animeSystem.rarityConfig : GAME_CONFIG.characterSystem.rarityConfig
);

const rateUpConfig = computed(() =>
    props.gachaType === 'anime' ? GAME_CONFIG.animeSystem.rateUp : GAME_CONFIG.characterSystem.rateUp
);

const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];

const rates = computed(() => {
  return rarityOrder.map(rarity => ({
    rarity,
    ...rarityConfig.value[rarity],
    probability: `${(rarityConfig.value[rarity].p).toFixed(2)}%`,
  }));
});

</script>

<template>
  <div v-if="show" @click.self="emit('close')" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
      <div class="p-4 border-b">
        <h2 class="text-xl font-bold text-center text-gray-800">{{ title }}</h2>
      </div>

      <div class="p-6 overflow-y-auto">
        <div class="space-y-4">
          <div>
            <h3 class="font-semibold text-gray-700 mb-2">基础概率</h3>
            <table class="w-full text-sm text-left text-gray-600">
              <thead class="text-xs text-gray-700 uppercase bg-gray-100">
                <tr>
                  <th scope="col" class="px-4 py-2">稀有度</th>
                  <th scope="col" class="px-4 py-2">概率</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="rate in rates" :key="rate.rarity" class="bg-white border-b last:border-b-0">
                  <td class="px-4 py-2 font-medium">
                     <span 
                        class="font-bold px-2 py-1 rounded-md text-xs text-white"
                        :class="[rate.c, rate.c.includes('from') ? 'bg-gradient-to-r' : '']"
                     >
                        {{ rate.rarity }}
                    </span>
                  </td>
                  <td class="px-4 py-2 font-semibold">{{ rate.probability }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div>
            <h3 class="font-semibold text-gray-700 mb-2">卡池机制</h3>
            <ul class="list-disc list-inside space-y-2 text-sm text-gray-600">
              <li>
                <strong>十连保底:</strong> 每进行 <span class="font-bold text-indigo-600">10</span> 次召唤，必定获得至少 <span class="font-bold text-purple-600">1</span> 张SR或更高级别的卡牌。
              </li>
              <li v-if="rateUpConfig && rateUpConfig.ids.length > 0">
                <strong>UP卡牌:</strong> 当您抽到 <span class="font-bold text-red-600">HR</span> 稀有度的卡牌时，有 <span class="font-bold text-indigo-600">{{ rateUpConfig.hrChance * 100 }}%</span> 的概率为当期UP卡牌之一。
              </li>
               <li v-if="rateUpConfig && rateUpConfig.pityPulls > 0">
                <strong>大保底:</strong> 在本卡池中，每进行 <span class="font-bold text-indigo-600">{{ rateUpConfig.pityPulls }}</span> 次召唤，必定会获得当期UP的 <span class="font-bold text-red-600">HR</span> 卡牌之一（若提前抽到则重置计数）。
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="p-4 border-t bg-gray-50 text-right">
        <button @click="emit('close')" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          关闭
        </button>
      </div>
    </div>
  </div>
</template>
