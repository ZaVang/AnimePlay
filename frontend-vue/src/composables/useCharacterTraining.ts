import { computed } from 'vue';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/stores/userStore';

export function useCharacterTraining(
  character: CharacterCard & { nurtureData: CharacterNurtureData }
) {
  // No store needed for this composable - it only provides data structures

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
      available: character.nurtureData.attributes.mood >= 50
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
      available: character.nurtureData.attributes.mood >= 40
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
      available: character.nurtureData.attributes.mood >= 60
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
      available: character.nurtureData.affection >= 200 && character.nurtureData.attributes.strength >= 60
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
      available: character.nurtureData.affection >= 300 && character.nurtureData.attributes.strength >= 70
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
      available: character.nurtureData.affection >= 250 && character.nurtureData.attributes.intelligence >= 60
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
      available: character.nurtureData.affection >= 400 && character.nurtureData.attributes.intelligence >= 80
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
      available: character.nurtureData.affection >= 150 && character.nurtureData.attributes.charm >= 50
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
      available: character.nurtureData.affection >= 200,
      color: 'purple'
    },
    {
      id: 'special_event',
      name: '特殊事件',
      icon: '🌟',
      description: '触发角色专属的特殊剧情',
      effect: '羁绊值大幅提升',
      cost: 50,
      available: character.nurtureData.affection >= 500,
      color: 'yellow'
    }
  ]);

  // 获取属性进度百分比
  function getAttributeProgress(value: number) {
    return (value / 100) * 100;
  }

  return {
    trainingPrograms,
    battleTrainingPrograms,
    specialActivities,
    getAttributeProgress
  };
}