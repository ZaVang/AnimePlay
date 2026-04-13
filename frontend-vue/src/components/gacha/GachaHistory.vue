<script setup lang="ts">
/**
 * Gacha History - Mission Archive Record Standard
 */
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
            name: card?.name || 'UNKNOWN_SUBJECT'
        }
    });
});

const rarityConfig = computed(() => {
  return props.gachaType === 'anime' ? GAME_CONFIG.animeSystem.rarityConfig : GAME_CONFIG.characterSystem.rarityConfig;
});

const rarityOrder: ('UR' | 'HR' | 'SSR' | 'SR' | 'R' | 'N')[] = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];

const chartData = computed(() => {
  const totalPulls = historyWithDetails.value.length;
  if (totalPulls === 0) return { labels: [], datasets: [] };
  
  const counts = historyWithDetails.value.reduce((acc, item) => {
    acc[item.rarity] = (acc[item.rarity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const labels = rarityOrder.filter(r => counts[r]);
  const data = labels.map(r => counts[r]);
  const colors = labels.map(r => rarityConfig.value[r]?.chartColor || '#D4A574');

  return {
    labels: labels,
    datasets: [{
      backgroundColor: colors,
      data: data,
      label: 'Units',
      borderRadius: 2
    }],
  };
});

const chartOptions = computed(() => {
    const totalPulls = historyWithDetails.value.length;
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.9)',
                titleFont: { family: 'Geist Mono', size: 10 },
                bodyFont: { family: 'Geist Mono', size: 10 },
                callbacks: {
                    label: (context: any) => {
                        const count = context.parsed.y;
                        const percentage = totalPulls > 0 ? ((count / totalPulls) * 100).toFixed(1) : 0;
                        return ` QUANTITY: ${count} (${percentage}%)`;
                    }
                }
            },
            datalabels: {
                anchor: 'end',
                align: 'top',
                formatter: (value: number) => {
                    const percentage = totalPulls > 0 ? ((value / totalPulls) * 100).toFixed(0) + '%' : '0%';
                    return `${value}\n[${percentage}]`;
                },
                font: { family: 'Geist Mono', size: 8, weight: 'bold' },
                color: '#D4A574'
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: '#666', font: { family: 'Geist Mono', size: 8 } }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#D4A574', font: { family: 'Geist Mono', size: 10, weight: 'bold' } }
            }
        }
    }
});

function formatTime(timestamp: number) {
  const d = new Date(timestamp);
  return `${d.getMonth()+1}.${d.getDate()} // ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}
</script>

<template>
  <div class="gacha-history-archives space-y-8 quantic-reveal">
    <!-- Summary Header -->
    <div class="flex justify-between items-end border-b border-white/5 pb-4">
       <div class="space-y-1">
          <h3 class="text-[10px] font-display font-bold text-gold tracking-[0.3em] uppercase opacity-70">Archive Buffer</h3>
          <div class="text-xl font-display font-black text-white uppercase tracking-tighter">Manifest History</div>
       </div>
       <div class="text-right">
          <div class="text-[8px] font-display text-industrial-500 uppercase">Total Manifestations</div>
          <div class="text-lg font-mono font-bold text-gold">{{ historyWithDetails.length }}</div>
       </div>
    </div>

    <div v-if="historyWithDetails.length > 0" class="grid grid-cols-1 lg:grid-cols-12 gap-12">
      <!-- Chart Analytics -->
      <div class="lg:col-span-7 bg-white/[0.02] border border-white/5 p-6 relative min-h-[400px]">
        <div class="absolute top-4 left-6 text-[8px] font-display font-bold text-industrial-600 uppercase tracking-widest">Rarity Distribution Matrix</div>
        <div class="h-full pt-8">
           <Bar :data="chartData" :options="chartOptions as any" />
        </div>
      </div>

      <!-- History Stream -->
      <div class="lg:col-span-5 space-y-4">
        <div class="text-[8px] font-display font-bold text-industrial-500 uppercase tracking-[0.4em] mb-4">Signal Stream</div>
        <div class="history-scroll max-h-[400px] overflow-y-auto pr-4 space-y-1 scrollbar-none">
          <div 
            v-for="(item, index) in [...historyWithDetails].reverse()" 
            :key="index" 
            class="group flex justify-between items-center p-3 border border-white/5 bg-white/[0.01] hover:bg-white/[0.05] transition-all"
          >
            <div class="flex items-center gap-4">
              <span class="text-[8px] font-mono opacity-20 group-hover:opacity-60 transition-opacity">{{ String(historyWithDetails.length - index).padStart(3, '0') }}</span>
              <span 
                class="font-display font-black text-[9px] px-2 py-0.5" 
                :class="rarityConfig[item.rarity]?.c.includes('from') ? `bg-gradient-to-r ${rarityConfig[item.rarity]?.c} text-white` : 'text-gold border border-gold/30'"
              >
                {{ item.rarity }}
              </span>
              <span class="text-[10px] font-display font-black text-white uppercase tracking-tight truncate max-w-[120px]">{{ item.name }}</span>
            </div>
            <span class="text-[8px] font-mono text-industrial-600">{{ formatTime(item.timestamp) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="py-24 text-center border border-dashed border-white/5">
       <div class="text-4xl opacity-10 mb-4">📂</div>
       <p class="text-[10px] font-display font-bold text-industrial-600 uppercase tracking-widest">Historical buffers are currently empty.</p>
    </div>
  </div>
</template>

<style scoped>
.history-scroll {
  scrollbar-width: none;
}
.history-scroll::-webkit-scrollbar {
  display: none;
}
.history-item {
  clip-path: polygon(0 0, 100% 0, 100% 85%, 98% 100%, 0 100%);
}
</style>
