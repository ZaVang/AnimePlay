<script setup lang="ts">
import { useAuthStore } from '@/stores/modules/authStore';
import { useEconomyStore } from '@/stores/modules/economyStore';
import { useNurtureStore } from '@/stores/modules/nurtureStore';

import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/stores/userStore';
import { useCharacterTraining } from '@/composables/useCharacterTraining';
import { useTrainingTimer } from '@/composables/useTrainingTimer';
import { 
  generateBattleStats, 
  simulateBattle,
  type BattleStats 
} from '@/utils/battleCalculator';

const props = defineProps<{
  character: CharacterCard & { nurtureData: CharacterNurtureData };
}>();

const authStore = useAuthStore();
const economyStore = useEconomyStore();
const nurtureStore = useNurtureStore();
const { battleTrainingPrograms } = useCharacterTraining(props.character);
const {
  trainingAnimations,
  isTrainingOnCooldown,
  getTrainingCooldownRemaining,
  formatCooldownTime,
  setTrainingCooldown,
  startTrainingAnimation
} = useTrainingTimer();

// 生成训练对手
function generateTrainingOpponent(trainingStat: string, playerStats: BattleStats): BattleStats {
  // 基于训练类型生成有针对性的对手
  const baseOpponent: BattleStats = {
    hp: playerStats.hp * 0.8,
    atk: playerStats.atk * 0.9,
    def: playerStats.def * 0.8,
    sp: playerStats.sp * 0.8,
    spd: playerStats.spd * 0.9
  };
  
  // 根据训练属性强化对手相应能力
  switch (trainingStat) {
    case 'atk':
      baseOpponent.def *= 1.2; // 防御型对手，训练攻击
      break;
    case 'def':
      baseOpponent.atk *= 1.2; // 攻击型对手，训练防御
      break;
    case 'sp':
      baseOpponent.sp *= 1.3; // 技能型对手，训练技能
      break;
    case 'spd':
      baseOpponent.spd *= 1.3; // 速度型对手，训练速度
      break;
    case 'hp':
      baseOpponent.hp *= 1.4; // 耐久型对手，训练生命
      break;
  }
  
  return {
    hp: Math.floor(baseOpponent.hp),
    atk: Math.floor(baseOpponent.atk),
    def: Math.floor(baseOpponent.def),
    sp: Math.floor(baseOpponent.sp),
    spd: Math.floor(baseOpponent.spd)
  };
}

// 处理战斗训练结果
function processBattleTrainingResult(program: any, battleResult: any) {
  const characterId = props.character.id;
  
  if (battleResult.winner === 'attacker') {
    // 胜利：更好的奖励
    console.log('About to call enhanceBattleStat with:', { characterId, stat: program.stat, gain: program.gain });
    nurtureStore.enhanceBattleStat(characterId, program.stat, program.gain);
    nurtureStore.addCharacterExp(characterId, 25); // 战斗经验
    
    const bonusMessage = battleResult.isCriticalHit ? '表现出色，' : '';
    authStore.addLog(
      `🎉 ${props.character.name} 在${program.name}中获胜！${bonusMessage}${program.stat.toUpperCase()}提升${program.gain}%！`,
      'success'
    );
  } else if (battleResult.winner === 'defender') {
    // 失败：较少奖励，但仍有成长
    const reducedGain = Math.ceil(program.gain * 0.4);
    nurtureStore.enhanceBattleStat(characterId, program.stat, reducedGain);
    nurtureStore.addCharacterExp(characterId, 10);
    
    authStore.addLog(
      `😔 ${props.character.name} 在${program.name}中落败，但从失败中学习。${program.stat.toUpperCase()}提升${reducedGain}%！`,
      'warning'
    );
  } else {
    // 平局：中等奖励
    const mediumGain = Math.ceil(program.gain * 0.7);
    nurtureStore.enhanceBattleStat(characterId, program.stat, mediumGain);
    nurtureStore.addCharacterExp(characterId, 18);
    
    authStore.addLog(
      `⚡ ${props.character.name} 在${program.name}中打成平手！势均力敌的较量让实力提升。${program.stat.toUpperCase()}提升${mediumGain}%！`,
      'info'
    );
  }
}

