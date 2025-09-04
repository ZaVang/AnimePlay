<script setup lang="ts">
import { computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/stores/userStore';

const props = defineProps<{
  character: CharacterCard & { nurtureData: CharacterNurtureData };
}>();

const userStore = useUserStore();

// 计算角色等级进度
const levelProgress = computed(() => {
  return userStore.getLevelProgress(props.character.nurtureData);
});

// 计算羁绊等级
const bondLevel = computed(() => {
  const affection = props.character.nurtureData.affection;
  if (affection >= 1000) return { 
    level: '永恒羁绊', 
    color: 'text-pink-400', 
    bgColor: 'bg-pink-500/20', 
    icon: '⭐',
    progress: 100, // 最高级后不再显示进度，但数值可以继续增加
    maxReached: true
  };
  if (affection >= 800) return { 
    level: '命定之人', 
    color: 'text-red-400', 
    bgColor: 'bg-red-500/20', 
    icon: '🌟',
    progress: ((affection - 800) / 200) * 100,
    maxReached: false
  };
  if (affection >= 600) return { 
    level: '肝胆相照', 
    color: 'text-purple-400', 
    bgColor: 'bg-purple-500/20', 
    icon: '💜',
    progress: ((affection - 600) / 200) * 100,
    maxReached: false
  };
  if (affection >= 400) return { 
    level: '心照不宣', 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/20', 
    icon: '💙',
    progress: ((affection - 400) / 200) * 100,
    maxReached: false
  };
  if (affection >= 200) return { 
    level: '志同道合', 
    color: 'text-green-400', 
    bgColor: 'bg-green-500/20', 
    icon: '💚',
    progress: ((affection - 200) / 200) * 100,
    maxReached: false
  };
  if (affection >= 100) return { 
    level: '萍水相逢', 
    color: 'text-yellow-400', 
    bgColor: 'bg-yellow-500/20', 
    icon: '💛',
    progress: ((affection - 100) / 100) * 100,
    maxReached: false
  };
  return { 
    level: '初次相遇', 
    color: 'text-gray-400', 
    bgColor: 'bg-gray-500/20', 
    icon: '🤝',
    progress: (affection / 100) * 100,
    maxReached: false
  };
});

// 计算最后互动时间
const lastInteractionText = computed(() => {
  if (!props.character.nurtureData.lastInteraction) return '从未互动';
  
  const lastTime = new Date(props.character.nurtureData.lastInteraction);
  const now = new Date();
  const diffMs = now.getTime() - lastTime.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 0) return `${diffDays}天前`;
  if (diffHours > 0) return `${diffHours}小时前`;
  if (diffMinutes > 0) return `${diffMinutes}分钟前`;
  return '刚刚';
});

// 计算心情状态
const moodStatus = computed(() => {
  const mood = props.character.nurtureData.attributes.mood;
  if (mood >= 90) return { text: '非常开心', color: 'text-pink-400', icon: '😊' };
  if (mood >= 70) return { text: '愉快', color: 'text-green-400', icon: '😌' };
  if (mood >= 50) return { text: '平常', color: 'text-yellow-400', icon: '😐' };
  if (mood >= 30) return { text: '有些烦躁', color: 'text-orange-400', icon: '😔' };
  return { text: '心情不好', color: 'text-red-400', icon: '😞' };
});

// 获取事件图标
function getEventIcon(event: string): string {
  if (event.startsWith('campus_')) return '🎓';
  if (event.startsWith('date_')) return '💕';
  if (event.startsWith('special_event_')) return '⭐';
  if (event.includes('movie')) return '🎬';
  if (event.includes('cafe')) return '☕';
  if (event.includes('shopping')) return '🛍️';
  if (event.includes('study')) return '📚';
  if (event.includes('festival')) return '🎪';
  if (event.includes('club')) return '🎭';
  return '🌟';
}

