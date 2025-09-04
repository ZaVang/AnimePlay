<script setup lang="ts">
import { computed } from 'vue';
import { GAME_CONFIG } from '@/config/gameConfig';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits(['close']);

const battleConfig = computed(() => GAME_CONFIG.battle);

const actionStyles = computed(() => [
  { key: 'friendly', ...battleConfig.value.actions.friendly, description: '温和地推荐动画，消耗较少TP' },
  { key: 'harsh', ...battleConfig.value.actions.harsh, description: '尖锐地评价动画，消耗更多TP但效果更强' },
  { key: 'agree', ...battleConfig.value.actions.agree, description: '赞同对方观点，消耗较少TP' },
  { key: 'disagree', ...battleConfig.value.actions.disagree, description: '反驳对方观点，消耗更多TP但获得优势' }
]);

const battleMechanics = computed(() => [
  {
    title: '游戏目标',
    content: '将对方声望降至0或让议题偏向度达到±10'
  },
  {
    title: '初始状态',
    content: '双方开局各有30声望点，2TP，手牌5张'
  },
  {
    title: 'TP系统',
    content: '每回合开始时，双方TP恢复到上限。TP上限 = 2 + (回合数 - 1)，最高10TP'
  },
  {
    title: '手牌补充',
    content: '每回合开始时抽1张牌补充手牌（没有手牌上限）'
  },
  {
    title: '议题偏向度',
    content: '范围-10到+10。玩家优势时向+10发展，AI优势时向-10发展'
  },
  {
    title: '回合限制',
    content: '游戏最多进行12回合，若无人获胜则按剩余声望判定胜负'
  }
]);

const battleResults = computed(() => [
  {
    situation: '战斗机制说明',
    outcomes: [
      '强度差异决定结果：攻击卡强度 - 防御卡强度',
      '≥5差异：压倒性优势 | 1-4差异：轻微优势 | 0差异：平局 | -1到-4差异：轻微劣势 | ≤-5差异：压倒性劣势'
    ]
  },
  {
    situation: '攻击方式：友好安利（0 TP）',
    outcomes: [
      '防御赞同（0 TP）：温和互动，根据强度差异决定声望和议题偏向度变化',
      '防御反驳（1 TP）：激烈对抗，防御方承担更大风险但可能获得更高回报'
    ]
  },
  {
    situation: '攻击方式：辛辣点评（1 TP）',
    outcomes: [
      '防御赞同（0 TP）：认同犀利观点，攻击方优势时议题偏向度变化更大',
      '防御反驳（1 TP）：激烈交锋，双方都投入额外TP，结果更加极端'
    ]
  },
  {
    situation: '具体数值示例（友好安利 vs 赞同）',
    outcomes: [
      '压倒性优势(≥5)：攻击方+1声望，防御方-4声望，议题偏向+2',
      '轻微优势(1-4)：攻击方+0声望，防御方-3声望，议题偏向+1',
      '平局(0)：双方声望不变，议题偏向度不变',
      '轻微/压倒性劣势：攻击方失去3-4声望，议题偏向度不变'
    ]
  }
]);
</script>

<template>
  <div v-if="show" @click.self="emit('close')" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
      <div class="p-6 border-b border-gray-200">
        <h2 class="text-2xl font-bold text-center text-gray-800">🎯 宅理论战 - 战斗规则详解</h2>
      </div>

      <div class="p-6 overflow-y-auto flex-1">
        <div class="space-y-8">
          <!-- 基础规则 -->
          <section>
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <span class="w-6 h-6 bg-blue-500 text-white rounded-full text-sm flex items-center justify-center mr-2">1</span>
              基础规则
            </h3>
            <div class="grid md:grid-cols-2 gap-4">
              <div v-for="rule in battleMechanics" :key="rule.title" class="bg-gray-50 rounded-lg p-4">
                <h4 class="font-semibold text-gray-700 mb-2">{{ rule.title }}</h4>
                <p class="text-sm text-gray-600">{{ rule.content }}</p>
              </div>
            </div>
          </section>

          <!-- 行动类型 -->
          <section>
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <span class="w-6 h-6 bg-green-500 text-white rounded-full text-sm flex items-center justify-center mr-2">2</span>
              行动类型
            </h3>
            <div class="grid md:grid-cols-2 gap-4">
              <div v-for="action in actionStyles" :key="action.key" class="bg-gray-50 rounded-lg p-4">
                <div class="flex items-center justify-between mb-2">
                  <h4 class="font-semibold text-gray-700">{{ action.name }}</h4>
                  <span class="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                    {{ action.cost > 0 ? `+${action.cost} TP` : '免费' }}
                  </span>
                </div>
                <p class="text-sm text-gray-600">{{ action.description }}</p>
              </div>
            </div>
          </section>

          <!-- 战斗结果表 -->
          <section>
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <span class="w-6 h-6 bg-purple-500 text-white rounded-full text-sm flex items-center justify-center mr-2">3</span>
              战斗结果表
            </h3>
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <p class="text-sm text-yellow-800">
                <strong>说明：</strong>战斗结果取决于攻击方式、双方卡牌的关系（相同卡牌/相同标签/不同标签）以及防御方式。
              </p>
            </div>
            <div class="space-y-4">
              <div v-for="result in battleResults" :key="result.situation" class="border border-gray-200 rounded-lg overflow-hidden">
                <div class="bg-gray-100 px-4 py-3">
                  <h4 class="font-semibold text-gray-700">{{ result.situation }}</h4>
                </div>
                <div class="p-4 space-y-2">
                  <div v-for="outcome in result.outcomes" :key="outcome" class="text-sm text-gray-600 pl-4 border-l-2 border-gray-200">
                    {{ outcome }}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- 战术提示 -->
          <section>
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <span class="w-6 h-6 bg-orange-500 text-white rounded-full text-sm flex items-center justify-center mr-2">4</span>
              战术提示
            </h3>
            <div class="bg-blue-50 rounded-lg p-6">
              <ul class="space-y-3 text-sm text-blue-800">
                <li class="flex items-start">
                  <span class="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span><strong>卡牌强度：</strong>卡牌点数决定战斗强度，角色技能可以提供额外强度加成</span>
                </li>
                <li class="flex items-start">
                  <span class="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span><strong>TP管理：</strong>合理使用"辛辣点评"和"反驳"，在关键时刻通过额外TP消耗获得优势</span>
                </li>
                <li class="flex items-start">
                  <span class="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span><strong>议题控制：</strong>玩家优势时议题偏向+10方向，达到+10即可获胜</span>
                </li>
                <li class="flex items-start">
                  <span class="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span><strong>防御抉择：</strong>赞同通常更安全，反驳消耗TP但在劣势时可能扭转局势</span>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>

      <div class="p-6 border-t border-gray-200 bg-gray-50 text-center">
        <button @click="emit('close')" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          明白了，开始战斗！
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 滚动条样式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>