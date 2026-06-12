<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '@/stores/userStore';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/stores/userStore';
import {
  generateBattleStats,
  simulateBattle,
  generateTrainingOpponent as engineGenerateTrainingOpponent,
  trainingOutcome,
  defaultRng,
  type BattleStats,
  type BattleResult,
  type TrainingStat,
} from '@/engine';

const props = defineProps<{
  character: CharacterCard & { nurtureData: CharacterNurtureData };
}>();

const userStore = useUserStore();

// 训练动画状态
const trainingAnimations = ref<Record<string, boolean>>({});

// 启动训练动画
function startTrainingAnimation(programId: string) {
  trainingAnimations.value[programId] = true;
  // 3秒后停止动画
  setTimeout(() => {
    trainingAnimations.value[programId] = false;
  }, 3000);
}

// 训练冷却（S6 起按角色持久化在养成数据里，刷新/切换角色不再丢失）
// nowTick 仅用于驱动倒计时显示每秒刷新
const nowTick = ref(Date.now());

// 检查训练是否在冷却中
function isTrainingOnCooldown(programId: string): boolean {
  void nowTick.value;
  return userStore.isTrainingOnCooldown(props.character.id, programId);
}

// 获取训练剩余冷却时间 (秒)
function getTrainingCooldownRemaining(programId: string): number {
  void nowTick.value;
  return userStore.getTrainingCooldownRemaining(props.character.id, programId);
}