// 获取事件描述
function getEventDescription(event: string): string {
  if (event.startsWith('campus_study_together')) return '一起在图书馆学习';
  if (event.startsWith('campus_campus_walk')) return '校园里悠闲散步';
  if (event.startsWith('campus_school_festival')) return '参加校园文化祭';
  if (event.startsWith('campus_club_activity')) return '参加社团活动';
  if (event.startsWith('date_romantic_dinner')) return '共度浪漫晚餐';
  if (event.startsWith('date_beach_walk')) return '海边漫步';
  if (event.startsWith('date_amusement_park')) return '游乐园约会';
  if (event.startsWith('special_event_')) return '触发了特殊剧情';
  if (event.includes('movie')) return '一起看电影';
  if (event.includes('cafe')) return '咖啡厅聊天';
  if (event.includes('shopping')) return '一起购物';
  return '珍贵的回忆';
}

// 格式化事件时间
function formatEventTime(event: string): string {
  const timestamp = event.split('_').pop();
  if (timestamp && /^\d+$/.test(timestamp)) {
    const date = new Date(parseInt(timestamp));
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }
  return '很久以前';
}

// 获取礼物汇总
function getGiftSummary() {
  const giftCounts: Record<string, number> = {};
  props.character.nurtureData.gifts.forEach(gift => {
    giftCounts[gift] = (giftCounts[gift] || 0) + 1;
  });
  
  return Object.entries(giftCounts).map(([type, count]) => ({
    type,
    count
  }));
}

// 获取礼物图标
function getGiftIcon(giftType: string): string {
  const icons: Record<string, string> = {
    flower: '🌹',
    chocolate: '🍫',
    book: '📚',
    music_cd: '💿',
    jewelry: '💎',
    plushie: '🧸'
  };
  return icons[giftType] || '🎁';
}

// 获取礼物名称
function getGiftName(giftType: string): string {
  const names: Record<string, string> = {
    flower: '鲜花',
    chocolate: '巧克力',
    book: '书籍',
    music_cd: '音乐CD',
    jewelry: '首饰',
    plushie: '毛绒玩具'
  };
  return names[giftType] || '礼物';
}

// 获取角色偏好
function getCharacterPreferences(): string[] {
  const affection = props.character.nurtureData.affection;
  const attributes = props.character.nurtureData.attributes;
  
  const preferences: string[] = [];
  
  if (attributes.intelligence > 70) preferences.push('学习');
  if (attributes.charm > 70) preferences.push('时尚');
  if (attributes.strength > 70) preferences.push('运动');
  if (affection > 500) preferences.push('浪漫');
  if (attributes.mood > 80) preferences.push('聊天');
  
  // 基于收到的礼物推断偏好
  const giftTypes = props.character.nurtureData.gifts;
  if (giftTypes.includes('book')) preferences.push('阅读');
  if (giftTypes.includes('music_cd')) preferences.push('音乐');
  if (giftTypes.includes('jewelry')) preferences.push('装饰品');
  
  return preferences.length > 0 ? preferences : ['还在探索中...'];
}

// 获取活跃度等级
function getActivityLevel(interactions: number): string {
  if (interactions >= 40) return '非常活跃';
  if (interactions >= 25) return '活跃';
  if (interactions >= 15) return '一般';
  if (interactions >= 5) return '较少';
  return '刚开始';
}

// 获取当前羁绊等级的下一级阈值
function getBondLevelThreshold(): number {
  const affection = props.character.nurtureData.affection;
  if (affection >= 800) return 1000;
  if (affection >= 600) return 800;
  if (affection >= 400) return 600;
  if (affection >= 200) return 400;
  if (affection >= 100) return 200;
  return 100;
}
</script>

