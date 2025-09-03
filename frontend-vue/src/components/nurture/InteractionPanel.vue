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

// 当前选中的互动类型
const selectedInteractionType = ref<'dialogue' | 'gift' | 'activity' | 'date' | null>(null);

// 礼物系统数据
const availableGifts = ref([
  {
    id: 'flower',
    name: '鲜花',
    icon: '🌹',
    description: '美丽的玫瑰花',
    cost: 15,
    affectionGain: 25,
    moodGain: 10,
    rarity: 'common'
  },
  {
    id: 'chocolate',
    name: '巧克力',
    icon: '🍫',
    description: '香甜的手工巧克力',
    cost: 20,
    affectionGain: 30,
    moodGain: 15,
    rarity: 'common'
  },
  {
    id: 'book',
    name: '书籍',
    icon: '📚',
    description: '有趣的小说',
    cost: 25,
    affectionGain: 35,
    intelligenceGain: 5,
    rarity: 'uncommon'
  },
  {
    id: 'music_cd',
    name: '音乐CD',
    icon: '💿',
    description: '她喜欢的音乐专辑',
    cost: 30,
    affectionGain: 40,
    moodGain: 20,
    rarity: 'uncommon'
  },
  {
    id: 'jewelry',
    name: '首饰',
    icon: '💎',
    description: '精致的项链',
    cost: 50,
    affectionGain: 60,
    charmGain: 10,
    rarity: 'rare'
  },
  {
    id: 'plushie',
    name: '毛绒玩具',
    icon: '🧸',
    description: '可爱的泰迪熊',
    cost: 35,
    affectionGain: 45,
    moodGain: 25,
    rarity: 'uncommon'
  }
]);

