<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/stores/userStore';

const props = defineProps<{
  character: CharacterCard & { nurtureData: CharacterNurtureData };
}>();

const emit = defineEmits<{
  startDialogue: [];
}>();

const userStore = useUserStore();

// Tailwind JIT 需要完整字面类名，禁止模板字符串拼接颜色类
const INTERACTION_COLOR_CLASSES: Record<string, string> = {
  blue:   'bg-blue-600/10 hover:bg-blue-600/20 border-blue-600/30 hover:border-blue-600/50',
  pink:   'bg-pink-600/10 hover:bg-pink-600/20 border-pink-600/30 hover:border-pink-600/50',
  green:  'bg-green-600/10 hover:bg-green-600/20 border-green-600/30 hover:border-green-600/50',
  purple: 'bg-purple-600/10 hover:bg-purple-600/20 border-purple-600/30 hover:border-purple-600/50',
};

// 当前选中的互动类型
const selectedInteractionType = ref<'dialogue' | 'gift' | 'activity' | 'campus_activity' | null>(null);

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
  const mood = props.character.nurtureData.attributes.mood;
  const affection = props.character.nurtureData.affection;
  
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
      available: userStore.playerState.knowledgePoints >= 10,
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

// 执行互动
function executeInteraction(interactionId: string) {
  switch (interactionId) {
    case 'dialogue':
      emit('startDialogue');
      break;
    case 'gift':
      openGiftSelection();
      break;
    case 'activity':
      openActivitySelection();
      break;
    case 'campus_activity':
      startCampusActivity();
      break;
  }
}

// 打开礼物选择
function openGiftSelection() {
  selectedInteractionType.value = 'gift';
}

// 打开活动选择
function openActivitySelection() {
  selectedInteractionType.value = 'activity';
}

// 开始校园活动
function startCampusActivity() {
  selectedInteractionType.value = 'campus_activity';
}

// 关闭选择界面
function closeSelection() {
  selectedInteractionType.value = null;
}

// 赠送礼物
function giveGift(gift: any) {
  if (userStore.playerState.knowledgePoints < gift.cost) {
    userStore.addLog('知识点不足，无法赠送礼物！', 'warning');
    return;
  }

  // 扣除知识点（货币唯一入口）
  if (!userStore.spend('knowledgePoints', gift.cost)) return;
  
  // 增加好感度
  userStore.increaseAffection(props.character.id, gift.affectionGain);
  
  // 应用其他效果
  const nurtureData = userStore.getNurtureData(props.character.id);
  if (gift.moodGain) {
    nurtureData.attributes.mood = Math.min(100, nurtureData.attributes.mood + gift.moodGain);
  }
  if (gift.charmGain) {
    userStore.enhanceAttribute(props.character.id, 'charm', gift.charmGain);
  }
  if (gift.intelligenceGain) {
    userStore.enhanceAttribute(props.character.id, 'intelligence', gift.intelligenceGain);
  }
  
  // 记录礼物
  nurtureData.gifts.push(gift.id);
  userStore.addLog(`${props.character.name} 收到了${gift.name}，看起来很开心！`, 'success');
  
  closeSelection();
}

// 进行活动
function doActivity(activity: any) {
  const affection = props.character.nurtureData.affection;
  
  if (affection < activity.requirements.affection) {
    userStore.addLog('羁绊值不足，无法进行此活动！', 'warning');
    return;
  }
  
  if (userStore.playerState.knowledgePoints < activity.cost) {
    userStore.addLog('知识点不足，无法进行活动！', 'warning');
    return;
  }

  // 扣除知识点（货币唯一入口）
  if (!userStore.spend('knowledgePoints', activity.cost)) return;
  
  // 增加好感度
  userStore.increaseAffection(props.character.id, activity.affectionGain);
  
  // 应用其他效果
  const nurtureData = userStore.getNurtureData(props.character.id);
  if (activity.moodGain) {
    nurtureData.attributes.mood = Math.min(100, nurtureData.attributes.mood + activity.moodGain);
  }
  if (activity.charmGain) {
    userStore.enhanceAttribute(props.character.id, 'charm', activity.charmGain);
  }
  if (activity.intelligenceGain) {
    userStore.enhanceAttribute(props.character.id, 'intelligence', activity.intelligenceGain);
  }
  if (activity.strengthGain) {
    userStore.enhanceAttribute(props.character.id, 'strength', activity.strengthGain);
  }
  
  // 记录活动
  userStore.interactWithCharacter(props.character.id, activity.id);
  userStore.addLog(`${props.character.name} 和你一起${activity.name}，度过了愉快的时光！`, 'success');
  
  closeSelection();
}

