<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useGachaStore } from '@/stores/gachaStore';
import { GAME_CONFIG } from '@/config/gameConfig';
import { getCurrentUpPool, getTimeUntilNextRotation, isAnimeCard, isCharacterCard } from '@/utils/gachaRotation';
import AnimeCard from '@/components/AnimeCard.vue';
import CharacterCard from '@/components/CharacterCard.vue';

const props = defineProps<{
  gachaType: 'anime' | 'character';
}>();

const gameDataStore = useGameDataStore();
const gachaStore = useGachaStore();
const rotationTimer = ref<{ hours: number; minutes: number }>({ hours: 0, minutes: 0 });
let intervalId: NodeJS.Timeout | null = null;

const upConfig = computed(() => {
  return props.gachaType === 'anime' ? GAME_CONFIG.animeSystem.rateUp : GAME_CONFIG.characterSystem.rateUp;
});

// I3-T5：硬保底 live 进度（番剧/角色域各读各的 pity；只读不写、零存档）。
// 代码里只有 70 硬保底（无软保底）——做单条进度条 pullsSinceLastHR / pityPulls。
const pity = computed(() =>
  props.gachaType === 'anime' ? gachaStore.animePity : gachaStore.characterPity,
);
const pityMax = computed(() => upConfig.value.pityPulls);
/** 距硬保底还差几抽（钳到 [0, pityMax]）。 */
const pityRemaining = computed(() => Math.max(0, pityMax.value - pity.value.pullsSinceLastHR));
/** 当前保底进度百分比 0–100。 */
const pityPct = computed(() =>
  pityMax.value > 0 ? Math.min(100, Math.round((pity.value.pullsSinceLastHR / pityMax.value) * 100)) : 0,
);

// 动态获取当前轮换的UP卡片
const upCards = computed(() => {
  const cardSource = props.gachaType === 'anime' ? gameDataStore.allAnimeCards : gameDataStore.allCharacterCards;
  
  // 如果没有加载卡片数据，返回空数组
  if (cardSource.length === 0) return [];
  
  try {
    const { urId, hrId } = getCurrentUpPool(props.gachaType);
    
    const urCard = cardSource.find(card => card.id === urId);
    const hrCard = cardSource.find(card => card.id === hrId);
    
    return [urCard, hrCard].filter(Boolean);
  } catch (error) {
    console.warn('Failed to get current UP pool:', error);
    return [];
  }
});

// 更新轮换倒计时
function updateRotationTimer() {
  rotationTimer.value = getTimeUntilNextRotation();
}

onMounted(() => {
  updateRotationTimer();
  // 每分钟更新一次倒计时
  intervalId = setInterval(updateRotationTimer, 60000);
});

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});

</script>

<template>
  <!-- I3-T5：banner 底色/文字迁皮肤令牌（accent 系）；稀有度 UR/HR 标识色为固定例外保留。 -->
  <div v-if="upCards.length > 0" class="up-banner mb-6 p-4 shadow-lg">
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-bold text-xl up-title">限时UP池</h3>
      <div class="text-sm up-pill px-3 py-1 rounded-full">
        <span class="font-bold">⏰ {{ rotationTimer.hours }}时{{ rotationTimer.minutes }}分后轮换</span>
      </div>
    </div>

    <div class="flex justify-center items-center gap-4 mb-3">
      <div v-for="(card, index) in upCards" :key="card!.id" class="relative w-1/4 max-w-[150px]">
        <AnimeCard v-if="gachaType === 'anime' && card && isAnimeCard(card)" :anime="card" />
        <CharacterCard v-if="gachaType === 'character' && card && isCharacterCard(card)" :character="card" />
        <!-- 标记稀有度（UR/HR 识别色=固定例外，保留） -->
        <div v-if="card" class="absolute -top-2 -right-2 px-2 py-1 text-xs font-bold rounded-full"
             :class="{
               'bg-red-500 text-white': card.rarity === 'UR',
               'bg-purple-500 text-white': card.rarity === 'HR'
             }">
          {{ card.rarity }}
        </div>
      </div>
    </div>

    <!-- I3-T5：硬保底 live 进度条（距 70 硬保底还差几抽，番剧/角色域各自的状态） -->
    <div v-if="pityMax > 0" class="up-pity mb-3">
      <div class="flex justify-between items-center mb-1 text-xs up-text">
        <span class="font-bold">保底进度</span>
        <span>
          <template v-if="pityRemaining > 0">距保底还差 <span class="font-bold">{{ pityRemaining }}</span> 抽</template>
          <template v-else>下次必出 UP！</template>
          （{{ pity.pullsSinceLastHR }}/{{ pityMax }}）
        </span>
      </div>
      <div class="up-pity-track">
        <div class="up-pity-fill" :style="{ width: pityPct + '%' }"></div>
      </div>
    </div>

    <div class="text-center space-y-1">
      <p class="text-sm up-text">
        在抽到 <span class="font-bold text-purple-500">HR</span> 或 <span class="font-bold text-red-500">UR</span> 稀有度时，有 <span class="font-bold">{{ (upConfig.hrChance * 100).toFixed(0) }}%</span> 的概率为UP卡！
      </p>
      <p v-if="upConfig.pityPulls > 0" class="text-xs up-text-soft">
        {{ upConfig.pityPulls }}次未抽中UP卡，下次必定获得UP卡！
      </p>
      <p class="text-xs up-text-soft opacity-75">
        🔄 每日0点自动轮换新的UP组合
      </p>
    </div>
  </div>
</template>

<style scoped>
/* I3-T5：UP banner 配色迁皮肤令牌（accent 系渐变），不再硬编码 yellow/amber/orange。 */
.up-banner {
  border-radius: var(--sk-radius-panel);
  background: linear-gradient(135deg, rgb(var(--c-accent) / 0.85), rgb(var(--c-accent-2) / 0.9));
  border: 1px solid rgb(var(--c-accent) / 0.5);
}
.up-title { color: rgb(var(--c-on-accent)); }
.up-text { color: rgb(var(--c-on-accent)); }
.up-text-soft { color: rgb(var(--c-on-accent) / 0.85); }
.up-pill {
  color: rgb(var(--c-on-accent)); background: rgb(255 255 255 / 0.18);
}
.up-pity-track {
  width: 100%; height: 0.6rem; border-radius: 999px; overflow: hidden;
  background: rgb(255 255 255 / 0.25);
}
.up-pity-fill {
  height: 100%; border-radius: 999px; transition: width 0.4s;
  background: rgb(var(--c-on-accent)); min-width: 2px;
}
</style>
