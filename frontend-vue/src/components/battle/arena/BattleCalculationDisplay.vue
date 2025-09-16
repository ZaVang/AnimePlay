<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useGameStore, usePlayerStore } from '@/stores/battle';
import { StrengthCalculator } from '@/core/calculation/StrengthCalculator';
import type { AnimeCard } from '@/types/card';

const gameStore = useGameStore();
const playerStore = usePlayerStore();

// 动画状态
const showCalculation = ref(false);
const animationStage = ref<'calculating' | 'result' | 'complete'>('calculating');

// 根据稀有度获取基础强度的辅助函数
const getBaseStrengthFromRarity = (rarity: string): number => {
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

// 计算详细数值
const clashCalculation = computed(() => {
  const clash = gameStore.clashInfo;
  if (!clash?.attackingCard) return null;

  const attackerId = clash.attackerId;
  const defenderId = clash.defenderId || (attackerId === 'playerA' ? 'playerB' : 'playerA');

  // 攻击方数值计算
  const attackerCard = clash.attackingCard;
  // 对于动画卡片，基础强度可能来自不同的属性，或者需要根据稀有度计算
  const attackerBaseStrength = attackerCard.points || getBaseStrengthFromRarity(attackerCard.rarity);
  const attackerFinalStrength = StrengthCalculator.calculateFinalStrength(attackerCard, attackerId);
  const attackerBonus = attackerFinalStrength - attackerBaseStrength;

  // 攻击方式加成（友好安利0额外消耗，辛辣点评+1 TP消耗但可能有额外效果）
  const attackStyleBonus = clash.attackStyle === '辛辣点评' ? 1 : 0;
  const attackerTotalStrength = attackerFinalStrength + attackStyleBonus;

  const result = {
    attacker: {
      card: attackerCard,
      playerId: attackerId,
      playerName: playerStore[attackerId].name,
      baseStrength: attackerBaseStrength,
      skillBonus: attackerBonus,
      styleBonus: attackStyleBonus,
      finalStrength: attackerTotalStrength,
      style: clash.attackStyle,
      styleCost: clash.attackStyle === '辛辣点评' ? (attackerCard.cost || 0) + 1 : (attackerCard.cost || 0)
    },
    defender: null as any,
    winner: null as string | null,
    outcome: null as any
  };

  // 防守方数值计算（如果存在）
  if (clash.defendingCard) {
    const defenderCard = clash.defendingCard;
    const defenderBaseStrength = defenderCard.points || getBaseStrengthFromRarity(defenderCard.rarity);
    const defenderFinalStrength = StrengthCalculator.calculateFinalStrength(defenderCard, defenderId);
    const defenderBonus = defenderFinalStrength - defenderBaseStrength;

    // 防守方式加成
    const defenseStyleBonus = clash.defenseStyle === '反驳' ? 1 : 0;
    const defenderTotalStrength = defenderFinalStrength + defenseStyleBonus;

    result.defender = {
      card: defenderCard,
      playerId: defenderId,
      playerName: playerStore[defenderId].name,
      baseStrength: defenderBaseStrength,
      skillBonus: defenderBonus,
      styleBonus: defenseStyleBonus,
      finalStrength: defenderTotalStrength,
      style: clash.defenseStyle,
      styleCost: clash.defenseStyle === '反驳' ? (defenderCard.cost || 0) + 1 : (defenderCard.cost || 0)
    };

    // 判断胜负
    if (attackerTotalStrength > defenderTotalStrength) {
      result.winner = attackerId;
    } else if (defenderTotalStrength > attackerTotalStrength) {
      result.winner = defenderId;
    } else {
      result.winner = null; // 平局
    }

    // 计算具体的战斗结果（这里可以根据游戏配置来计算声望变化等）
    result.outcome = {
      strengthDifference: Math.abs(attackerTotalStrength - defenderTotalStrength),
      attackerStrengthAdvantage: attackerTotalStrength - defenderTotalStrength
    };
  }

  return result;
});

// 监听clash信息变化，触发动画
watch(() => gameStore.clashInfo, (newClash, oldClash) => {
  if (newClash && newClash !== oldClash) {
    showCalculation.value = true;
    animationStage.value = 'calculating';

    // 如果双方都有卡牌，开始计算动画
    if (newClash.defendingCard) {
      setTimeout(() => {
        animationStage.value = 'result';
      }, 1500);

      setTimeout(() => {
        animationStage.value = 'complete';
      }, 3000);
    }
  } else if (!newClash) {
    showCalculation.value = false;
    animationStage.value = 'calculating';
  }
}, { immediate: true });

const formatStrengthBreakdown = (calculation: any) => {
  if (!calculation) return '';

  const parts = [`基础: ${calculation.baseStrength}`];
  if (calculation.skillBonus !== 0) {
    parts.push(`技能: ${calculation.skillBonus > 0 ? '+' : ''}${calculation.skillBonus}`);
  }
  if (calculation.styleBonus > 0) {
    parts.push(`方式: +${calculation.styleBonus}`);
  }

  return parts.join(' | ');
};

const formatDisplayStrength = (calculation: any) => {
  if (!calculation) return '';

  const hasBonus = calculation.skillBonus !== 0 || calculation.styleBonus > 0;
  if (hasBonus) {
    return `${calculation.baseStrength}(${calculation.finalStrength})`;
  }
  return calculation.baseStrength.toString();
};
</script>

<template>
  <div v-if="showCalculation && clashCalculation" class="battle-calculation">
    <!-- 攻击方 -->
    <div class="calculation-side attacker-side">
      <div class="player-info">
        <h3 class="player-name">{{ clashCalculation.attacker.playerName }}</h3>
        <p class="action-style attack-style">{{ clashCalculation.attacker.style }}</p>
      </div>

      <div class="strength-breakdown">
        <div class="final-strength attack-strength"
             :class="{ 'animate-pulse': animationStage === 'calculating' }">
          {{ formatDisplayStrength(clashCalculation.attacker) }}
        </div>
        <div class="breakdown-text">
          {{ formatStrengthBreakdown(clashCalculation.attacker) }}
        </div>
        <div class="strength-bar">
          <div class="strength-bar-fill attack-bar"
               :style="{ width: `${Math.min(100, (clashCalculation.attacker.finalStrength / 20) * 100)}%` }"></div>
        </div>
        <div class="tp-cost">消耗 {{ clashCalculation.attacker.styleCost }} TP</div>
      </div>
    </div>

    <!-- VS 分隔符 -->
    <div class="vs-section">
      <div class="vs-icon" :class="{ 'animate-bounce': animationStage === 'calculating' }">
        ⚔️
      </div>

      <!-- 结果显示 -->
      <div v-if="animationStage === 'result' && clashCalculation.defender"
           class="battle-result animate-fade-in">
        <div v-if="clashCalculation.winner" class="winner-announcement">
          <span class="winner-text">
            {{ clashCalculation.winner === clashCalculation.attacker.playerId
               ? clashCalculation.attacker.playerName
               : clashCalculation.defender.playerName }} 获胜！
          </span>
          <div class="strength-difference">
            强度差: {{ clashCalculation.outcome.strengthDifference }}
          </div>
        </div>
        <div v-else class="tie-announcement">
          <span class="tie-text">平局！</span>
        </div>
      </div>
    </div>

    <!-- 防守方 -->
    <div class="calculation-side defender-side">
      <template v-if="clashCalculation.defender">
        <div class="player-info">
          <h3 class="player-name">{{ clashCalculation.defender.playerName }}</h3>
          <p class="action-style defense-style">{{ clashCalculation.defender.style }}</p>
        </div>

        <div class="strength-breakdown">
          <div class="final-strength defense-strength"
               :class="{ 'animate-pulse': animationStage === 'calculating' }">
            {{ formatDisplayStrength(clashCalculation.defender) }}
          </div>
          <div class="breakdown-text">
            {{ formatStrengthBreakdown(clashCalculation.defender) }}
          </div>
          <div class="strength-bar">
            <div class="strength-bar-fill defense-bar"
                 :style="{ width: `${Math.min(100, (clashCalculation.defender.finalStrength / 20) * 100)}%` }"></div>
          </div>
          <div class="tp-cost">消耗 {{ clashCalculation.defender.styleCost }} TP</div>
        </div>
      </template>
      <template v-else>
        <div class="waiting-response">
          <div class="waiting-text animate-pulse">等待回应...</div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.battle-calculation {
  @apply w-full bg-gray-900 bg-opacity-95 rounded-lg p-6 border border-gray-600;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 2rem;
  align-items: center;
  min-height: 200px;
}

.calculation-side {
  @apply text-center;
}

.attacker-side {
  @apply text-left;
}

.defender-side {
  @apply text-right;
}

.player-info {
  @apply mb-4;
}

.player-name {
  @apply text-xl font-bold text-white mb-2;
}

.action-style {
  @apply text-sm font-semibold px-3 py-1 rounded-full inline-block;
}

.attack-style {
  @apply bg-red-600 text-white;
}

.defense-style {
  @apply bg-blue-600 text-white;
}

.strength-breakdown {
  @apply space-y-2;
}

.final-strength {
  @apply text-4xl font-bold mb-2;
}

.attack-strength {
  @apply text-red-400;
}

.defense-strength {
  @apply text-blue-400;
}

.breakdown-text {
  @apply text-sm text-gray-300;
}

.tp-cost {
  @apply text-xs text-gray-400;
}

.strength-bar {
  @apply w-full h-2 bg-gray-700 rounded-full overflow-hidden;
}

.strength-bar-fill {
  @apply h-full transition-all duration-1000 ease-out;
}

.attack-bar {
  @apply bg-gradient-to-r from-red-500 to-red-400;
}

.defense-bar {
  @apply bg-gradient-to-r from-blue-500 to-blue-400;
}

.vs-section {
  @apply flex flex-col items-center justify-center space-y-4;
}

.vs-icon {
  @apply text-4xl;
}

.battle-result {
  @apply text-center;
}

.winner-announcement {
  @apply space-y-2;
}

.winner-text {
  @apply text-lg font-bold text-yellow-400;
}

.tie-text {
  @apply text-lg font-bold text-gray-400;
}

.strength-difference {
  @apply text-sm text-gray-300;
}

.waiting-response {
  @apply flex items-center justify-center h-full;
}

.waiting-text {
  @apply text-gray-400 text-lg;
}

/* 动画 */
.animate-fade-in {
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-pulse {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-bounce {
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
  60% { transform: translateY(-5px); }
}
</style>