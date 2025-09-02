<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useUserStore } from '@/stores/userStore';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/stores/userStore';

const props = defineProps<{
  character: CharacterCard & { nurtureData: CharacterNurtureData };
}>();

const emit = defineEmits<{
  close: [];
}>();

const userStore = useUserStore();

// 对话状态
const currentDialogue = ref<any>(null);
const dialogueHistory = ref<Array<{ speaker: string; text: string; timestamp: number }>>([]);
const isTyping = ref(false);
const userInput = ref('');
const dialogueContainer = ref<HTMLElement>();

// 可用的对话选项 (基于好感度和历史)
const availableDialogues = computed(() => {
  const affection = props.character.nurtureData.affection;
  const mood = props.character.nurtureData.attributes.mood;
  
  // 基础对话选项
  const baseDialogues = [
    {
      id: 'greeting',
      text: '你好！',
      condition: () => true,
      response: getGreetingResponse(),
      affectionGain: 3
    },
    {
      id: 'how_are_you',
      text: '你今天怎么样？',
      condition: () => affection >= 50,
      response: getMoodResponse(),
      affectionGain: 5
    },
    {
      id: 'compliment',
      text: '你今天看起来很棒！',
      condition: () => affection >= 100,
      response: getComplimentResponse(),
      affectionGain: 10
    },
    {
      id: 'deep_talk',
      text: '我们谈谈更深入的话题吧',
      condition: () => affection >= 300,
      response: getDeepTalkResponse(),
      affectionGain: 15
    },
    {
      id: 'intimate_talk',
      text: '我想和你分享一些私人的事情',
      condition: () => affection >= 600,
      response: getIntimateTalkResponse(),
      affectionGain: 25
    }
  ];

  return baseDialogues.filter(d => d.condition());
});

