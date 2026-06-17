<script setup lang="ts">
import { computed } from 'vue';
import { GAME_CONFIG } from '@/config/gameConfig';

defineProps<{
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
    content: '每回合开始时，双方TP恢复到上限。TP上限 = 2 + (回合数 - 1)，最高 10'
  },
  {
    title: '手牌补充',
    content: '每回合开始时抽1张牌（手牌上限10张）；牌库抽空时会自动把弃牌堆洗回牌库续抽'
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
    situation: '判定机制',
    outcomes: [
      '对撞结果 = 攻击卡最终强度 − 防御卡最终强度（防御方不出卡按强度 0 计）',
      '≥5 压倒性优势 ｜ 1~4 轻微优势 ｜ 0 平局 ｜ -1~-4 轻微劣势 ｜ ≤-5 压倒性劣势',
      '下面四张表为「攻击 × 防御」组合的完整数值；「议题→攻方+N」表示议题偏向向攻击方推进 N 格'
    ]
  },
  {
    situation: '友好安利（0 TP） × 赞同（0 TP）',
    outcomes: [
      '压倒性优势(≥5)：攻方 +1 声望，守方 -4 声望，议题→攻方 +2',
      '轻微优势(1~4)：守方 -3 声望，议题→攻方 +1',
      '平局(0)：无变化',
      '轻微劣势(-1~-4)：攻方 -3 声望',
      '压倒性劣势(≤-5)：攻方 -4 声望'
    ]
  },
  {
    situation: '辛辣点评（+1 TP） × 赞同（0 TP）',
    outcomes: [
      '压倒性优势(≥5)：攻方 -1 声望，守方 -6 声望，议题→攻方 +2',
      '轻微优势(1~4)：攻方 -1 声望，守方 -5 声望，议题→攻方 +1',
      '平局(0)：无变化',
      '轻微劣势(-1~-4)：攻方 -5 声望',
      '压倒性劣势(≤-5)：攻方 -6 声望'
    ]
  },
  {
    situation: '友好安利（0 TP） × 反驳（+1 TP）',
    outcomes: [
      '压倒性优势(≥5)：攻方 +1 声望，守方 -5 声望，议题→攻方 +2',
      '轻微优势(1~4)：守方 -4 声望，议题→攻方 +1',
      '平局(0)：攻方 -1 声望，守方 +1 声望（反驳在平局时反咬一口）',
      '轻微劣势(-1~-4)：攻方 -4 声望（反驳=真反击，比赞同让攻方亏更多）',
      '压倒性劣势(≤-5)：攻方 -5 声望'
    ]
  },
  {
    situation: '辛辣点评（+1 TP） × 反驳（+1 TP）',
    outcomes: [
      '压倒性优势(≥5)：攻方 -1 声望，守方 -7 声望，议题→攻方 +2',
      '轻微优势(1~4)：攻方 -1 声望，守方 -6 声望，议题→攻方 +1',
      '平局(0)：无变化',
      '轻微劣势(-1~-4)：攻方 -6 声望',
      '压倒性劣势(≤-5)：攻方 -7 声望'
    ]
  }
]);
</script>

<template>
  <div v-if="show" @click.self="emit('close')" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
    <div class="bg-elevated rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
      <div class="p-6 border-b border-line">
        <h2 class="text-2xl font-bold text-center text-ink">🎯 宅理论战 - 战斗规则详解</h2>
      </div>

      <div class="p-6 overflow-y-auto flex-1">
        <div class="space-y-8">
          <!-- 基础规则 -->
          <section>
            <h3 class="text-lg font-bold text-ink mb-4 flex items-center">
              <span class="w-6 h-6 bg-blue-500 text-white rounded-full text-sm flex items-center justify-center mr-2">1</span>
              基础规则
            </h3>
            <div class="grid md:grid-cols-2 gap-4">
              <div v-for="rule in battleMechanics" :key="rule.title" class="bg-surface-2 rounded-lg p-4">
                <h4 class="font-semibold text-ink mb-2">{{ rule.title }}</h4>
                <p class="text-sm text-ink-2">{{ rule.content }}</p>
              </div>
            </div>
          </section>

          <!-- 行动类型 -->
          <section>
            <h3 class="text-lg font-bold text-ink mb-4 flex items-center">
              <span class="w-6 h-6 bg-accent text-on-accent rounded-full text-sm flex items-center justify-center mr-2">2</span>
              行动类型
            </h3>
            <div class="grid md:grid-cols-2 gap-4">
              <div v-for="action in actionStyles" :key="action.key" class="bg-surface-2 rounded-lg p-4">
                <div class="flex items-center justify-between mb-2">
                  <h4 class="font-semibold text-ink">{{ action.name }}</h4>
                  <span class="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                    {{ action.cost > 0 ? `+${action.cost} TP` : '免费' }}
                  </span>
                </div>
                <p class="text-sm text-ink-2">{{ action.description }}</p>
              </div>
            </div>
          </section>

          <!-- 战斗结果表 -->
          <section>
            <h3 class="text-lg font-bold text-ink mb-4 flex items-center">
              <span class="w-6 h-6 bg-purple-500 text-white rounded-full text-sm flex items-center justify-center mr-2">3</span>
              战斗结果表
            </h3>
            <div class="bg-warning/10 border-l-4 border-warning p-4 mb-4">
              <p class="text-sm text-ink-2">
                <strong>说明：</strong>战斗结果取决于攻击方式、双方卡牌的关系（相同卡牌/相同标签/不同标签）以及防御方式。
              </p>
            </div>
            <div class="space-y-4">
              <div v-for="result in battleResults" :key="result.situation" class="border border-line rounded-lg overflow-hidden">
                <div class="bg-surface-2 px-4 py-3">
                  <h4 class="font-semibold text-ink">{{ result.situation }}</h4>
                </div>
                <div class="p-4 space-y-2">
                  <div v-for="outcome in result.outcomes" :key="outcome" class="text-sm text-ink-2 pl-4 border-l-2 border-line">
                    {{ outcome }}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- 战术提示 -->
          <section>
            <h3 class="text-lg font-bold text-ink mb-4 flex items-center">
              <span class="w-6 h-6 bg-orange-500 text-white rounded-full text-sm flex items-center justify-center mr-2">4</span>
              战术提示
            </h3>
            <div class="bg-info/10 rounded-lg p-6">
              <ul class="space-y-3 text-sm text-ink-2">
                <li class="flex items-start">
                  <span class="w-2 h-2 bg-info rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span><strong>卡牌强度：</strong>卡牌点数决定战斗强度，角色技能可以提供额外强度加成</span>
                </li>
                <li class="flex items-start">
                  <span class="w-2 h-2 bg-info rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span><strong>TP管理：</strong>合理使用"辛辣点评"和"反驳"，在关键时刻通过额外TP消耗获得优势</span>
                </li>
                <li class="flex items-start">
                  <span class="w-2 h-2 bg-info rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span><strong>议题控制：</strong>玩家优势时议题偏向+10方向，达到+10即可获胜</span>
                </li>
                <li class="flex items-start">
                  <span class="w-2 h-2 bg-info rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span><strong>防御抉择：</strong>赞同通常更安全，反驳消耗TP但在劣势时可能扭转局势</span>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>

      <div class="p-6 border-t border-line bg-surface-2 text-center">
        <button @click="emit('close')" class="btn-primary">
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
  background: rgb(var(--c-surface-2));
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgb(var(--c-line-2));
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgb(var(--c-ink-3));
}
</style>