// 活动系统数据
const availableActivities = ref([
  {
    id: 'movie',
    name: '看电影',
    icon: '🎬',
    description: '一起看一部有趣的电影',
    cost: 30,
    affectionGain: 40,
    moodGain: 15,
    duration: 120,
    requirements: { affection: 100 }
  },
  {
    id: 'cafe',
    name: '咖啡厅',
    icon: '☕',
    description: '在安静的咖啡厅聊天',
    cost: 25,
    affectionGain: 35,
    intelligenceGain: 5,
    duration: 90,
    requirements: { affection: 150 }
  },
  {
    id: 'shopping',
    name: '购物',
    icon: '🛍️',
    description: '一起逛街购物',
    cost: 40,
    affectionGain: 50,
    charmGain: 8,
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

// 约会场所数据
const dateLocations = ref([
  {
    id: 'romantic_dinner',
    name: '浪漫晚餐',
    icon: '🕯️',
    description: '在高级餐厅享受烛光晚餐',
    cost: 80,
    affectionGain: 100,
    moodGain: 30,
    charmGain: 10,
    duration: 180,
    requirements: { affection: 600, mood: 70 }
  },
  {
    id: 'beach_walk',
    name: '海边漫步',
    icon: '🏖️',
    description: '在夕阳下沿着海滩散步',
    cost: 60,
    affectionGain: 80,
    moodGain: 25,
    strengthGain: 5,
    duration: 150,
    requirements: { affection: 500, mood: 60 }
  },
  {
    id: 'amusement_park',
    name: '游乐园',
    icon: '🎡',
    description: '在游乐园度过快乐时光',
    cost: 70,
    affectionGain: 90,
    moodGain: 40,
    duration: 200,
    requirements: { affection: 650, mood: 80 }
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
      id: 'date',
      name: '约会',
      icon: '💕',
      description: '特殊的约会时光',
      available: affection >= 600 && mood >= 70,
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
    case 'date':
      startDate();
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

// 开始约会
function startDate() {
  selectedInteractionType.value = 'date';
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

  // 扣除知识点
  userStore.playerState.knowledgePoints -= gift.cost;
  
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
    userStore.addLog('好感度不足，无法进行此活动！', 'warning');
    return;
  }
  
  if (userStore.playerState.knowledgePoints < activity.cost) {
    userStore.addLog('知识点不足，无法进行活动！', 'warning');
    return;
  }

  // 扣除知识点
  userStore.playerState.knowledgePoints -= activity.cost;
  
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

// 进行约会
function goOnDate(location: any) {
  const affection = props.character.nurtureData.affection;
  const mood = props.character.nurtureData.attributes.mood;
  
  if (affection < location.requirements.affection || mood < location.requirements.mood) {
    userStore.addLog('条件不满足，无法进行约会！', 'warning');
    return;
  }
  
  if (userStore.playerState.knowledgePoints < location.cost) {
    userStore.addLog('知识点不足，无法约会！', 'warning');
    return;
  }

  // 扣除知识点
  userStore.playerState.knowledgePoints -= location.cost;
  
  // 增加好感度
  userStore.increaseAffection(props.character.id, location.affectionGain);
  
  // 应用其他效果
  const nurtureData = userStore.getNurtureData(props.character.id);
  if (location.moodGain) {
    nurtureData.attributes.mood = Math.min(100, nurtureData.attributes.mood + location.moodGain);
  }
  if (location.charmGain) {
    userStore.enhanceAttribute(props.character.id, 'charm', location.charmGain);
  }
  if (location.strengthGain) {
    userStore.enhanceAttribute(props.character.id, 'strength', location.strengthGain);
  }
  
  // 记录特殊事件
  nurtureData.specialEvents.push(`date_${location.id}_${Date.now()}`);
  userStore.addLog(`${props.character.name} 和你在${location.name}度过了浪漫的时光！`, 'success');
  
  closeSelection();
}

// 检查活动是否可用
function isActivityAvailable(activity: any) {
  return props.character.nurtureData.affection >= activity.requirements.affection;
}

// 检查约会是否可用
function isDateAvailable(location: any) {
  const affection = props.character.nurtureData.affection;
  const mood = props.character.nurtureData.attributes.mood;
  return affection >= location.requirements.affection && mood >= location.requirements.mood;
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
  if (userStore.playerState.knowledgePoints >= 10) {
    const smallGifts = ['flower', 'candy', 'book', 'music_cd'];
    const randomGift = smallGifts[Math.floor(Math.random() * smallGifts.length)];
    
    userStore.playerState.knowledgePoints -= 10;
    userStore.giveGift(props.character.id, randomGift);
    userStore.increaseAffection(props.character.id, 20);
  }
}
</script>

<template>
  <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
    <h2 class="text-2xl font-bold text-white mb-6 flex items-center">
      <svg class="w-6 h-6 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.013 8.013 0 01-7-4.027A11.906 11.906 0 013 12c0-2.517.615-4.885 1.704-6.971A8.013 8.013 0 0112 4c4.418 0 8 3.582 8 8z"></path>
      </svg>
      互动面板
    </h2>

    <!-- 快速互动按钮 -->
    <div class="mb-8">
      <h3 class="text-lg font-medium text-gray-300 mb-4">快速互动</h3>
      <div class="grid grid-cols-2 gap-3">
        
        <!-- 快速聊天 -->
        <button 
          @click="quickChat"
          class="flex flex-col items-center p-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/30 rounded-lg transition-all duration-300 group"
        >
          <div class="text-2xl mb-2 group-hover:scale-110 transition-transform">💬</div>
          <span class="text-sm font-medium text-blue-400">随便聊聊</span>
          <span class="text-xs text-gray-400">+5-15 好感度</span>
        </button>

        <!-- 快速送礼 -->
        <button 
          @click="quickGift"
          :disabled="userStore.playerState.knowledgePoints < 10"
          :class="[
            'flex flex-col items-center p-4 border rounded-lg transition-all duration-300 group',
            userStore.playerState.knowledgePoints >= 10
              ? 'bg-pink-600/20 hover:bg-pink-600/30 border-pink-600/30'
              : 'bg-gray-700/50 border-gray-600/50 opacity-50 cursor-not-allowed'
          ]"
        >
          <div class="text-2xl mb-2 group-hover:scale-110 transition-transform">🎁</div>
          <span 
            class="text-sm font-medium"
            :class="userStore.playerState.knowledgePoints >= 10 ? 'text-pink-400' : 'text-gray-500'"
          >
            小礼物
          </span>
          <span class="text-xs text-gray-400">10 知识点</span>
        </button>

      </div>
    </div>

    <!-- 主要互动选项 -->
    <div>
      <h3 class="text-lg font-medium text-gray-300 mb-4">深度互动</h3>
      <div class="space-y-3">
        
        <div 
          v-for="interaction in availableInteractions" 
          :key="interaction.id"
          class="group"
        >
          <button
            @click="executeInteraction(interaction.id)"
            :disabled="!interaction.available"
            :class="[
              'w-full text-left p-4 rounded-lg border transition-all duration-300',
              interaction.available 
                ? `bg-${interaction.color}-600/10 hover:bg-${interaction.color}-600/20 border-${interaction.color}-600/30 hover:border-${interaction.color}-600/50`
                : 'bg-gray-700/30 border-gray-600/50 opacity-50 cursor-not-allowed'
            ]"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <div class="text-2xl mr-3 group-hover:scale-110 transition-transform">
                  {{ interaction.icon }}
                </div>
                <div>
                  <h4 
                    class="font-medium"
                    :class="interaction.available ? 'text-white' : 'text-gray-500'"
                  >
                    {{ interaction.name }}
                  </h4>
                  <p 
                    class="text-sm"
                    :class="interaction.available ? 'text-gray-400' : 'text-gray-500'"
                  >
                    {{ interaction.description }}
                  </p>
                </div>
              </div>
              
              <div class="text-right">
                <div v-if="interaction.cost.type === 'knowledge'" class="text-sm text-gray-400">
                  💎 {{ interaction.cost.amount }}
                </div>
                <div v-if="!interaction.available" class="text-xs text-red-400 mt-1">
                  <!-- 显示不可用原因 -->
                  <span v-if="interaction.id === 'gift' && userStore.playerState.knowledgePoints < 10">
                    知识点不足
                  </span>
                  <span v-else-if="interaction.id === 'activity' && character.nurtureData.affection < 100">
                    好感度不足
                  </span>
                  <span v-else-if="interaction.id === 'date'">
                    条件不满足
                  </span>
                </div>
              </div>
            </div>
          </button>
        </div>

      </div>
    </div>

    <!-- 礼物选择模态框 -->
    <div v-if="selectedInteractionType === 'gift'" class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" @click.self="closeSelection">
      <div class="bg-gray-800 p-6 rounded-lg shadow-xl max-w-2xl w-full border border-gray-700 max-h-[80vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-white flex items-center">
            <span class="text-2xl mr-2">🎁</span>
            选择礼物
          </h3>
          <button @click="closeSelection" class="text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div 
            v-for="gift in availableGifts" 
            :key="gift.id"
            class="group cursor-pointer bg-gray-700/50 hover:bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-all duration-300"
            :class="{
              'border-yellow-500/50': gift.rarity === 'rare',
              'border-purple-500/50': gift.rarity === 'uncommon',
              'border-gray-600': gift.rarity === 'common'
            }"
            @click="giveGift(gift)"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center">
                <div class="text-2xl mr-3">{{ gift.icon }}</div>
                <div>
                  <h4 class="font-medium text-white">{{ gift.name }}</h4>
                  <p class="text-sm text-gray-400">{{ gift.description }}</p>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm font-medium text-pink-400">+{{ gift.affectionGain }}</div>
                <div class="text-xs text-gray-400">💎 {{ gift.cost }}</div>
              </div>
            </div>
            
            <!-- 效果预览 -->
            <div class="text-xs text-gray-300 space-y-1">
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
      <div class="bg-gray-800 p-6 rounded-lg shadow-xl max-w-2xl w-full border border-gray-700 max-h-[80vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-white flex items-center">
            <span class="text-2xl mr-2">🎯</span>
            选择活动
          </h3>
          <button @click="closeSelection" class="text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
        </div>
        
        <div class="space-y-3">
          <div 
            v-for="activity in availableActivities" 
            :key="activity.id"
            class="group cursor-pointer bg-gray-700/50 rounded-lg p-4 border transition-all duration-300"
            :class="isActivityAvailable(activity)
              ? 'hover:bg-gray-700 border-gray-600 hover:border-gray-500'
              : 'border-gray-700 opacity-50 cursor-not-allowed'"
            @click="isActivityAvailable(activity) && doActivity(activity)"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center">
                <div class="text-2xl mr-3">{{ activity.icon }}</div>
                <div>
                  <h4 class="font-medium text-white">{{ activity.name }}</h4>
                  <p class="text-sm text-gray-400">{{ activity.description }}</p>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm font-medium text-green-400">+{{ activity.affectionGain }}</div>
                <div class="text-xs text-gray-400">💎 {{ activity.cost }}</div>
                <div class="text-xs text-gray-400">{{ activity.duration }}分钟</div>
              </div>
            </div>
            
            <!-- 需求条件 -->
            <div class="text-xs text-gray-400 mb-2">
              需要好感度: {{ activity.requirements.affection }}+
            </div>
            
            <!-- 效果预览 -->
            <div class="text-xs text-gray-300 space-y-1">
              <div v-if="activity.moodGain">心情 +{{ activity.moodGain }}</div>
              <div v-if="activity.charmGain">魅力 +{{ activity.charmGain }}</div>
              <div v-if="activity.intelligenceGain">智力 +{{ activity.intelligenceGain }}</div>
              <div v-if="activity.strengthGain">体力 +{{ activity.strengthGain }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 约会选择模态框 -->
    <div v-if="selectedInteractionType === 'date'" class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" @click.self="closeSelection">
      <div class="bg-gray-800 p-6 rounded-lg shadow-xl max-w-2xl w-full border border-gray-700 max-h-[80vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-white flex items-center">
            <span class="text-2xl mr-2">💕</span>
            选择约会地点
          </h3>
          <button @click="closeSelection" class="text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
        </div>
        
        <div class="space-y-4">
          <div 
            v-for="location in dateLocations" 
            :key="location.id"
            class="group cursor-pointer bg-gradient-to-r from-pink-600/10 to-purple-600/10 rounded-lg p-4 border transition-all duration-300"
            :class="isDateAvailable(location)
              ? 'hover:from-pink-600/20 hover:to-purple-600/20 border-pink-600/30 hover:border-pink-600/50'
              : 'border-gray-700 opacity-50 cursor-not-allowed from-gray-700/10 to-gray-700/10'"
            @click="isDateAvailable(location) && goOnDate(location)"
          >
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center">
                <div class="text-3xl mr-4">{{ location.icon }}</div>
                <div>
                  <h4 class="font-medium text-white text-lg">{{ location.name }}</h4>
                  <p class="text-sm text-gray-400">{{ location.description }}</p>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm font-medium text-pink-400">+{{ location.affectionGain }}</div>
                <div class="text-xs text-gray-400">💎 {{ location.cost }}</div>
                <div class="text-xs text-gray-400">{{ location.duration }}分钟</div>
              </div>
            </div>
            
            <!-- 需求条件 -->
            <div class="text-xs text-gray-400 mb-2">
              需要好感度: {{ location.requirements.affection }}+, 心情: {{ location.requirements.mood }}+
            </div>
            
            <!-- 效果预览 -->
            <div class="text-xs text-gray-300 flex space-x-4">
              <div v-if="location.moodGain">心情 +{{ location.moodGain }}</div>
              <div v-if="location.charmGain">魅力 +{{ location.charmGain }}</div>
              <div v-if="location.strengthGain">体力 +{{ location.strengthGain }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 当前角色状态提示 -->
    <div class="mt-6 p-4 bg-gray-700/30 rounded-lg">
      <div class="flex items-center text-sm text-gray-400">
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>{{ character.name }} 目前心情 
          <span :class="{
            'text-pink-400': character.nurtureData.attributes.mood >= 80,
            'text-green-400': character.nurtureData.attributes.mood >= 60,
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