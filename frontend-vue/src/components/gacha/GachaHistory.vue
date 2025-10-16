<script setup lang="ts">
import { computed } from 'vue';
import { useCollectionStore } from '@/stores/modules/collectionStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { GAME_CONFIG } from '@/config/gameConfig';
import { Bar } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ChartDataLabels);

const props = defineProps<{
  gachaType: 'anime' | 'character';
}>();

const collectionStore = useCollectionStore();
const gameDataStore = useGameDataStore();

const historyWithDetails = computed(() => {
    const sourceHistory = props.gachaType === 'anime' ? collectionStore.animeGachaHistory : collectionStore.characterGachaHistory;
    const getCardById = props.gachaType === 'anime' ? gameDataStore.getAnimeCardById : gameDataStore.getCharacterCardById;

    return sourceHistory.map(item => {
        const card = getCardById(item.id);
        return {
            ...item,
            name: card?.name || '未知卡牌'
        }
    });
});

const rarityConfig = computed(() => {
  return props.gachaType === 'anime' ? GAME_CONFIG.animeSystem.rarityConfig : GAME_CONFIG.characterSystem.rarityConfig;
});

const rarityOrder: ('UR' | 'HR' | 'SSR' | 'SR' | 'R' | 'N')[] = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];

const chartData = computed(() => {
  const totalPulls = historyWithDetails.value.length;
  if (totalPulls === 0) {
      return { labels: [], datasets: [] };
  }
  
  const counts = historyWithDetails.value.reduce((acc, item) => {
    acc[item.rarity] = (acc[item.rarity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const labels = rarityOrder.filter(r => counts[r]);
  const data = labels.map(r => counts[r]);
  const colors = labels.map(r => rarityConfig.value[r]?.chartColor || '#cccccc');

  return {
    labels: labels,
    datasets: [
      {
        backgroundColor: colors,
        data: data,
        label: '数量'
      },
    ],
  };
});

const chartOptions = computed(() => {
    const totalPulls = historyWithDetails.value.length;
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: function(context: any) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            const count = context.parsed.y;
                            const percentage = totalPulls > 0 ? ((count / totalPulls) * 100).toFixed(2) : 0;
                            label += `${count} (${percentage}%)`;
                        }
                        return label;
                    }
                }
            },
            datalabels: {
                anchor: 'end',
                align: 'top',
                formatter: (value: number) => {
                    const percentage = totalPulls > 0 ? ((value / totalPulls) * 100).toFixed(1) + '%' : '0%';
                    return `${value}\n(${percentage})`;
                },
                font: {
                    weight: 'bold'
                },
                color: '#4A5568'
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grace: '10%', // Add 10% padding to the top
                ticks: {
                    stepSize: 1
                }
            }
        }
    }
});

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString();
}
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold mb-2">{{ gachaType === 'anime' ? '动画抽卡历史' : '角色抽卡历史' }} (总计: {{ historyWithDetails.length }}抽)</h3>
    <p class="text-sm text-gray-600 mb-4">
      <i class="fas fa-info-circle mr-1"></i>
      仅显示最近500抽的历史记录和统计数据
    </p>
    <div v-if="historyWithDetails.length > 0" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Chart -->
      <div class="relative h-96">
        <Bar :data="chartData" :options="chartOptions" />
      </div>

      <!-- History List -->
      <div class="max-h-96 overflow-y-auto pr-2">
        <ul class="space-y-2">
          <li v-for="(item, index) in [...historyWithDetails].reverse()" :key="index" class="flex justify-between items-center p-2 rounded-md bg-gray-50">
            <div class="flex items-center">
              <span 
                class="font-bold px-1.5 py-0.5 rounded text-xs text-white" 
                :class="rarityConfig[item.rarity]?.c.includes('from') ? `bg-gradient-to-r ${rarityConfig[item.rarity]?.c}` : rarityConfig[item.rarity]?.c || 'bg-gray-400'"
              >
                {{ item.rarity }}
              </span>
              <span class="ml-3 font-medium text-sm truncate" :title="item.name">{{ item.name }}</span>
            </div>
            <span class="text-xs text-gray-500 flex-shrink-0 ml-2">{{ formatTime(item.timestamp) }}</span>
          </li>
        </ul>
      </div>
    </div>
    <div v-else class="text-center text-gray-500 py-8">
      <p>还没有抽卡历史记录。</p>
    </div>
  </div>
</template>