// 格式化冷却时间显示
function formatCooldownTime(seconds: number): string {
  if (seconds <= 0) return '';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`;
  }
  return `${remainingSeconds}秒`;
}

// 设置训练冷却（写入养成数据并存档）
function setTrainingCooldown(programId: string, durationMinutes: number) {
  userStore.setTrainingCooldown(props.character.id, programId, durationMinutes);
}

// 可用的训练项目
const trainingPrograms = computed(() => [
  {
    id: 'charm_training',
    name: '魅力训练',
    icon: '✨',
    description: '提升角色的魅力值',
    attribute: 'charm' as const,
    cost: 15,
    gain: 3,
    duration: 30, // 分钟
    requirements: {
      mood: 50,
      energy: 20
    },
    available: props.character.nurtureData.attributes.mood >= 50
  },
  {
    id: 'intelligence_study',
    name: '智力学习',
    icon: '🧠',
    description: '通过学习提升智力',
    attribute: 'intelligence' as const,
    cost: 20,
    gain: 4,
    duration: 45,
    requirements: {
      mood: 40,
      energy: 30
    },
    available: props.character.nurtureData.attributes.mood >= 40
  },
  {
    id: 'strength_workout',
    name: '体力锻炼',
    icon: '💪',
    description: '通过运动提升体力',
    attribute: 'strength' as const,
    cost: 12,
    gain: 5,
    duration: 60,
    requirements: {
      mood: 60,
      energy: 40
    },
    available: props.character.nurtureData.attributes.mood >= 60
  }
]);

// 战斗属性训练项目
const battleTrainingPrograms = computed(() => [
  {
    id: 'hp_training',
    name: '生命强化',
    icon: '❤️',
    description: '提升角色的生命值上限',
    stat: 'hp' as const,
    cost: 25,
    gain: 2,
    requirements: {
      affection: 200,
      strength: 60
    },
    available: props.character.nurtureData.affection >= 200 && props.character.nurtureData.attributes.strength >= 60
  },
  {
    id: 'atk_training',
    name: '攻击特训',
    icon: '⚔️',
    description: '提升角色的攻击力',
    stat: 'atk' as const,
    cost: 30,
    gain: 3,
    requirements: {
      affection: 300,
      strength: 70
    },
    available: props.character.nurtureData.affection >= 300 && props.character.nurtureData.attributes.strength >= 70
  },
  {
    id: 'def_training',
    name: '防御训练',
    icon: '🛡️',
    description: '提升角色的防御力',
    stat: 'def' as const,
    cost: 25,
    gain: 2,
    requirements: {
      affection: 250,
      intelligence: 60
    },
    available: props.character.nurtureData.affection >= 250 && props.character.nurtureData.attributes.intelligence >= 60
  },
  {
    id: 'sp_training',
    name: 'SP修炼',
    icon: '💫',
    description: '提升角色的SP值',
    stat: 'sp' as const,
    cost: 35,
    gain: 3,
    requirements: {
      affection: 400,
      intelligence: 80
    },
    available: props.character.nurtureData.affection >= 400 && props.character.nurtureData.attributes.intelligence >= 80
  },
  {
    id: 'spd_training',
    name: '速度训练',
    icon: '⚡',
    description: '提升角色的速度',
    stat: 'spd' as const,
    cost: 20,
    gain: 2,
    requirements: {
      affection: 150,
      charm: 50
    },
    available: props.character.nurtureData.affection >= 150 && props.character.nurtureData.attributes.charm >= 50
  }
]);

// 特殊活动
const specialActivities = computed(() => [
  {
    id: 'rest',
    name: '休息放松',
    icon: '😌',
    description: '恢复角色的心情和精力',
    effect: '心情 +15, 随机属性 +1',
    cost: 5,
    available: true,
    color: 'green'
  },
  {
    id: 'meditation',
    name: '冥想静心',
    icon: '🧘',
    description: '平衡各项属性，提升整体状态',
    effect: '所有属性 +2, 心情 +10',
    cost: 30,
    available: props.character.nurtureData.affection >= 200,
    color: 'purple'
  },
  {
    id: 'special_event',
    name: '特殊事件',
    icon: '🌟',
    description: '触发角色专属的特殊剧情',
    effect: '羁绊值大幅提升',
    cost: 50,
    available: props.character.nurtureData.affection >= 500,
    color: 'yellow'
  }
]);

// 执行训练
function startTraining(programId: string) {
  const program = trainingPrograms.value.find(p => p.id === programId);
  if (!program || !program.available) return;
  
  if (isTrainingOnCooldown(programId)) {
    userStore.addLog('训练还在冷却中，请稍后再试！', 'warning');
    return;
  }
  
  if (userStore.playerState.knowledgePoints < program.cost) {
    userStore.addLog('知识点不足，无法进行训练！', 'warning');
    return;
  }

  // 扣除知识点（货币唯一入口）
  if (!userStore.spend('knowledgePoints', program.cost)) return;
  
  // 提升属性
  userStore.enhanceAttribute(props.character.id, program.attribute, program.gain);
  
  // 降低心情 (训练会让角色疲惫)
  const nurtureData = userStore.getNurtureData(props.character.id);
  nurtureData.attributes.mood = Math.max(10, nurtureData.attributes.mood - 5);
  
  // 设置训练冷却 (基于训练时长)
  setTrainingCooldown(programId, program.duration);
  
  // 启动训练动画
  startTrainingAnimation(programId);
  
  userStore.addLog(`${props.character.name} 开始了${program.name}，将在${program.duration}分钟后完成！`, 'success');
  
  // 训练完成后的通知 (实际项目中可能需要后台定时任务)
  setTimeout(() => {
    userStore.addLog(`${props.character.name} 完成了${program.name}！`, 'success');
  }, program.duration * 60 * 1000);
}

// 执行战斗属性训练
function startBattleTraining(programId: string) {
  try {
    
    const program = battleTrainingPrograms.value.find(p => p.id === programId);
    if (!program) {
      console.error('Program not found:', programId);
      return;
    }
    if (!program.available) {
      return;
    }
    
    if (isTrainingOnCooldown(programId)) {
      userStore.addLog('战斗训练还在冷却中，请稍后再试！', 'warning');
      return;
    }
    
    if (!userStore.playerState || userStore.playerState.knowledgePoints < program.cost) {
      userStore.addLog('知识点不足，无法进行战斗训练！', 'warning');
      return;
    }

    // 扣除知识点（货币唯一入口）
    if (!userStore.spend('knowledgePoints', program.cost)) return;
    
    // 生成角色当前战斗状态
    const currentBattleStats = generateBattleStats(
      props.character.battle_stats || { hp: 100, atk: 50, def: 30, sp: 40, spd: 60 },
      props.character.nurtureData.attributes,
      props.character.nurtureData.battleEnhancements || { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 }
    );

    // 生成训练对手（基于训练强度）
    const trainingOpponent = generateTrainingOpponent(program.stat, currentBattleStats);

    // 模拟战斗
    const battleResult = simulateBattle(currentBattleStats, trainingOpponent, defaultRng);

    // 根据战斗结果给予奖励
    processBattleTrainingResult(program, battleResult);

    // 降低心情和体力 (高强度训练更累)
    const nurtureData = userStore.getNurtureData(props.character.id);
    nurtureData.attributes.mood = Math.max(5, nurtureData.attributes.mood - 8);
    nurtureData.attributes.strength = Math.max(10, nurtureData.attributes.strength - 3);

    // 战斗训练需要更长的冷却时间 (30分钟)
    const battleTrainingDuration = 30;
    setTrainingCooldown(programId, battleTrainingDuration);
  } catch (error) {
    console.error('Battle training error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    userStore.addLog(`战斗训练出错：${errorMessage}`, 'warning');
  }

  // 启动战斗训练动画
  startTrainingAnimation(programId);
}

// 生成训练对手（规则在 engine/nurture）
function generateTrainingOpponent(trainingStat: string, playerStats: BattleStats): BattleStats {
  return engineGenerateTrainingOpponent(trainingStat as TrainingStat, playerStats);
}

// 处理战斗训练结果
function processBattleTrainingResult(
  program: { name: string; stat: TrainingStat; gain: number },
  battleResult: BattleResult,
) {
  const characterId = props.character.id;
  
  // 数值结算规则在 engine/nurture（胜 100%/25 经验，负 40%/10，平 70%/18）
  const outcome = trainingOutcome(battleResult.winner, program.gain);
  userStore.enhanceBattleStat(characterId, program.stat, outcome.gain);
  userStore.addCharacterExp(characterId, outcome.exp);

  if (battleResult.winner === 'attacker') {
    const bonusMessage = battleResult.isCriticalHit ? '表现出色，' : '';
    userStore.addLog(
      `🎉 ${props.character.name} 在${program.name}中获胜！${bonusMessage}${program.stat.toUpperCase()}提升${outcome.gain}%！`,
      'success'
    );
  } else if (battleResult.winner === 'defender') {
    userStore.addLog(
      `😔 ${props.character.name} 在${program.name}中落败，但从失败中学习。${program.stat.toUpperCase()}提升${outcome.gain}%！`,
      'warning'
    );
  } else {
    userStore.addLog(
      `⚡ ${props.character.name} 在${program.name}中打成平手！势均力敌的较量让实力提升。${program.stat.toUpperCase()}提升${outcome.gain}%！`,
      'info'
    );
  }
}

// 执行特殊活动
function performSpecialActivity(activityId: string) {
  const activity = specialActivities.value.find(a => a.id === activityId);
  if (!activity || !activity.available) return;
  
  if (userStore.playerState.knowledgePoints < activity.cost) {
    userStore.addLog('知识点不足！', 'warning');
    return;
  }

  if (!userStore.spend('knowledgePoints', activity.cost)) return;
  const nurtureData = userStore.getNurtureData(props.character.id);

  switch (activityId) {
    case 'rest':
      nurtureData.attributes.mood = Math.min(100, nurtureData.attributes.mood + 15);
      // 随机提升一个属性
      const attrs = ['charm', 'intelligence', 'strength'] as const;
      const randomAttr = attrs[Math.floor(Math.random() * attrs.length)];
      userStore.enhanceAttribute(props.character.id, randomAttr, 1);
      break;
      
    case 'meditation':
      userStore.enhanceAttribute(props.character.id, 'charm', 2);
      userStore.enhanceAttribute(props.character.id, 'intelligence', 2);
      userStore.enhanceAttribute(props.character.id, 'strength', 2);
      nurtureData.attributes.mood = Math.min(100, nurtureData.attributes.mood + 10);
      break;
      
    case 'special_event':
      userStore.increaseAffection(props.character.id, 100);
      nurtureData.specialEvents.push(`special_event_${Date.now()}`);
      break;
  }
  
  userStore.addLog(`${props.character.name} 进行了${activity.name}！`, 'success');
}

// 获取属性进度百分比
function getAttributeProgress(value: number) {
  return (value / 100) * 100;
}

// 定期更新冷却时间显示
let cooldownUpdateInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  // 每秒更新一次冷却时间显示
  cooldownUpdateInterval = setInterval(() => {
    // 每秒推进时钟，驱动倒计时显示刷新（冷却数据本体在养成存档里）
    nowTick.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (cooldownUpdateInterval !== null) {
    clearInterval(cooldownUpdateInterval);
  }
});
</script>

<template>
  <div class="p-6">

    <!-- 当前资源显示 -->
    <div class="bg-warm-300/30 rounded-lg p-4 mb-6">
      <div class="flex items-center justify-between text-sm">
        <div class="flex items-center">
          <span class="text-gray-600">可用知识点:</span>
          <span class="ml-2 font-bold text-blue-400">{{ userStore.playerState.knowledgePoints }}</span>
        </div>
        <div class="flex items-center">
          <span class="text-gray-600">心情值:</span>
          <span 
            class="ml-2 font-bold"
            :class="{
              'text-teal-primary': character.nurtureData.attributes.mood >= 70,
              'text-yellow-400': character.nurtureData.attributes.mood >= 40,
              'text-red-400': character.nurtureData.attributes.mood < 40
            }"
          >
            {{ character.nurtureData.attributes.mood }}
          </span>
        </div>
      </div>
    </div>

    <!-- 养成属性训练区域 -->
    <div class="mb-6">
      <h3 class="text-lg font-medium text-gray-600 mb-4">养成属性训练</h3>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        <div 
          v-for="program in trainingPrograms" 
          :key="program.id"
          class="group"
        >
          <div 
            class="p-4 rounded-lg border transition-all duration-300 relative overflow-hidden h-full"
            :class="[
              program.available 
                ? 'bg-warm-300/50 hover:bg-warm-300/70 border-warm-300 hover:border-warm-300' 
                : 'bg-cream-100/50 border-warm-400 opacity-60',
              trainingAnimations[program.id] && 'animate-pulse border-blue-400'
            ]"
          >
            <!-- 训练进行中的光效 -->
            <div 
              v-if="trainingAnimations[program.id]" 
              class="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-transparent to-blue-400/20 animate-shimmer"
            ></div>
            
            <!-- 头部信息 -->
            <div class="text-center mb-3">
              <div class="text-3xl mb-2 group-hover:scale-110 transition-transform">{{ program.icon }}</div>
              <h4 class="font-medium text-white text-sm mb-1">{{ program.name }}</h4>
              <p class="text-xs text-gray-600 mb-2">{{ program.description }}</p>
              
              <div class="flex justify-between items-center text-xs">
                <span class="text-teal-primary font-medium">+{{ program.gain }}</span>
                <span class="text-gray-600">💎 {{ program.cost }}</span>
              </div>
            </div>

            <!-- 当前属性进度条 -->
            <div class="mb-3">
              <div class="flex justify-between text-xs text-gray-600 mb-1">
                <span>{{ program.attribute }}</span>
                <span>{{ character.nurtureData.attributes[program.attribute] }}/100</span>
              </div>
              <div class="w-full bg-warm-400 rounded-full h-2">
                <div 
                  class="h-2 rounded-full transition-all duration-500"
                  :class="{
                    'bg-pink-400': program.attribute === 'charm',
                    'bg-blue-400': program.attribute === 'intelligence',
                    'bg-teal-light': program.attribute === 'strength'
                  }"
                  :style="{ width: `${getAttributeProgress(character.nurtureData.attributes[program.attribute])}%` }"
                ></div>
              </div>
            </div>

            <!-- 冷却时间显示 -->
            <div v-if="isTrainingOnCooldown(program.id)" class="mb-2 text-xs text-orange-400 text-center">
              冷却中: {{ formatCooldownTime(getTrainingCooldownRemaining(program.id)) }}
            </div>

            <!-- 行动按钮 -->
            <button
              @click="startTraining(program.id)"
              :disabled="!program.available || userStore.playerState.knowledgePoints < program.cost || isTrainingOnCooldown(program.id)"
              class="w-full py-2 px-3 rounded-lg font-medium text-sm transition-all duration-300"
              :class="program.available && userStore.playerState.knowledgePoints >= program.cost && !isTrainingOnCooldown(program.id)
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-warm-400 text-gray-600 cursor-not-allowed'"
            >
              <span v-if="isTrainingOnCooldown(program.id)">训练中</span>
              <span v-else-if="!program.available">心情不足</span>
              <span v-else-if="userStore.playerState.knowledgePoints < program.cost">知识点不足</span>
              <span v-else>开始训练</span>
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- 战斗属性训练区域 -->
    <div class="mb-6">
      <h3 class="text-lg font-medium text-gray-600 mb-4 flex items-center">
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
                : 'bg-cream-100/50 border-warm-400 opacity-60',
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
              <p class="text-xs text-gray-600 mb-2">{{ program.description }}</p>
              
              <div class="flex justify-between items-center text-xs">
                <span class="text-red-400 font-medium">+{{ program.gain }}%</span>
                <span class="text-gray-600">💎 {{ program.cost }}</span>
              </div>
            </div>

            <!-- 当前战斗属性加成 -->
            <div class="mb-3">
              <div class="flex justify-between text-xs text-gray-600 mb-1">
                <span>{{ program.stat.toUpperCase() }}加成</span>
                <span>{{ character.nurtureData.battleEnhancements?.[program.stat] || 0 }}%</span>
              </div>
              <div class="w-full bg-warm-400 rounded-full h-2">
                <div 
                  class="h-2 rounded-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-500"
                  :style="{ width: `${Math.min(100, character.nurtureData.battleEnhancements?.[program.stat] || 0)}%` }"
                ></div>
              </div>
            </div>

            <!-- 需求条件 -->
            <div class="mb-3 text-xs text-gray-600 text-center">
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
              :disabled="!program.available || userStore.playerState.knowledgePoints < program.cost || isTrainingOnCooldown(program.id)"
              class="w-full py-2 px-3 rounded-lg font-medium text-sm transition-all duration-300"
              :class="program.available && userStore.playerState.knowledgePoints >= program.cost && !isTrainingOnCooldown(program.id)
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-warm-400 text-gray-600 cursor-not-allowed'"
            >
              <span v-if="isTrainingOnCooldown(program.id)">强化中</span>
              <span v-else-if="!program.available">条件不满足</span>
              <span v-else-if="userStore.playerState.knowledgePoints < program.cost">知识点不足</span>
              <span v-else>开始强化</span>
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- 特殊活动区域 -->
    <div>
      <h3 class="text-lg font-medium text-gray-600 mb-4">特殊活动</h3>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        <div 
          v-for="activity in specialActivities" 
          :key="activity.id"
          class="group"
        >
          <div 
            class="p-4 rounded-lg border transition-all duration-300 h-full"
            :class="activity.available 
              ? `bg-${activity.color}-600/10 hover:bg-${activity.color}-600/20 border-${activity.color}-600/30`
              : 'bg-cream-100/50 border-warm-400 opacity-60'"
          >
            <!-- 头部信息 -->
            <div class="text-center mb-3">
              <div class="text-3xl mb-2 group-hover:scale-110 transition-transform">{{ activity.icon }}</div>
              <h4 class="font-medium text-white text-sm mb-1">{{ activity.name }}</h4>
              <p class="text-xs text-gray-600 mb-2">{{ activity.description }}</p>
              <div class="text-xs text-gray-600">💎 {{ activity.cost }}</div>
            </div>

            <div class="text-xs text-gray-600 mb-3 text-center">{{ activity.effect }}</div>

            <!-- 需求条件显示 -->
            <div v-if="!activity.available || userStore.playerState.knowledgePoints < activity.cost" class="mb-3 text-xs text-gray-600 text-center">
              <span>需要: </span>
              <span v-if="activity.id === 'meditation' && character.nurtureData.affection < 200">羁绊值200+ </span>
              <span v-if="activity.id === 'special_event' && character.nurtureData.affection < 500">羁绊值500+ </span>
              <span v-if="userStore.playerState.knowledgePoints < activity.cost">知识点{{ activity.cost }}+ </span>
            </div>

            <button
              @click="performSpecialActivity(activity.id)"
              :disabled="!activity.available || userStore.playerState.knowledgePoints < activity.cost"
              class="w-full py-2 px-3 rounded-lg font-medium text-sm transition-all duration-300"
              :class="activity.available && userStore.playerState.knowledgePoints >= activity.cost
                ? `bg-${activity.color}-600 hover:bg-${activity.color}-700 text-white`
                : 'bg-warm-400 text-gray-600 cursor-not-allowed'"
            >
              <span v-if="!activity.available">条件不满足</span>
              <span v-else-if="userStore.playerState.knowledgePoints < activity.cost">知识点不足</span>
              <span v-else>进行活动</span>
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- TODO: 添加更多养成功能 -->
    <!-- 
    - 训练计划系统
    - 自动训练功能
    - 训练效果加成
    - 属性上限突破
    - 成就系统
    -->

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