// 进行校园活动
function doCampusActivity(activity: any) {
  const affection = props.character.nurtureData.affection;
  const mood = props.character.nurtureData.attributes.mood;
  
  if (affection < activity.requirements.affection || mood < activity.requirements.mood) {
    userStore.addLog('条件不满足，无法参加校园活动！', 'warning');
    return;
  }
  
  if (userStore.playerState.knowledgePoints < activity.cost) {
    userStore.addLog('知识点不足，无法参加活动！', 'warning');
    return;
  }

  // 扣除知识点（货币唯一入口）
  if (!userStore.spend('knowledgePoints', activity.cost)) return;
  
  // 增加羁绊值
  userStore.increaseAffection(props.character.id, activity.affectionGain);
  
  // 应用其他效果
  const nurtureData = userStore.getNurtureData(props.character.id);
  if (activity.moodGain) {
    nurtureData.attributes.mood = Math.min(100, nurtureData.attributes.mood + activity.moodGain);
  }
  if (activity.charmGain) {
    userStore.enhanceAttribute(props.character.id, 'charm', activity.charmGain);
  }
  if (activity.strengthGain) {
    userStore.enhanceAttribute(props.character.id, 'strength', activity.strengthGain);
  }
  if (activity.intelligenceGain) {
    userStore.enhanceAttribute(props.character.id, 'intelligence', activity.intelligenceGain);
  }
  
  // 记录特殊事件
  nurtureData.specialEvents.push(`campus_${activity.id}_${Date.now()}`);
  userStore.addLog(`${props.character.name} 和你一起参加了${activity.name}，增进了彼此的了解！`, 'success');
  
  closeSelection();
}

// 检查活动是否可用
function isActivityAvailable(activity: any) {
  return props.character.nurtureData.affection >= activity.requirements.affection;
}

// 检查校园活动是否可用
function isCampusActivityAvailable(activity: any) {
  const affection = props.character.nurtureData.affection;
  const mood = props.character.nurtureData.attributes.mood;
  return affection >= activity.requirements.affection && mood >= activity.requirements.mood;
}

// 简单的聊天互动
function quickChat() {
  const chatTopics = [
    { id: 'weather', text: '今天天气真好呢', affectionGain: 5 },
    { id: 'hobby', text: '你平时都有什么爱好？', affectionGain: 8 },
    { id: 'anime', text: '最近看了什么好看的动画吗？', affectionGain: 10 },
    { id: 'compliment', text: '你今天看起来很不错！', affectionGain: 15 }
  ];
  
  const randomTopic = chatTopics[Math.floor(Math.random() * chatTopics.length)];
  userStore.increaseAffection(props.character.id, randomTopic.affectionGain);
  userStore.interactWithCharacter(props.character.id, randomTopic.id);
}

// 快速赠送小礼物
function quickGift() {
  if (userStore.playerState.knowledgePoints >= 25) { // 从10增至25
    const smallGifts = ['flower', 'candy', 'book', 'music_cd'];
    const randomGift = smallGifts[Math.floor(Math.random() * smallGifts.length)];
    
    userStore.spend('knowledgePoints', 25); // 从10增至25（上方已校验余额）
    userStore.giveGift(props.character.id, randomGift);
    userStore.increaseAffection(props.character.id, 15); // 从20降至15，降低效率
  }
}
</script>

