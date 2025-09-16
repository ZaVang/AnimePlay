<script setup lang="ts">
import type { AnimeCard as AnimeCardType } from '@/types/card';
import AnimeCard from '@/components/AnimeCard.vue'; // Use the standard AnimeCard
import { useGameStore, usePlayerStore } from '@/stores/battle';
import { StrengthCalculator } from '@/core/calculation/StrengthCalculator';
import { CostCalculator } from '@/core/calculation/CostCalculator';
import { computed } from 'vue';

const props = defineProps<{
  card: AnimeCardType;
  isVisible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'play', style: '友好安利' | '辛辣点评' | '赞同' | '反驳'): void;
}>();

const gameStore = useGameStore();
const playerStore = usePlayerStore();
const isDefensePhase = computed(() => gameStore.phase === 'defense');

// 计算当前玩家ID
const currentPlayerId = computed(() => {
  // 在防御阶段，使用当前被攻击的玩家（即非活跃玩家）
  return gameStore.phase === 'defense'
    ? (gameStore.activePlayer === 'playerA' ? 'playerB' : 'playerA')
    : gameStore.activePlayer;
});

// 计算卡牌费用信息
const costInfo = computed(() => {
  try {
    return CostCalculator.getCostModification(props.card, currentPlayerId.value);
  } catch {
    const baseCost = props.card.cost || 0;
    return {
      baseCost,
      finalCost: baseCost,
      reduction: 0,
      hasModification: false
    };
  }
});

// 根据稀有度获取基础强度
const getBaseStrength = (rarity: string): number => {
  const rarityStrength = {
    'UR': 10,
    'HR': 8,
    'SSR': 6,
    'SR': 4,
    'R': 3,
    'N': 2
  };
  return rarityStrength[rarity as keyof typeof rarityStrength] || 2;
};

// 计算基础强度
const baseStrength = computed(() => {
  return props.card.points || getBaseStrength(props.card.rarity);
});

// 计算卡牌的当前战斗强度
const finalStrength = computed(() => {
  // 在防御阶段，使用当前被攻击的玩家（即非活跃玩家）
  const currentPlayer = gameStore.phase === 'defense'
    ? (gameStore.activePlayer === 'playerA' ? 'playerB' : 'playerA')
    : gameStore.activePlayer;
  return StrengthCalculator.calculateFinalStrength(props.card, currentPlayer);
});

// 是否有强度加成
const hasStrengthBonus = computed(() => {
  return finalStrength.value > baseStrength.value;
});

// 强度显示文本
const strengthDisplay = computed(() => {
  if (hasStrengthBonus.value) {
    return `${baseStrength.value}(${finalStrength.value})`;
  }
  return baseStrength.value.toString();
});

// 获取角色的羁绊标签（从当前活跃角色）
const activeCharacterTags = computed(() => {
  // 在防御阶段，使用当前被攻击的玩家（即非活跃玩家）
  const currentPlayer = gameStore.phase === 'defense'
    ? (gameStore.activePlayer === 'playerA' ? 'playerB' : 'playerA')
    : gameStore.activePlayer;
  const activeCharacter = playerStore.getActiveCharacter(currentPlayer);

  if (!activeCharacter?.synergy_tags) return [];
  return activeCharacter.synergy_tags;
});

// 检查卡牌标签与角色的羁绊匹配
const synergyMatches = computed(() => {
  if (!props.card.synergy_tags || !activeCharacterTags.value.length) return [];

  return props.card.synergy_tags.filter(tag =>
    activeCharacterTags.value.includes(tag)
  );
});

// 羁绊提示文本
const synergyText = computed(() => {
  if (synergyMatches.value.length > 0) {
    return `羁绊匹配: ${synergyMatches.value.join(', ')}`;
  }
  return '无羁绊匹配';
});
</script>