// 执行战斗属性训练
function startBattleTraining(programId: string) {
  try {
    console.log('Starting battle training for:', programId);
    
    const program = battleTrainingPrograms.value.find(p => p.id === programId);
    if (!program) {
      console.error('Program not found:', programId);
      return;
    }
    if (!program.available) {
      console.log('Program not available:', program);
      return;
    }
    
    if (isTrainingOnCooldown(programId)) {
      authStore.addLog('战斗训练还在冷却中，请稍后再试！', 'warning');
      return;
    }
    
    if (economyStore.knowledgePoints < program.cost) {
      authStore.addLog('知识点不足，无法进行战斗训练！', 'warning');
      return;
    }

    // 扣除知识点
    economyStore.knowledgePoints -= program.cost;
    console.log('Knowledge points deducted, remaining:', economyStore.knowledgePoints);
    
    // 生成角色当前战斗状态
    const currentBattleStats = generateBattleStats(
      props.character.battle_stats || { hp: 100, atk: 50, def: 30, sp: 40, spd: 60 },
      props.character.nurtureData.attributes,
      props.character.nurtureData.battleEnhancements || { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 }
    );
    
    // 生成训练对手（基于训练强度）
    const trainingOpponent = generateTrainingOpponent(program.stat, currentBattleStats);
    
    // 模拟战斗
    const battleResult = simulateBattle(currentBattleStats, trainingOpponent);
    
    // 根据战斗结果给予奖励
    processBattleTrainingResult(program, battleResult);
    
    // 降低心情和体力 (高强度训练更累)
    const nurtureData = nurtureStore.getNurtureData(props.character.id);
    nurtureData.attributes.mood = Math.max(5, nurtureData.attributes.mood - 8);
    nurtureData.attributes.strength = Math.max(10, nurtureData.attributes.strength - 3);
    
    // 战斗训练需要更长的冷却时间 (30分钟)
    const battleTrainingDuration = 30;
    setTrainingCooldown(programId, battleTrainingDuration);
  } catch (error) {
    console.error('Battle training error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    authStore.addLog(`战斗训练出错：${errorMessage}`, 'warning');
  }
  
  // 启动战斗训练动画
  startTrainingAnimation(programId);
}
</script>

<template>
  <div class="mb-6">
    <h3 class="text-lg font-medium text-gray-300 mb-4 flex items-center">
      <svg class="w-5 h-5 mr-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
      </svg>
      战斗属性强化
    </h3>
    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      
      <div 
        v-for="program in battleTrainingPrograms" 
        :key="program.id"
        class="group"
      >
        <div 
          class="p-4 rounded-lg border transition-all duration-300 relative overflow-hidden h-full"
          :class="[
            program.available 
              ? 'bg-red-600/10 hover:bg-red-600/20 border-red-600/30 hover:border-red-600/50' 
              : 'bg-gray-800/50 border-gray-700 opacity-60',
            trainingAnimations[program.id] && 'animate-pulse border-red-400'
          ]"
        >
          <!-- 战斗训练光效 -->
          <div 
            v-if="trainingAnimations[program.id]" 
            class="absolute inset-0 bg-gradient-to-r from-red-400/20 via-transparent to-red-400/20 animate-shimmer"
          ></div>
          
          <!-- 头部信息 -->
          <div class="text-center mb-3">
            <div class="text-3xl mb-2 group-hover:scale-110 transition-transform">{{ program.icon }}</div>
            <h4 class="font-medium text-white text-sm mb-1">{{ program.name }}</h4>
            <p class="text-xs text-gray-400 mb-2">{{ program.description }}</p>
            
            <div class="flex justify-between items-center text-xs">
              <span class="text-red-400 font-medium">+{{ program.gain }}%</span>
              <span class="text-gray-400">💎 {{ program.cost }}</span>
            </div>
          </div>

          <!-- 当前战斗属性加成 -->
          <div class="mb-3">
            <div class="flex justify-between text-xs text-gray-400 mb-1">
              <span>{{ program.stat.toUpperCase() }}加成</span>
              <span>{{ character.nurtureData.battleEnhancements?.[program.stat] || 0 }}%</span>
            </div>
            <div class="w-full bg-gray-600 rounded-full h-2">
              <div 
                class="h-2 rounded-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-500"
                :style="{ width: `${Math.min(100, character.nurtureData.battleEnhancements?.[program.stat] || 0)}%` }"
              ></div>
            </div>
          </div>

          <!-- 需求条件 -->
          <div class="mb-3 text-xs text-gray-400 text-center">
            <span>需要: </span>
            <span v-if="program.requirements.affection">羁绊{{ program.requirements.affection }} </span>
            <span v-if="program.requirements.strength">体力{{ program.requirements.strength }} </span>
            <span v-if="program.requirements.intelligence">智力{{ program.requirements.intelligence }} </span>
            <span v-if="program.requirements.charm">魅力{{ program.requirements.charm }} </span>
          </div>

          <!-- 冷却时间显示 -->
          <div v-if="isTrainingOnCooldown(program.id)" class="mb-2 text-xs text-orange-400 text-center">
            {{ formatCooldownTime(getTrainingCooldownRemaining(program.id)) }}
          </div>

          <!-- 行动按钮 -->
          <button
            @click="startBattleTraining(program.id)"
            :disabled="!program.available || economyStore.knowledgePoints < program.cost || isTrainingOnCooldown(program.id)"
            class="w-full py-2 px-3 rounded-lg font-medium text-sm transition-all duration-300"
            :class="program.available && economyStore.knowledgePoints >= program.cost && !isTrainingOnCooldown(program.id)
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'"
          >
            <span v-if="isTrainingOnCooldown(program.id)">强化中</span>
            <span v-else-if="!program.available">条件不满足</span>
            <span v-else-if="economyStore.knowledgePoints < program.cost">知识点不足</span>
            <span v-else>开始强化</span>
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* 训练动画效果 */
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-shimmer {
  animation: shimmer 2s ease-in-out infinite;
}

/* 训练按钮悬停效果 */
.group:hover .text-2xl {
  transform: scale(1.1);
  transition: transform 0.3s ease;
}

/* 进度条动画 */
.h-2 {
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
