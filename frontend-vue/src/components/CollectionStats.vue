<script setup lang="ts">
import { computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { GAME_CONFIG } from '@/config/gameConfig';

const props = defineProps<{
  type: 'anime' | 'character';
}>();

const userStore = useUserStore();
const gameDataStore = useGameDataStore();

const itemType = computed(() => props.type === 'anime' ? '动画' : '角色');

const collectionStats = computed(() => {
    const isAnime = props.type === 'anime';
    const collection = isAnime ? userStore.animeCollection : userStore.characterCollection;
    const allPossibleCards = isAnime ? gameDataStore.allAnimeCards : gameDataStore.allCharacterCards;
    const rarityConfig = isAnime ? GAME_CONFIG.animeSystem.rarityConfig : GAME_CONFIG.characterSystem.rarityConfig;
    
    const uniqueCount = collection.size;
    const totalCount = Array.from(collection.values()).reduce((sum, item) => sum + item.count, 0);
    const totalPossible = allPossibleCards.length;
    const completionRate = totalPossible > 0 ? ((uniqueCount / totalPossible) * 100).toFixed(1) : '0.0';

    const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
    const rarityCounts = rarityOrder.map(rarity => {
        const count = Array.from(collection.keys()).filter(id => {
            const card = isAnime ? gameDataStore.getAnimeCardById(id) : gameDataStore.getCharacterCardById(id);
            return card?.rarity === rarity;
        }).length;
        
        return {
            rarity,
            count,
            colorClass: rarityConfig[rarity]?.c || 'bg-gray-400'
        };
    });

    let genderCounts = null;
    if (!isAnime) {
        const counts = { male: 0, female: 0, unknown: 0 };
        for (const id of collection.keys()) {
            const card = gameDataStore.getCharacterCardById(id);
            if (card?.gender === '男') counts.male++;
            else if (card?.gender === '女') counts.female++;
            else counts.unknown++;
        }
        genderCounts = [
            { label: '男性', count: counts.male },
            { label: '女性', count: counts.female },
            { label: '未知', count: counts.unknown },
        ].filter(g => g.count > 0);
    }

    return {
        uniqueCount,
        totalCount,
        totalPossible,
        completionRate,
        rarityCounts,
        genderCounts
    };
});

</script>

<template>
  <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
    <h3 class="text-lg font-semibold mb-3 text-gray-800">{{ itemType }}收藏统计</h3>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-sm mb-4">
      <div>
        <p class="text-gray-600">已收集种类</p>
        <p class="text-2xl font-bold text-indigo-600">{{ collectionStats.uniqueCount }} / {{ collectionStats.totalPossible }}</p>
      </div>
      <div>
        <p class="text-gray-600">卡牌总数量</p>
        <p class="text-2xl font-bold text-indigo-600">{{ collectionStats.totalCount }}</p>
      </div>
      <div>
        <p class="text-gray-600">收集完成率</p>
        <p class="text-2xl font-bold text-teal-600">{{ collectionStats.completionRate }}%</p>
      </div>
    </div>

    <div class="text-center text-sm space-y-2">
      <div class="text-gray-600">
        稀有度分布:
        <span v-for="item in collectionStats.rarityCounts" :key="item.rarity" class="inline-block ml-3">
          <span 
            class="font-bold px-1.5 py-0.5 rounded-sm text-xs text-white"
            :class="[item.colorClass, item.colorClass.includes('from') ? 'bg-gradient-to-r' : '']"
          >{{ item.rarity }}</span>: {{ item.count }}
        </span>
      </div>
    </div>
  </div>
</template>