<template>
  <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
    
    <!-- 角色头部 -->
    <div class="relative">
      <div class="aspect-[2/3] overflow-hidden">
        <img 
          :src="character.image_path" 
          :alt="character.name"
          class="w-full h-full object-cover object-top"
        >
      </div>
      
      <!-- 稀有度背景效果 -->
      <div 
        class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"
        :class="{
          'from-red-900/30': character.rarity === 'UR',
          'from-purple-900/30': character.rarity === 'HR',
          'from-yellow-900/30': character.rarity === 'SSR',
          'from-blue-900/30': character.rarity === 'SR',
          'from-green-900/30': character.rarity === 'R'
        }"
      ></div>
      
      <!-- 角色名称和稀有度 -->
      <div class="absolute bottom-4 left-4 right-4">
        <div class="flex items-end justify-between">
          <div>
            <h3 class="text-xl font-bold text-white mb-1">{{ character.name }}</h3>
            <div class="flex items-center">
              <span 
                class="px-2 py-1 rounded-full text-xs font-medium"
                :class="{
                  'bg-red-500 text-white': character.rarity === 'UR',
                  'bg-purple-500 text-white': character.rarity === 'HR',
                  'bg-yellow-500 text-black': character.rarity === 'SSR',
                  'bg-blue-500 text-white': character.rarity === 'SR',
                  'bg-green-500 text-white': character.rarity === 'R',
                  'bg-gray-500 text-white': character.rarity === 'N'
                }"
              >
                {{ character.rarity }}
              </span>
            </div>
          </div>
          
          <!-- 心情状态 -->
          <div class="text-right">
            <div class="text-2xl mb-1">{{ moodStatus.icon }}</div>
            <div :class="moodStatus.color" class="text-xs font-medium">
              {{ moodStatus.text }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 角色信息面板 -->
    <div class="p-6 space-y-6">
      
      <!-- 羁绊等级 -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-lg font-semibold text-white flex items-center">
            <span class="text-2xl mr-2">{{ bondLevel.icon }}</span>
            羁绊等级
          </h4>
          <span :class="bondLevel.color" class="font-bold">
            {{ bondLevel.level }}
          </span>
        </div>
        
        <!-- 羁绊进度条 -->
        <div class="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div 
            :class="bondLevel.bgColor.replace('/20', '')" 
            class="h-full rounded-full transition-all duration-500 relative"
            :style="{ width: `${bondLevel.progress}%` }"
          >
            <div class="absolute inset-0 bg-white/20"></div>
          </div>
        </div>
        
        <div class="flex justify-between text-xs text-gray-400 mt-1">
          <span>{{ character.nurtureData.affection }}</span>
          <span v-if="!bondLevel.maxReached">{{ getBondLevelThreshold() }}</span>
          <span v-else class="text-pink-400">MAX</span>
        </div>
      </div>

      <!-- 角色等级 -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-lg font-semibold text-white flex items-center">
            <span class="text-2xl mr-2">⚡</span>
            角色等级
          </h4>
          <span class="text-yellow-400 font-bold text-xl">
            Lv.{{ character.nurtureData.level }}
          </span>
        </div>
        
        <!-- 经验值进度条 -->
        <div class="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div 
            class="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500 relative"
            :style="{ width: `${levelProgress.percentage}%` }"
          >
            <div class="absolute inset-0 bg-white/20"></div>
          </div>
        </div>
        
        <div class="flex justify-between text-xs text-gray-400 mt-1">
          <span>{{ levelProgress.current }} / {{ levelProgress.required }} EXP</span>
          <span class="text-yellow-400">下一级</span>
        </div>
        
        <!-- 总经验值显示 -->
        <div class="text-center mt-2 text-xs text-gray-500">
          总经验值: {{ character.nurtureData.totalExperience }}
        </div>
      </div>

      <!-- 养成属性面板 -->
      <div class="mb-6">
        <h4 class="text-lg font-semibold text-white mb-4">养成属性</h4>
        <div class="grid grid-cols-2 gap-4">
          
          <!-- 魅力值 -->
          <div class="text-center">
            <div class="text-2xl mb-1">✨</div>
            <div class="text-xs text-gray-400 mb-1">魅力</div>
            <div class="text-lg font-bold text-pink-400">
              {{ character.nurtureData.attributes.charm }}
            </div>
          </div>
          
          <!-- 智力值 -->
          <div class="text-center">
            <div class="text-2xl mb-1">🧠</div>
            <div class="text-xs text-gray-400 mb-1">智力</div>
            <div class="text-lg font-bold text-blue-400">
              {{ character.nurtureData.attributes.intelligence }}
            </div>
          </div>
          
          <!-- 体力值 -->
          <div class="text-center">
            <div class="text-2xl mb-1">💪</div>
            <div class="text-xs text-gray-400 mb-1">体力</div>
            <div class="text-lg font-bold text-green-400">
              {{ character.nurtureData.attributes.strength }}
            </div>
          </div>
          
          <!-- 心情值 -->
          <div class="text-center">
            <div class="text-2xl mb-1">{{ moodStatus.icon }}</div>
            <div class="text-xs text-gray-400 mb-1">心情</div>
            <div class="text-lg font-bold" :class="moodStatus.color">
              {{ character.nurtureData.attributes.mood }}
            </div>
          </div>

        </div>
      </div>

      <!-- 战斗属性面板 -->
      <div>
        <h4 class="text-lg font-semibold text-white mb-4">战斗能力</h4>
        
        <!-- 基础战斗属性 -->
        <div class="bg-gray-700/30 rounded-lg p-4 mb-4">
          <div class="text-xs text-gray-400 mb-3 text-center">基础属性</div>
          <div class="grid grid-cols-5 gap-2 text-center">
            <div>
              <div class="text-xs text-gray-400 mb-1">HP</div>
              <div class="text-sm font-bold text-red-400">{{ character.battle_stats?.hp || 0 }}</div>
            </div>
            <div>
              <div class="text-xs text-gray-400 mb-1">ATK</div>
              <div class="text-sm font-bold text-orange-400">{{ character.battle_stats?.atk || 0 }}</div>
            </div>
            <div>
              <div class="text-xs text-gray-400 mb-1">DEF</div>
              <div class="text-sm font-bold text-blue-400">{{ character.battle_stats?.def || 0 }}</div>
            </div>
            <div>
              <div class="text-xs text-gray-400 mb-1">SP</div>
              <div class="text-sm font-bold text-purple-400">{{ character.battle_stats?.sp || 0 }}</div>
            </div>
            <div>
              <div class="text-xs text-gray-400 mb-1">SPD</div>
              <div class="text-sm font-bold text-green-400">{{ character.battle_stats?.spd || 0 }}</div>
            </div>
          </div>
        </div>

        <!-- 战斗属性加成 -->
        <div class="bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-lg p-4 border border-pink-500/20">
          <div class="text-xs text-pink-400 mb-3 text-center">养成加成 (%)</div>
          <div class="grid grid-cols-5 gap-2 text-center">
            <div>
              <div class="text-xs text-gray-400 mb-1">HP</div>
              <div class="text-sm font-bold text-red-400">+{{ character.nurtureData.battleEnhancements?.hp || 0 }}%</div>
            </div>
            <div>
              <div class="text-xs text-gray-400 mb-1">ATK</div>
              <div class="text-sm font-bold text-orange-400">+{{ character.nurtureData.battleEnhancements?.atk || 0 }}%</div>
            </div>
            <div>
              <div class="text-xs text-gray-400 mb-1">DEF</div>
              <div class="text-sm font-bold text-blue-400">+{{ character.nurtureData.battleEnhancements?.def || 0 }}%</div>
            </div>
            <div>
              <div class="text-xs text-gray-400 mb-1">SP</div>
              <div class="text-sm font-bold text-purple-400">+{{ character.nurtureData.battleEnhancements?.sp || 0 }}%</div>
            </div>
            <div>
              <div class="text-xs text-gray-400 mb-1">SPD</div>
              <div class="text-sm font-bold text-green-400">+{{ character.nurtureData.battleEnhancements?.spd || 0 }}%</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 互动统计 -->
      <div class="border-t border-gray-700 pt-4">
        <div class="grid grid-cols-2 gap-4 text-center">
          <div>
            <div class="text-lg font-bold text-yellow-400">{{ character.nurtureData.totalInteractions }}</div>
            <div class="text-xs text-gray-400">总互动次数</div>
          </div>
          <div>
            <div class="text-sm font-medium text-gray-300">{{ lastInteractionText }}</div>
            <div class="text-xs text-gray-400">最后互动</div>
          </div>
        </div>
      </div>

      <!-- 特殊事件记录 -->
      <div class="border-t border-gray-700 pt-4 mb-6">
        <h4 class="text-lg font-semibold text-white mb-3 flex items-center">
          <span class="text-2xl mr-2">🌟</span>
          特殊回忆
        </h4>
        <div v-if="character.nurtureData.specialEvents.length === 0" class="text-center py-4">
          <span class="text-gray-500 text-sm">暂无特殊回忆</span>
        </div>
        <div v-else class="space-y-2">
          <div 
            v-for="(event, index) in character.nurtureData.specialEvents.slice(-5)" 
            :key="index"
            class="bg-gray-700/30 rounded-lg p-3 text-sm"
          >
            <div class="flex items-center text-gray-300">
              <span class="text-lg mr-2">{{ getEventIcon(event) }}</span>
              <span>{{ getEventDescription(event) }}</span>
            </div>
            <div class="text-xs text-gray-500 mt-1">
              {{ formatEventTime(event) }}
            </div>
          </div>
        </div>
      </div>

      <!-- 收到的礼物历史 -->
      <div class="border-t border-gray-700 pt-4 mb-6">
        <h4 class="text-lg font-semibold text-white mb-3 flex items-center">
          <span class="text-2xl mr-2">🎁</span>
          收到的礼物
        </h4>
        <div v-if="character.nurtureData.gifts.length === 0" class="text-center py-4">
          <span class="text-gray-500 text-sm">还没有收到过礼物</span>
        </div>
        <div v-else class="grid grid-cols-2 gap-2">
          <div 
            v-for="(gift, index) in getGiftSummary()" 
            :key="index"
            class="bg-gray-700/30 rounded-lg p-2 text-center"
          >
            <div class="text-lg mb-1">{{ getGiftIcon(gift.type) }}</div>
            <div class="text-xs text-gray-300">{{ getGiftName(gift.type) }}</div>
            <div class="text-xs text-gray-500">x{{ gift.count }}</div>
          </div>
        </div>
      </div>

      <!-- 性格偏好信息 -->
      <div class="border-t border-gray-700 pt-4">
        <h4 class="text-lg font-semibold text-white mb-3 flex items-center">
          <span class="text-2xl mr-2">💭</span>
          性格偏好
        </h4>
        <div class="space-y-3">
          <!-- 喜好类型 -->
          <div class="bg-gray-700/30 rounded-lg p-3">
            <div class="text-sm text-gray-400 mb-2">喜好类型</div>
            <div class="flex flex-wrap gap-2">
              <span v-for="preference in getCharacterPreferences()" :key="preference" 
                    class="px-2 py-1 bg-pink-500/20 text-pink-300 text-xs rounded-full">
                {{ preference }}
              </span>
            </div>
          </div>
          
          <!-- 互动频率 -->
          <div class="bg-gray-700/30 rounded-lg p-3">
            <div class="text-sm text-gray-400 mb-2">互动活跃度</div>
            <div class="flex items-center">
              <div class="flex-1 bg-gray-600 rounded-full h-2 mr-3">
                <div 
                  class="h-2 rounded-full bg-gradient-to-r from-green-400 to-blue-400 transition-all duration-500"
                  :style="{ width: `${Math.min(100, (character.nurtureData.totalInteractions / 50) * 100)}%` }"
                ></div>
              </div>
              <span class="text-xs text-gray-300">
                {{ getActivityLevel(character.nurtureData.totalInteractions) }}
              </span>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  </div>
</template>