<template>
  <div v-if="isVisible" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <h3 class="text-xl font-bold mb-4 text-center text-white">
        {{ isDefensePhase ? '要如何回应？' : '要如何出牌？' }}
      </h3>

      <div class="card-display mb-4">
        <AnimeCard :anime="card" :show-cost="true" :player-id="currentPlayerId" />
      </div>

      <!-- 卡牌详细信息区域 -->
      <div class="card-info mb-6 bg-gray-700 rounded-lg p-4">
        <!-- 卡牌名称和强度 -->
        <div class="flex justify-between items-center mb-3">
          <h4 class="text-lg font-bold text-white">{{ card.name }}</h4>
          <div class="strength-display">
            <span class="text-blue-300 text-sm">战斗强度:</span>
            <span class="text-yellow-400 text-xl font-bold ml-1"
                  :class="{ 'enhanced': hasStrengthBonus }">
              {{ strengthDisplay }}
            </span>
          </div>
        </div>

        <!-- 卡牌标签 -->
        <div class="mb-3">
          <p class="text-gray-300 text-sm mb-2">标签:</p>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="tag in card.synergy_tags || []"
              :key="tag"
              class="px-2 py-1 text-xs rounded-full"
              :class="synergyMatches.includes(tag)
                ? 'bg-green-600 text-white border border-green-400'
                : 'bg-gray-600 text-gray-200'"
            >
              {{ tag }}
            </span>
            <span v-if="!card.synergy_tags || card.synergy_tags.length === 0"
                  class="text-gray-400 text-xs italic">
              无标签
            </span>
          </div>
        </div>

        <!-- 羁绊信息 -->
        <div class="synergy-info">
          <p class="text-gray-300 text-sm mb-1">与当前角色的羁绊:</p>
          <p class="text-sm"
             :class="synergyMatches.length > 0 ? 'text-green-400' : 'text-gray-400'">
            {{ synergyText }}
          </p>
        </div>

        <!-- 描述信息 -->
        <div v-if="card.description" class="mt-3 pt-3 border-t border-gray-600">
          <p class="text-gray-300 text-sm mb-1">描述:</p>
          <p class="text-gray-200 text-xs">{{ card.description }}</p>
        </div>
      </div>

      <div class="action-buttons">
        <!-- Defense Phase Buttons -->
        <template v-if="isDefensePhase">
          <button @click="emit('play', '赞同')" class="btn-primary">
            <p class="font-bold">赞同</p>
            <p class="text-xs cost-display" :class="{ 'cost-reduced': costInfo.hasModification }">
              花费 {{ costInfo.finalCost }} TP
              <span v-if="costInfo.hasModification" class="original-cost-text">
                (原价 {{ costInfo.baseCost }})
              </span>
            </p>
          </button>
          <button @click="emit('play', '反驳')" class="btn-secondary">
            <p class="font-bold">反驳</p>
            <p class="text-xs cost-display" :class="{ 'cost-reduced': costInfo.hasModification }">
              花费 {{ costInfo.finalCost + 1 }} TP
              <span v-if="costInfo.hasModification" class="original-cost-text">
                (原价 {{ costInfo.baseCost + 1 }})
              </span>
            </p>
          </button>
        </template>
        <!-- Action Phase Buttons -->
        <template v-else>
          <button @click="emit('play', '友好安利')" class="btn-primary">
            <p class="font-bold">友好安利</p>
            <p class="text-xs cost-display" :class="{ 'cost-reduced': costInfo.hasModification }">
              花费 {{ costInfo.finalCost }} TP
              <span v-if="costInfo.hasModification" class="original-cost-text">
                (原价 {{ costInfo.baseCost }})
              </span>
            </p>
          </button>
          <button @click="emit('play', '辛辣点评')" class="btn-secondary">
            <p class="font-bold">辛辣点评</p>
            <p class="text-xs cost-display" :class="{ 'cost-reduced': costInfo.hasModification }">
              花费 {{ costInfo.finalCost + 1 }} TP
              <span v-if="costInfo.hasModification" class="original-cost-text">
                (原价 {{ costInfo.baseCost + 1 }})
              </span>
            </p>
          </button>
        </template>
      </div>
      <button @click="emit('close')" class="absolute top-2 right-2 text-gray-400 hover:text-white">✕</button>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background-color: #1f2937; /* bg-gray-800 */
  padding: 2rem;
  border-radius: 0.5rem;
  border: 1px solid #4b5563; /* border-gray-600 */
  position: relative;
  width: 450px;
  max-height: 90vh;
  overflow-y: auto;
}
.card-display {
  width: 200px;
  margin: 0 auto;
}
.action-buttons {
  display: flex;
  justify-content: space-around;
  gap: 1rem;
}
.btn-primary, .btn-secondary {
  @apply text-white font-bold py-2 px-4 rounded-lg w-full transition-colors;
}
.btn-primary {
  @apply bg-green-600 hover:bg-green-700;
}
.btn-secondary {
  @apply bg-red-600 hover:bg-red-700;
}

.enhanced {
  text-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
}

.cost-display.cost-reduced {
  color: #22c55e;
  font-weight: bold;
}

.original-cost-text {
  opacity: 0.7;
  text-decoration: line-through;
  margin-left: 4px;
}
</style>