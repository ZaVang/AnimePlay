import { ref, computed } from 'vue';
import { useEconomyStore } from '@/stores/modules/economyStore';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/stores/userStore';

export function useInteractionData(
  character: CharacterCard & { nurtureData: CharacterNurtureData }
) {
  const economyStore = useEconomyStore();

  // 礼物系统数据 - 重新平衡消耗和收益
  const availableGifts = ref([
    {
      id: 'flower',
      name: '鲜花',
      icon: '🌹',
      description: '美丽的玫瑰花',
      cost: 35, // 从15增至35，提高成本
      affectionGain: 20, // 从25降至20，降低效率
      moodGain: 8, // 从10降至8
      rarity: 'common'
    },
    {
      id: 'chocolate',
      name: '巧克力',
      icon: '🍫',
      description: '香甜的手工巧克力',
      cost: 45, // 从20增至45
      affectionGain: 25, // 从30降至25
      moodGain: 12, // 从15降至12
      rarity: 'common'
    },
    {
      id: 'book',
      name: '书籍',
      icon: '📚',
      description: '有趣的小说',
      cost: 60, // 从25增至60
      affectionGain: 30, // 从35降至30
      intelligenceGain: 4, // 从5降至4
      rarity: 'uncommon'
    },
    {
      id: 'music_cd',
      name: '音乐CD',
      icon: '💿',
      description: '她喜欢的音乐专辑',
      cost: 75, // 从30增至75
      affectionGain: 35, // 从40降至35
      moodGain: 15, // 从20降至15
      rarity: 'uncommon'
    },
    {
      id: 'jewelry',
      name: '首饰',
      icon: '💎',
      description: '精致的项链',
      cost: 120, // 从50增至120
      affectionGain: 50, // 从60降至50
      charmGain: 8, // 从10降至8
      rarity: 'rare'
    },
    {
      id: 'plushie',
      name: '毛绒玩具',
      icon: '🧸',
      description: '可爱的泰迪熊',
      cost: 90, // 从35增至90
      affectionGain: 40, // 从45降至40
      moodGain: 20, // 从25降至20
      rarity: 'uncommon'
    }
  ]);

  // 活动系统数据 - 重新平衡消耗和收益
  const availableActivities = ref([
    {
      id: 'movie',
      name: '看电影',
      icon: '🎬',
      description: '一起看一部有趣的电影',
      cost: 80, // 从30增至80
      affectionGain: 35, // 从40降至35
      moodGain: 12, // 从15降至12
      duration: 120,
      requirements: { affection: 100 }
    },
    {
      id: 'cafe',
      name: '咖啡厅',
      icon: '☕',
      description: '在安静的咖啡厅聊天',
      cost: 70, // 从25增至70
      affectionGain: 30, // 从35降至30
      intelligenceGain: 4, // 从5降至4
      duration: 90,
      requirements: { affection: 150 }
    },
    {
      id: 'shopping',
      name: '购物',
      icon: '🛍️',
      description: '一起逛街购物',
      cost: 100, // 从40增至100
      affectionGain: 45, // 从50降至45
      charmGain: 6, // 从8降至6
      duration: 150,
      requirements: { affection: 200 }
    },
    {
      id: 'park',
      name: '公园散步',
      icon: '🌳',
      description: '在公园里悠闲散步',
      cost: 15,
      affectionGain: 30,
      strengthGain: 3,
      duration: 60,
      requirements: { affection: 80 }
    },
    {
      id: 'cooking',
      name: '一起做饭',
      icon: '👩‍🍳',
      description: '学习制作美味料理',
      cost: 35,
      affectionGain: 45,
      intelligenceGain: 7,
      duration: 100,
      requirements: { affection: 250 }
    }
  ]);

  // 校园活动数据
  const campusActivities = ref([
    {
      id: 'study_together',
      name: '一起学习',
      icon: '📚',
      description: '在图书馆一起温习功课',
      cost: 60,
      affectionGain: 80,
      moodGain: 20,
      intelligenceGain: 8,
      duration: 120,
      requirements: { affection: 600, mood: 70 }
    },
    {
      id: 'campus_walk',
      name: '校园散步',
      icon: '🌸',
      description: '在樱花飞舞的校园里悠闲漫步',
      cost: 40,
      affectionGain: 60,
      moodGain: 25,
      strengthGain: 3,
      duration: 90,
      requirements: { affection: 500, mood: 60 }
    },
    {
      id: 'school_festival',
      name: '校园祭',
      icon: '🎪',
      description: '参加热闹的校园文化祭',
      cost: 80,
      affectionGain: 100,
      moodGain: 35,
      charmGain: 5,
      duration: 180,
      requirements: { affection: 650, mood: 80 }
    },
    {
      id: 'club_activity',
      name: '社团活动',
      icon: '🎭',
      description: '参加社团的日常活动',
      cost: 50,
      affectionGain: 70,
      moodGain: 20,
      charmGain: 6,
      duration: 100,
      requirements: { affection: 400, mood: 50 }
    }
  ]);

  // 可用的互动选项
  const availableInteractions = computed(() => {
    const mood = character.nurtureData.attributes.mood;
    const affection = character.nurtureData.affection;
    
    return [
      {
        id: 'dialogue',
        name: '对话聊天',
        icon: '💬',
        description: '与角色进行深入对话',
        available: true,
        cost: { type: 'none' },
        color: 'blue'
      },
      {
        id: 'gift',
        name: '赠送礼物',
        icon: '🎁',
        description: '送礼物增进感情',
        available: economyStore.knowledgePoints >= 10,
        cost: { type: 'knowledge', amount: 10 },
        color: 'pink'
      },
      {
        id: 'activity',
        name: '一起活动',
        icon: '🎯',
        description: '进行各种活动提升属性',
        available: affection >= 100,
        cost: { type: 'knowledge', amount: 20 },
        color: 'green'
      },
      {
        id: 'campus_activity',
        name: '校园活动',
        icon: '🎓',
        description: '参加校园里的特色活动',
        available: affection >= 400 && mood >= 50,
        cost: { type: 'knowledge', amount: 50 },
        color: 'purple'
      }
    ];
  });

  // 检查活动是否可用
  function isActivityAvailable(activity: any) {
    return character.nurtureData.affection >= activity.requirements.affection;
  }

  // 检查校园活动是否可用
  function isCampusActivityAvailable(activity: any) {
    const affection = character.nurtureData.affection;
    const mood = character.nurtureData.attributes.mood;
    return affection >= activity.requirements.affection && mood >= activity.requirements.mood;
  }

  return {
    availableGifts,
    availableActivities,
    campusActivities,
    availableInteractions,
    isActivityAvailable,
    isCampusActivityAvailable
  };
}