<template>
  <div class="p-6">

    <!-- 快速互动按钮 -->
    <div class="mb-6">
      <h3 class="text-lg font-medium text-ink-2 mb-4">快速互动</h3>
      <div class="grid grid-cols-2 gap-4">
        
        <!-- 快速聊天 -->
        <button 
          @click="quickChat"
          class="flex items-center p-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/30 rounded-lg transition-all duration-300 group"
        >
          <div class="text-2xl mr-3 group-hover:scale-110 transition-transform">💬</div>
          <div class="flex-1">
            <div class="text-sm font-medium text-blue-400 mb-1">随便聊聊</div>
            <div class="text-xs text-ink-2">+5-15 羁绊值</div>
          </div>
        </button>

        <!-- 快速送礼 -->
        <button 
          @click="quickGift"
          :disabled="userStore.playerState.knowledgePoints < 25"
          :class="[
            'flex items-center p-4 border rounded-lg transition-all duration-300 group',
            userStore.playerState.knowledgePoints >= 25
              ? 'bg-pink-600/20 hover:bg-pink-600/30 border-pink-600/30'
              : 'bg-surface-2/50 border-line/60 opacity-50 cursor-not-allowed'
          ]"
        >
          <div class="text-2xl mr-3 group-hover:scale-110 transition-transform">🎁</div>
          <div class="flex-1">
            <div 
              class="text-sm font-medium mb-1"
              :class="userStore.playerState.knowledgePoints >= 25 ? 'text-pink-400' : 'text-ink-3'"
            >
              小礼物
            </div>
            <div class="text-xs text-ink-2">25 知识点</div>
          </div>
        </button>

      </div>
    </div>

    <!-- 主要互动选项 -->
    <div>
      <h3 class="text-lg font-medium text-ink-2 mb-4">深度互动</h3>
      <div class="grid grid-cols-2 gap-4">
        
        <button
          v-for="interaction in availableInteractions" 
          :key="interaction.id"
          @click="executeInteraction(interaction.id)"
          :disabled="!interaction.available"
          :class="[
            'flex items-center p-4 rounded-lg border transition-all duration-300 group',
            interaction.available
              ? (INTERACTION_COLOR_CLASSES[interaction.color] ?? INTERACTION_COLOR_CLASSES.blue)
              : 'bg-surface-2/40 border-line/60 opacity-50 cursor-not-allowed'
          ]"
        >
          <div class="text-2xl mr-3 group-hover:scale-110 transition-transform">
            {{ interaction.icon }}
          </div>
          <div class="flex-1">
            <h4 
              class="font-medium text-sm mb-1"
              :class="interaction.available ? 'text-ink' : 'text-ink-3'"
            >
              {{ interaction.name }}
            </h4>
            <p 
              class="text-xs mb-2"
              :class="interaction.available ? 'text-ink-2' : 'text-ink-2'"
            >
              {{ interaction.description }}
            </p>
            
            <!-- 成本和状态显示 -->
            <div class="flex justify-between items-center">
              <div v-if="interaction.cost.type === 'knowledge'" class="text-xs text-ink-2">
                💎 {{ interaction.cost.amount }}
              </div>
              <div v-if="!interaction.available" class="text-xs text-red-400">
                <!-- 显示不可用原因 -->
                <span v-if="interaction.id === 'gift' && userStore.playerState.knowledgePoints < 10">
                  知识点不足
                </span>
                <span v-else-if="interaction.id === 'activity' && character.nurtureData.affection < 100">
                  羁绊值不足
                </span>
                <span v-else-if="interaction.id === 'campus_activity'">
                  条件不满足
                </span>
              </div>
            </div>
          </div>
        </button>

      </div>
    </div>

    <!-- 礼物选择模态框 -->
    <div v-if="selectedInteractionType === 'gift'" class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" @click.self="closeSelection">
      <div class="bg-elevated p-6 rounded-lg shadow-xl max-w-2xl w-full border border-line-2 max-h-[80vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-ink flex items-center">
            <span class="text-2xl mr-2">🎁</span>
            选择礼物
          </h3>
          <button @click="closeSelection" class="text-ink-2 hover:text-ink text-2xl font-bold">&times;</button>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div 
            v-for="gift in availableGifts" 
            :key="gift.id"
            class="group cursor-pointer bg-surface-2/50 hover:bg-surface-2 rounded-lg p-4 border border-line hover:border-line transition-all duration-300"
            :class="{
              'border-yellow-500/50': gift.rarity === 'rare',
              'border-purple-500/50': gift.rarity === 'uncommon',
              'border-line': gift.rarity === 'common'
            }"
            @click="giveGift(gift)"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center">
                <div class="text-2xl mr-3">{{ gift.icon }}</div>
                <div>
                  <h4 class="font-medium text-ink">{{ gift.name }}</h4>
                  <p class="text-sm text-ink-2">{{ gift.description }}</p>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm font-medium text-pink-400">+{{ gift.affectionGain }}</div>
                <div class="text-xs text-ink-2">💎 {{ gift.cost }}</div>
              </div>
            </div>
            
            <!-- 效果预览 -->
            <div class="text-xs text-ink-2 space-y-1">
              <div v-if="gift.moodGain">心情 +{{ gift.moodGain }}</div>
              <div v-if="gift.charmGain">魅力 +{{ gift.charmGain }}</div>
              <div v-if="gift.intelligenceGain">智力 +{{ gift.intelligenceGain }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 活动选择模态框 -->
    <div v-if="selectedInteractionType === 'activity'" class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" @click.self="closeSelection">
      <div class="bg-elevated p-6 rounded-lg shadow-xl max-w-2xl w-full border border-line-2 max-h-[80vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-ink flex items-center">
            <span class="text-2xl mr-2">🎯</span>
            选择活动
          </h3>
          <button @click="closeSelection" class="text-ink-2 hover:text-ink text-2xl font-bold">&times;</button>
        </div>
        
        <div class="space-y-3">
          <div 
            v-for="activity in availableActivities" 
            :key="activity.id"
            class="group cursor-pointer bg-surface-2/50 rounded-lg p-4 border transition-all duration-300"
            :class="isActivityAvailable(activity)
              ? 'hover:bg-surface-2 border-line hover:border-line'
              : 'border-line-2 opacity-50 cursor-not-allowed'"
            @click="isActivityAvailable(activity) && doActivity(activity)"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center">
                <div class="text-2xl mr-3">{{ activity.icon }}</div>
                <div>
                  <h4 class="font-medium text-ink">{{ activity.name }}</h4>
                  <p class="text-sm text-ink-2">{{ activity.description }}</p>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm font-medium text-accent">+{{ activity.affectionGain }}</div>
                <div class="text-xs text-ink-2">💎 {{ activity.cost }}</div>
                <div class="text-xs text-ink-2">{{ activity.duration }}分钟</div>
              </div>
            </div>
            
            <!-- 需求条件 -->
            <div class="text-xs text-ink-2 mb-2">
              需要羁绊值: {{ activity.requirements.affection }}+
            </div>
            
            <!-- 效果预览 -->
            <div class="text-xs text-ink-2 space-y-1">
              <div v-if="activity.moodGain">心情 +{{ activity.moodGain }}</div>
              <div v-if="activity.charmGain">魅力 +{{ activity.charmGain }}</div>
              <div v-if="activity.intelligenceGain">智力 +{{ activity.intelligenceGain }}</div>
              <div v-if="activity.strengthGain">体力 +{{ activity.strengthGain }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 校园活动选择模态框 -->
    <div v-if="selectedInteractionType === 'campus_activity'" class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" @click.self="closeSelection">
      <div class="bg-elevated p-6 rounded-lg shadow-xl max-w-2xl w-full border border-line-2 max-h-[80vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-ink flex items-center">
            <span class="text-2xl mr-2">🎓</span>
            选择校园活动
          </h3>
          <button @click="closeSelection" class="text-ink-2 hover:text-ink text-2xl font-bold">&times;</button>
        </div>
        
        <div class="space-y-4">
          <div 
            v-for="activity in campusActivities" 
            :key="activity.id"
            class="group cursor-pointer bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-lg p-4 border transition-all duration-300"
            :class="isCampusActivityAvailable(activity)
              ? 'hover:from-blue-600/20 hover:to-purple-600/20 border-blue-600/30 hover:border-blue-600/50'
              : 'border-line-2 opacity-50 cursor-not-allowed from-gray-700/10 to-gray-700/10'"
            @click="isCampusActivityAvailable(activity) && doCampusActivity(activity)"
          >
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center">
                <div class="text-3xl mr-4">{{ activity.icon }}</div>
                <div>
                  <h4 class="font-medium text-ink text-lg">{{ activity.name }}</h4>
                  <p class="text-sm text-ink-2">{{ activity.description }}</p>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm font-medium text-purple-400">+{{ activity.affectionGain }}</div>
                <div class="text-xs text-ink-2">💎 {{ activity.cost }}</div>
                <div class="text-xs text-ink-2">{{ activity.duration }}分钟</div>
              </div>
            </div>
            
            <!-- 需求条件 -->
            <div class="text-xs text-ink-2 mb-2">
              需要羁绊值: {{ activity.requirements.affection }}+, 心情: {{ activity.requirements.mood }}+
            </div>
            
            <!-- 效果预览 -->
            <div class="text-xs text-ink-2 flex space-x-4">
              <div v-if="activity.moodGain">心情 +{{ activity.moodGain }}</div>
              <div v-if="activity.charmGain">魅力 +{{ activity.charmGain }}</div>
              <div v-if="activity.strengthGain">体力 +{{ activity.strengthGain }}</div>
              <div v-if="activity.intelligenceGain">智力 +{{ activity.intelligenceGain }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 当前角色状态提示 -->
    <div class="mt-6 p-4 bg-surface-2/30 rounded-lg">
      <div class="flex items-center text-sm text-ink-2">
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>{{ character.name }} 目前心情 
          <span :class="{
            'text-pink-400': character.nurtureData.attributes.mood >= 80,
            'text-accent': character.nurtureData.attributes.mood >= 60,
            'text-yellow-400': character.nurtureData.attributes.mood >= 40,
            'text-orange-400': character.nurtureData.attributes.mood >= 20,
            'text-red-400': character.nurtureData.attributes.mood < 20
          }">
            {{ character.nurtureData.attributes.mood >= 80 ? '很好' : 
               character.nurtureData.attributes.mood >= 60 ? '不错' :
               character.nurtureData.attributes.mood >= 40 ? '一般' :
               character.nurtureData.attributes.mood >= 20 ? '较差' : '很差' }}
          </span>
        </span>
      </div>
    </div>

  </div>
</template>