// 获取问候回应
function getGreetingResponse() {
  const responses = [
    `你好！很高兴见到你。`,
    `嗨！今天过得怎么样？`,
    `你来了啊，我正想着你呢。`,
    `欢迎回来！有什么想聊的吗？`
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// 获取心情回应
function getMoodResponse() {
  const mood = props.character.nurtureData.attributes.mood;
  if (mood >= 80) {
    return `我今天心情特别好！感谢你一直陪伴着我。`;
  } else if (mood >= 60) {
    return `今天还不错，和你聊天总是让我很开心。`;
  } else if (mood >= 40) {
    return `嗯...还好吧，不过看到你就觉得好了一些。`;
  } else {
    return `说实话今天心情不太好...但是你在这里让我感觉好多了。`;
  }
}

// 获取称赞回应
function getComplimentResponse() {
  const responses = [
    `谢谢你这么说！你也是呢。`,
    `真的吗？听你这么说我很高兴。`,
    `你总是知道怎么让我开心～`,
    `和你在一起的时候，我确实感觉很好。`
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// 获取深度对话回应
function getDeepTalkResponse() {
  const responses = [
    `你知道吗，我一直很感激能遇到你。在我们相处的这段时间里，我学会了很多。`,
    `有时候我会想，如果没有遇到你，我的生活会是怎样的。现在我觉得一切都刚刚好。`,
    `我觉得我们之间有种特殊的默契，就像...就像命中注定的一样。`,
    `和你分享我的想法总是让我感到安心。你是一个很好的倾听者。`
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// 获取亲密对话回应
function getIntimateTalkResponse() {
  const responses = [
    `我...我从来没有对别人有过这种感觉。你对我来说真的很特别。`,
    `每当我看到你的时候，我的心就会跳得很快。这是爱情吗？`,
    `我想永远和你在一起，分享生活中的每一个瞬间。`,
    `你知道吗？在我心里，你已经不只是朋友了...你是我最重要的人。`
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// 选择对话选项
function selectDialogue(dialogue: any) {
  // 添加用户的话到历史
  dialogueHistory.value.push({
    speaker: 'user',
    text: dialogue.text,
    timestamp: Date.now()
  });

  // 模拟角色打字效果
  isTyping.value = true;
  setTimeout(() => {
    dialogueHistory.value.push({
      speaker: 'character',
      text: dialogue.response,
      timestamp: Date.now()
    });
    isTyping.value = false;
    
    // 增加好感度
    userStore.increaseAffection(props.character.id, dialogue.affectionGain);
    userStore.interactWithCharacter(props.character.id, dialogue.id);
    
    scrollToBottom();
  }, 1000 + Math.random() * 1500); // 随机延迟模拟思考时间

  scrollToBottom();
}

// 自由输入对话
function sendFreeMessage() {
  if (!userInput.value.trim()) return;

  const message = userInput.value.trim();
  dialogueHistory.value.push({
    speaker: 'user',
    text: message,
    timestamp: Date.now()
  });
  
  userInput.value = '';

  // TODO: 实现更智能的回复系统
  // 这里可以集成AI对话API或者基于关键词的回复系统
  isTyping.value = true;
  setTimeout(() => {
    const response = generateFreeResponse(message);
    dialogueHistory.value.push({
      speaker: 'character',
      text: response,
      timestamp: Date.now()
    });
    isTyping.value = false;
    scrollToBottom();
  }, 800 + Math.random() * 1200);

  scrollToBottom();
}

// 生成自由对话回应 (增强的关键词匹配和情感分析)
function generateFreeResponse(message: string) {
  const lowerMessage = message.toLowerCase();
  const affection = props.character.nurtureData.affection;
  const mood = props.character.nurtureData.attributes.mood;
  const characterName = props.character.name;
  
  // 情感分析和关键词匹配
  if (lowerMessage.includes('喜欢') || lowerMessage.includes('爱')) {
    if (affection >= 600) {
      return '我也...很爱你呢！每天和你在一起都很幸福。';
    } else if (affection >= 300) {
      return '我也很喜欢和你在一起的时光呢，感觉很温暖。';
    } else {
      return '谢谢你这么说，我也觉得我们相处得很愉快。';
    }
  } 
  
  if (lowerMessage.includes('动画') || lowerMessage.includes('番剧') || lowerMessage.includes('anime')) {
    const animeResponses = [
      '说到动画，我最近也在关注一些新番呢！你有什么推荐的吗？',
      '我也很喜欢看动画！特别是那些有深度的作品。',
      '动画真的很棒呢，总能带给我们不同的感动和思考。',
      '你喜欢什么类型的动画？我想了解你的喜好呢。'
    ];
    return animeResponses[Math.floor(Math.random() * animeResponses.length)];
  }
  
  if (lowerMessage.includes('累') || lowerMessage.includes('疲劳') || lowerMessage.includes('辛苦')) {
    if (mood >= 70) {
      return '那你要好好休息哦！我会在这里等你的，不要太勉强自己了。';
    } else {
      return '我也有点累了呢...不如我们一起休息一下吧？';
    }
  }
  
  if (lowerMessage.includes('谢谢') || lowerMessage.includes('感谢')) {
    if (affection >= 400) {
      return '不用客气啦～能为你做事情我就很开心了！';
    } else {
      return '不用谢啦，这是我应该做的！';
    }
  }
  
  if (lowerMessage.includes('想你') || lowerMessage.includes('想念')) {
    if (affection >= 500) {
      return '我也很想你呢...每分每秒都在想着你。';
    } else if (affection >= 200) {
      return '听你这么说我很高兴，我也会想念你的。';
    } else {
      return '谢谢你这么关心我，真的很暖心。';
    }
  }
  
  if (lowerMessage.includes('生气') || lowerMessage.includes('愤怒') || lowerMessage.includes('不高兴')) {
    return '怎么了？发生什么事情让你不开心了吗？如果我能帮忙的话请告诉我。';
  }
  
  if (lowerMessage.includes('今天') && (lowerMessage.includes('如何') || lowerMessage.includes('怎么样'))) {
    if (mood >= 80) {
      return `今天心情特别好呢！和${characterName}在一起总是很开心的。`;
    } else if (mood >= 60) {
      return '今天还不错，不过看到你就更好了！';
    } else {
      return '今天有点...不过现在好多了，因为你在这里。';
    }
  }
  
  if (lowerMessage.includes('游戏') || lowerMessage.includes('玩')) {
    return '听起来很有趣！我也想和你一起玩呢，有什么好玩的推荐吗？';
  }
  
  if (lowerMessage.includes('工作') || lowerMessage.includes('学习') || lowerMessage.includes('忙')) {
    return '工作/学习很重要，但也要记得休息哦。要不要和我聊聊天放松一下？';
  }
  
  if (lowerMessage.includes('美') || lowerMessage.includes('漂亮') || lowerMessage.includes('可爱')) {
    if (affection >= 300) {
      return '谢谢夸奖～你说这些话的时候最帅/最美了呢！';
    } else {
      return '谢谢你的夸奖，听你这么说我很开心！';
    }
  }
  
  if (lowerMessage.includes('吃') || lowerMessage.includes('饭') || lowerMessage.includes('食物')) {
    return '说到吃的我就饿了呢！你喜欢吃什么？有机会一起去尝试新的美食吧！';
  }
  
  if (lowerMessage.includes('天气')) {
    const weatherResponses = [
      '今天天气确实不错呢，这样的日子最适合出去走走了。',
      '天气好的时候心情也会变好呢～',
      '不管天气怎样，和你在一起就是好天气！'
    ];
    return weatherResponses[Math.floor(Math.random() * weatherResponses.length)];
  }
  
  // 根据好感度返回不同的通用回复
  if (affection >= 600) {
    const intimateResponses = [
      '和你聊天总是让我很开心呢～',
      '你知道吗，我真的很珍惜我们在一起的每一刻。',
      '你的话总是能温暖我的心呢。',
      '我喜欢听你说话，继续说下去吧～'
    ];
    return intimateResponses[Math.floor(Math.random() * intimateResponses.length)];
  } else if (affection >= 300) {
    const friendlyResponses = [
      '嗯嗯，我明白你的意思。',
      '你说得很有道理呢！',
      '继续说下去吧，我在认真听着呢。',
      '和你聊天真的很有趣！'
    ];
    return friendlyResponses[Math.floor(Math.random() * friendlyResponses.length)];
  } else {
    const basicResponses = [
      '是这样啊...让我想想。',
      '嗯，我理解了。',
      '你说得对。',
      '这个话题很有意思呢。'
    ];
    return basicResponses[Math.floor(Math.random() * basicResponses.length)];
  }
}

// 滚动到底部
function scrollToBottom() {
  nextTick(() => {
    if (dialogueContainer.value) {
      dialogueContainer.value.scrollTop = dialogueContainer.value.scrollHeight;
    }
  });
}

// 格式化时间
function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// 初始化对话
onMounted(() => {
  dialogueHistory.value.push({
    speaker: 'character',
    text: getInitialGreeting(),
    timestamp: Date.now()
  });
  scrollToBottom();
});

function getInitialGreeting() {
  const hour = new Date().getHours();
  const affection = props.character.nurtureData.affection;
  
  let greeting = '';
  if (hour < 6) {
    greeting = '这么晚还不睡吗？';
  } else if (hour < 12) {
    greeting = '早上好！';
  } else if (hour < 18) {
    greeting = '下午好！';
  } else {
    greeting = '晚上好！';
  }

  if (affection >= 500) {
    return `${greeting}亲爱的～今天想和我聊什么呢？`;
  } else if (affection >= 200) {
    return `${greeting}今天过得怎么样？`;
  } else {
    return `${greeting}有什么事情吗？`;
  }
}
</script>

<template>
  <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" @click.self="emit('close')">
    <div class="bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] border border-gray-700 overflow-hidden">
      
      <!-- 对话窗口头部 -->
      <div class="flex items-center justify-between p-6 border-b border-gray-700 bg-gray-750">
        <div class="flex items-center">
          <div class="w-12 h-12 rounded-full overflow-hidden mr-4">
            <img :src="character.image_path" :alt="character.name" class="w-full h-full object-cover object-top">
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">{{ character.name }}</h3>
            <div class="flex items-center text-sm text-gray-400">
              <div class="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              在线中
            </div>
          </div>
        </div>
        
        <button 
          @click="emit('close')"
          class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- 对话历史区域 -->
      <div 
        ref="dialogueContainer"
        class="flex-1 p-4 space-y-4 overflow-y-auto max-h-96 bg-gray-850"
      >
        <div v-for="(message, index) in dialogueHistory" :key="index">
          
          <!-- 用户消息 -->
          <div v-if="message.speaker === 'user'" class="flex justify-end">
            <div class="max-w-xs lg:max-w-md">
              <div class="bg-blue-600 text-white p-3 rounded-2xl rounded-br-md">
                {{ message.text }}
              </div>
              <div class="text-xs text-gray-500 mt-1 text-right">{{ formatTime(message.timestamp) }}</div>
            </div>
          </div>

          <!-- 角色消息 -->
          <div v-else class="flex justify-start">
            <div class="flex items-start max-w-xs lg:max-w-md">
              <div class="w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0">
                <img :src="character.image_path" :alt="character.name" class="w-full h-full object-cover object-top">
              </div>
              <div>
                <div class="bg-gray-700 text-white p-3 rounded-2xl rounded-bl-md">
                  {{ message.text }}
                </div>
                <div class="text-xs text-gray-500 mt-1">{{ formatTime(message.timestamp) }}</div>
              </div>
            </div>
          </div>

        </div>

        <!-- 打字指示器 -->
        <div v-if="isTyping" class="flex justify-start">
          <div class="flex items-start">
            <div class="w-8 h-8 rounded-full overflow-hidden mr-2">
              <img :src="character.image_path" :alt="character.name" class="w-full h-full object-cover object-top">
            </div>
            <div class="bg-gray-700 text-white p-3 rounded-2xl rounded-bl-md">
              <div class="flex space-x-1">
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s;"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 对话选项区域 -->
      <div class="p-4 border-t border-gray-700 space-y-3">
        
        <!-- 预设对话选项 -->
        <div v-if="availableDialogues.length > 0" class="space-y-2">
          <div class="text-sm text-gray-400 mb-2">选择话题：</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              v-for="dialogue in availableDialogues.slice(0, 4)"
              :key="dialogue.id"
              @click="selectDialogue(dialogue)"
              :disabled="isTyping"
              class="text-left p-3 bg-gray-700/50 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ dialogue.text }}
            </button>
          </div>
        </div>

        <!-- 自由输入 -->
        <div class="flex space-x-2">
          <input
            v-model="userInput"
            @keyup.enter="sendFreeMessage"
            :disabled="isTyping"
            placeholder="输入你想说的话..."
            class="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none disabled:opacity-50"
          >
          <button
            @click="sendFreeMessage"
            :disabled="!userInput.trim() || isTyping"
            class="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            发送
          </button>
        </div>
      </div>

      <!-- TODO: 添加更多对话系统功能 -->
      <!-- 
      - 对话历史保存
      - 表情反应系统
      - 语音消息 (TTS)
      - 对话分支选择
      - 特殊剧情触发
      - 角色情感状态显示
      -->

    </div>
  </div>
</template>

<style scoped>
/* 自定义滚动条样式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #374151;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #6B7280;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #9CA3AF;
}

/* 打字动画 */
@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.animate-bounce {
  animation: bounce 1.4s infinite ease-in-out;
}
</style>