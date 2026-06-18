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
  const effectiveRarityEntries = Object.entries(rarityConfig.value).filter(
    ([, rarityData]) => rarityData.p > 0
  );
  if (effectiveRarityEntries.length === 0) {
    return [];
  }
  const totalEffectiveProbability = effectiveRarityEntries.reduce(
    (sum, [, rarityData]) => sum + rarityData.p,
    0
  );
  return effectiveRarityEntries.map(([rarity, rarityData]) => ({
    rarity,
    ...rarityData,
    probability: `${((rarityData.p / totalEffectiveProbability) * 100).toFixed(2)}%`,
  }));
});

</script>

<template>
  <div v-if="show" @click.self="emit('close')" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
    <div class="bg-elevated rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
      <div class="p-4 border-b">
        <h2 class="text-xl font-bold text-center text-ink">{{ title }}</h2>
      </div>

      <div class="p-6 overflow-y-auto">
        <div class="space-y-4">
          <div>
            <h3 class="font-semibold text-ink-2 mb-2">基础概率</h3>
            <table class="w-full text-sm text-left text-ink-2">
              <thead class="text-xs text-ink-2 uppercase bg-surface-2">
                <tr>
                  <th scope="col" class="px-4 py-2">稀有度</th>
                  <th scope="col" class="px-4 py-2">概率</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="rate in rates" :key="rate.rarity" class="bg-elevated border-b last:border-b-0">
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
            <h3 class="font-semibold text-ink-2 mb-2">稀有度怎么定的</h3>
            <ul class="list-disc list-inside space-y-2 text-sm text-ink-2">
              <li v-if="gachaType === 'anime'">
                番剧按 <strong>「品质 × 人气」综合</strong>评级：<span class="font-bold text-accent">Bangumi 评分</span>占 65% + <span class="font-bold text-accent">评分人数</span>占 35%，全部番剧统一排名后分档——又高分、看的人又多，排得越靠前、稀有度越高。
              </li>
              <li v-else>
                角色按 <strong>Bangumi 角色人气</strong>评级：越多人喜欢这个角色，稀有度越高（Bangumi 不给角色打质量分，故只看人气）。
              </li>
              <li>
                稀有度只决定<strong>收集与抽卡的稀缺度</strong>，<strong class="text-accent">不影响对战强度</strong>——卡的强度由费用和单独的强度值决定，和稀有度解耦。
              </li>
            </ul>
          </div>

          <div>
            <h3 class="font-semibold text-ink-2 mb-2">卡池机制</h3>
            <ul class="list-disc list-inside space-y-2 text-sm text-ink-2">
              <li>
                <strong>十连保底:</strong> 每进行 <span class="font-bold text-accent">10</span> 次召唤，必定获得至少 <span class="font-bold text-purple-600">1</span> 张SSR或更高级别的卡牌。
              </li>
              <li v-if="rateUpConfig && rateUpConfig.ids.length > 0">
                <strong>UP卡牌:</strong> 当您抽到 <span class="font-bold text-red-600">HR</span> 稀有度的卡牌时，有 <span class="font-bold text-accent">{{ rateUpConfig.hrChance * 100 }}%</span> 的概率为当期UP卡牌之一。
              </li>
               <li v-if="rateUpConfig && rateUpConfig.pityPulls > 0">
                <strong>大保底:</strong> 在本卡池中，每进行 <span class="font-bold text-accent">{{ rateUpConfig.pityPulls }}</span> 次召唤，必定会获得当期UP的 <span class="font-bold text-red-600">HR</span> 卡牌之一（若提前抽到则重置计数）。
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="p-4 border-t bg-surface-2 text-right">
        <button @click="emit('close')" class="px-4 py-2 bg-accent text-on-accent rounded-lg hover:bg-accent-strong">
          关闭
        </button>
      </div>
    </div>
  </div>
</template>
