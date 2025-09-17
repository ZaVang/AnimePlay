<script setup lang="ts">
import type { ActionRecord } from '@/types/debug';

interface Props {
  action: ActionRecord;
  playerNames: { playerA: string; playerB: string };
}

const props = defineProps<Props>();

/**
 * 格式化动作类型
 */
function getActionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'play_card': '出牌',
    'clash_resolve': '冲突解算',
    'turn_end': '回合结束',
    'turn_start': '回合开始',
    'skill_activation': '技能激活',
    'effect_apply': '效果应用'
  };
  return labels[type] || type;
}

/**
 * 获取动作类型样式
 */
function getActionTypeClass(type: string): string {
  const classes: Record<string, string> = {
    'play_card': 'bg-blue-100 text-blue-800',
    'clash_resolve': 'bg-purple-100 text-purple-800',
    'turn_end': 'bg-gray-100 text-gray-800',
    'turn_start': 'bg-green-100 text-green-800',
    'skill_activation': 'bg-yellow-100 text-yellow-800',
    'effect_apply': 'bg-red-100 text-red-800'
  };
  return classes[type] || 'bg-gray-100 text-gray-800';
}

/**
 * 获取玩家名称
 */
function getPlayerName(playerId: 'playerA' | 'playerB'): string {
  return props.playerNames[playerId] || playerId;
}

/**
 * 格式化时间戳
 */
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}
</script>

<template>
  <div class="action-detail-card">
    <!-- 基础信息 -->
    <div class="action-header">
      <div class="action-type-badge" :class="getActionTypeClass(action.actionType)">
        {{ getActionTypeLabel(action.actionType) }}
      </div>
      <div class="action-meta">
        <span class="player-name">{{ getPlayerName(action.playerId) }}</span>
        <span class="turn-info">第{{ action.turn }}回合</span>
        <span class="timestamp">{{ formatTimestamp(action.timestamp) }}</span>
      </div>
    </div>

    <!-- 动作描述 -->
    <div class="action-description">
      {{ action.description }}
    </div>

    <!-- 角色信息 -->
    <div v-if="action.beforeState[action.playerId].activeCharacter" class="character-info">
      <div class="character-badge">
        <span class="character-icon">👤</span>
        <span class="character-name">{{ action.beforeState[action.playerId].activeCharacter!.name }}</span>
        <span class="character-rarity">{{ action.beforeState[action.playerId].activeCharacter!.rarity }}</span>
        <span class="skill-count">{{ action.beforeState[action.playerId].activeCharacter!.skillCount }}个技能</span>
      </div>
    </div>

    <!-- 卡牌出牌详情 -->
    <div v-if="action.actionType === 'play_card' && action.details.card" class="card-play-details">
      <div class="card-info">
        <div class="card-name">
          {{ action.details.card.name }}
          <span v-if="action.details.style" class="play-style">
            ({{ action.details.style }})
          </span>
        </div>
        <div class="card-tags" v-if="action.details.card.synergy_tags?.length">
          <span v-for="tag in action.details.card.synergy_tags" :key="tag" class="tag">
            {{ tag }}
          </span>
        </div>
      </div>

      <!-- 强度计算详情 -->
      <div v-if="action.details.strengthCalculation" class="strength-calculation">
        <h5>💪 强度计算</h5>
        <div class="calculation-breakdown">
          <div class="base-stat">
            <span class="label">基础强度:</span>
            <span class="value">{{ action.details.strengthCalculation.baseStrength }}</span>
          </div>

          <div v-if="action.details.strengthCalculation.strengthBonuses?.length" class="bonuses">
            <div v-for="bonus in action.details.strengthCalculation.strengthBonuses"
                 :key="bonus.source" class="bonus-item">
              <div class="bonus-source">{{ bonus.source }}:</div>
              <div class="bonus-amount" :class="{
                positive: bonus.amount > 0,
                negative: bonus.amount < 0
              }">
                {{ bonus.amount > 0 ? '+' : '' }}{{ bonus.amount }}
              </div>
              <div class="bonus-reason">{{ bonus.reason }}</div>
            </div>
          </div>

          <div class="final-stat">
            <span class="label">最终强度:</span>
            <span class="value highlight">{{ action.details.strengthCalculation.finalStrength }}</span>
          </div>
        </div>
      </div>

      <!-- 费用计算详情 -->
      <div v-if="action.details.costCalculation" class="cost-calculation">
        <h5>💰 费用计算</h5>
        <div class="calculation-breakdown">
          <div class="base-stat">
            <span class="label">基础费用:</span>
            <span class="value">{{ action.details.costCalculation.baseCost }}</span>
          </div>

          <div v-if="action.details.costCalculation.costReductions?.length" class="reductions">
            <div v-for="reduction in action.details.costCalculation.costReductions"
                 :key="reduction.source" class="reduction-item">
              <div class="reduction-source">{{ reduction.source }}:</div>
              <div class="reduction-amount">-{{ reduction.amount }}</div>
              <div class="reduction-reason">{{ reduction.reason }}</div>
            </div>
          </div>

          <div class="final-stat">
            <span class="label">实际费用:</span>
            <span class="value highlight">{{ action.details.costCalculation.finalCost }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 冲突解算详情 -->
    <div v-if="action.actionType === 'clash_resolve'" class="clash-resolve-details">
      <div class="clash-summary">
        <h5>⚔️ 战斗结果</h5>

        <div class="strength-comparison">
          <div class="attacker-strength">
            <div class="strength-label">攻击方强度</div>
            <div class="strength-value">{{ action.details.attackStrength || 0 }}</div>
          </div>

          <div class="vs-divider">VS</div>

          <div class="defender-strength">
            <div class="strength-label">防御方强度</div>
            <div class="strength-value">{{ action.details.defenseStrength || 0 }}</div>
          </div>
        </div>

        <div v-if="action.details.result" class="battle-outcome">
          <div class="winner">
            <span class="label">获胜者:</span>
            <span class="winner-name" :class="{
              'player-a': action.details.result.winner === 'playerA',
              'player-b': action.details.result.winner === 'playerB',
              'draw': action.details.result.winner === 'draw'
            }">
              {{ action.details.result.winner === 'draw' ? '平局' : getPlayerName(action.details.result.winner) }}
            </span>
          </div>

          <div class="reputation-changes">
            <h6>声望变化</h6>
            <div class="reputation-change"
                 v-if="action.details.result.reputationChange?.playerA !== 0">
              <span>{{ playerNames.playerA }}:</span>
              <span :class="{
                positive: action.details.result.reputationChange.playerA > 0,
                negative: action.details.result.reputationChange.playerA < 0
              }">
                {{ action.details.result.reputationChange.playerA > 0 ? '+' : '' }}{{ action.details.result.reputationChange.playerA }}
              </span>
            </div>
            <div class="reputation-change"
                 v-if="action.details.result.reputationChange?.playerB !== 0">
              <span>{{ playerNames.playerB }}:</span>
              <span :class="{
                positive: action.details.result.reputationChange.playerB > 0,
                negative: action.details.result.reputationChange.playerB < 0
              }">
                {{ action.details.result.reputationChange.playerB > 0 ? '+' : '' }}{{ action.details.result.reputationChange.playerB }}
              </span>
            </div>
          </div>

          <div v-if="action.details.result.topicBiasChange !== 0" class="topic-bias-change">
            <span class="label">议题偏向变化:</span>
            <span :class="{
              positive: action.details.result.topicBiasChange > 0,
              negative: action.details.result.topicBiasChange < 0
            }">
              {{ action.details.result.topicBiasChange > 0 ? '+' : '' }}{{ action.details.result.topicBiasChange }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 技能激活详情 -->
    <div v-if="action.actionType === 'skill_activation'" class="skill-details">
      <div class="skill-info">
        <h5>✨ {{ action.details.skillName }}</h5>
        <div class="skill-description">{{ action.details.effectDescription }}</div>
        <div v-if="action.details.effectDuration" class="skill-duration">
          持续时间: {{ action.details.effectDuration }}回合
        </div>
      </div>
    </div>

    <!-- 状态变化详情 -->
    <div class="state-changes">
      <h5>📊 状态变化</h5>
      <div class="state-comparison">
        <div class="before-after">
          <div class="before">
            <h6>变化前</h6>
            <div class="state-values">
              <div>声望: {{ action.beforeState[action.playerId].reputation }}</div>
              <div>TP: {{ action.beforeState[action.playerId].tp }}</div>
              <div>话题偏向: {{ action.beforeState.game.topicBias }}</div>
            </div>
          </div>

          <div class="arrow">→</div>

          <div class="after">
            <h6>变化后</h6>
            <div class="state-values">
              <div>声望: {{ action.afterState[action.playerId].reputation }}
                <span v-if="action.afterState[action.playerId].reputation !== action.beforeState[action.playerId].reputation"
                      :class="{
                        positive: action.afterState[action.playerId].reputation > action.beforeState[action.playerId].reputation,
                        negative: action.afterState[action.playerId].reputation < action.beforeState[action.playerId].reputation
                      }">
                  ({{ action.afterState[action.playerId].reputation > action.beforeState[action.playerId].reputation ? '+' : '' }}{{ action.afterState[action.playerId].reputation - action.beforeState[action.playerId].reputation }})
                </span>
              </div>
              <div>TP: {{ action.afterState[action.playerId].tp }}
                <span v-if="action.afterState[action.playerId].tp !== action.beforeState[action.playerId].tp"
                      :class="{
                        positive: action.afterState[action.playerId].tp > action.beforeState[action.playerId].tp,
                        negative: action.afterState[action.playerId].tp < action.beforeState[action.playerId].tp
                      }">
                  ({{ action.afterState[action.playerId].tp > action.beforeState[action.playerId].tp ? '+' : '' }}{{ action.afterState[action.playerId].tp - action.beforeState[action.playerId].tp }})
                </span>
              </div>
              <div>话题偏向: {{ action.afterState.game.topicBias }}
                <span v-if="action.afterState.game.topicBias !== action.beforeState.game.topicBias"
                      :class="{
                        positive: action.afterState.game.topicBias > action.beforeState.game.topicBias,
                        negative: action.afterState.game.topicBias < action.beforeState.game.topicBias
                      }">
                  ({{ action.afterState.game.topicBias > action.beforeState.game.topicBias ? '+' : '' }}{{ action.afterState.game.topicBias - action.beforeState.game.topicBias }})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.action-detail-card {
  @apply bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4;
}

.action-header {
  @apply flex items-center justify-between;
}

.action-type-badge {
  @apply px-3 py-1 rounded-full text-sm font-medium;
}

.action-meta {
  @apply flex items-center gap-3 text-sm text-gray-800;
}

.player-name {
  @apply font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded;
}

.turn-info {
  @apply text-indigo-700 font-medium;
}

.timestamp {
  @apply text-xs text-gray-700;
}

.action-description {
  @apply text-gray-900 font-semibold text-lg;
}

.character-info {
  @apply bg-purple-50 rounded-lg p-3;
}

.character-badge {
  @apply flex items-center gap-2;
}

.character-icon {
  @apply text-lg;
}

.character-name {
  @apply font-semibold text-purple-700;
}

.character-rarity {
  @apply bg-purple-200 text-purple-800 px-2 py-1 rounded text-xs font-medium;
}

.skill-count {
  @apply text-purple-600 text-sm;
}

.card-play-details {
  @apply space-y-3;
}

.card-info {
  @apply border-l-4 border-blue-400 pl-3;
}

.card-name {
  @apply text-lg font-semibold text-purple-700;
}

.play-style {
  @apply text-orange-600 font-normal;
}

.card-tags {
  @apply flex gap-1 mt-1;
}

.tag {
  @apply bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs;
}

.strength-calculation,
.cost-calculation {
  @apply bg-gray-50 rounded p-3;
}

.strength-calculation h5,
.cost-calculation h5 {
  @apply text-base font-bold text-gray-900 mb-3;
}

.calculation-breakdown {
  @apply space-y-3;
}

.base-stat,
.final-stat {
  @apply flex justify-between items-center;
}

.final-stat {
  @apply border-t-2 border-blue-200 pt-3 font-bold text-lg;
}

.label {
  @apply text-gray-900 font-medium;
}

.value {
  @apply text-gray-900 font-semibold;
}

.value.highlight {
  @apply text-blue-700 font-bold text-xl bg-blue-50 px-2 py-1 rounded;
}

.bonuses,
.reductions {
  @apply space-y-1;
}

.bonus-item,
.reduction-item {
  @apply bg-white rounded-lg p-3 text-sm border border-gray-200;
}

.bonus-source,
.reduction-source {
  @apply font-bold text-gray-900;
}

.bonus-amount,
.reduction-amount {
  @apply font-bold text-base;
}

.bonus-amount.positive {
  @apply text-green-700 bg-green-50 px-2 py-1 rounded;
}

.bonus-amount.negative {
  @apply text-red-700 bg-red-50 px-2 py-1 rounded;
}

.reduction-amount {
  @apply text-green-700 bg-green-50 px-2 py-1 rounded;
}

.bonus-reason,
.reduction-reason {
  @apply text-sm text-gray-800 mt-2 font-medium;
}

.clash-resolve-details {
  @apply space-y-3;
}

.clash-summary h5 {
  @apply text-xl font-bold text-gray-900 mb-4;
}

.strength-comparison {
  @apply flex items-center justify-center gap-6 bg-gradient-to-r from-blue-50 to-red-50 rounded-lg p-6 border-2 border-gray-200;
}

.attacker-strength,
.defender-strength {
  @apply text-center;
}

.strength-label {
  @apply text-base font-bold text-gray-800 mb-2;
}

.strength-value {
  @apply text-4xl font-bold text-blue-700 bg-white px-4 py-2 rounded-lg shadow;
}

.vs-divider {
  @apply text-2xl font-bold text-gray-800 bg-white px-3 py-2 rounded-full shadow;
}

.battle-outcome {
  @apply space-y-3;
}

.winner {
  @apply flex items-center gap-3 bg-yellow-50 p-3 rounded-lg border-2 border-yellow-200;
}

.winner .label {
  @apply text-gray-900 font-bold text-lg;
}

.winner-name.player-a {
  @apply text-blue-700 font-bold text-xl bg-blue-100 px-3 py-1 rounded;
}

.winner-name.player-b {
  @apply text-red-700 font-bold text-xl bg-red-100 px-3 py-1 rounded;
}

.winner-name.draw {
  @apply text-gray-700 font-bold text-xl bg-gray-100 px-3 py-1 rounded;
}

.reputation-changes h6 {
  @apply text-base font-bold text-gray-900 mb-3;
}

.reputation-change {
  @apply flex justify-between items-center bg-white p-2 rounded border;
}

.topic-bias-change {
  @apply flex justify-between items-center bg-white p-3 rounded-lg border-2 border-indigo-200;
}

.skill-details {
  @apply bg-yellow-50 rounded p-3;
}

.skill-info h5 {
  @apply text-lg font-semibold text-yellow-800 mb-2;
}

.skill-description {
  @apply text-yellow-700;
}

.skill-duration {
  @apply text-sm text-yellow-600 mt-2;
}

.state-changes {
  @apply border-t-2 border-gray-300 pt-4;
}

.state-changes h5 {
  @apply text-lg font-bold text-gray-900 mb-4;
}

.state-comparison {
  @apply bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-gray-200;
}

.before-after {
  @apply flex items-center gap-6;
}

.before,
.after {
  @apply flex-1;
}

.before h6,
.after h6 {
  @apply text-base font-bold text-gray-900 mb-3;
}

.state-values {
  @apply space-y-2 text-base;
}

.state-values > div {
  @apply bg-white p-2 rounded border font-medium text-gray-900;
}

.arrow {
  @apply text-3xl text-indigo-600 font-bold bg-white px-3 py-2 rounded-full shadow;
}

.positive {
  @apply text-green-700 font-bold bg-green-100 px-2 py-1 rounded;
}

.negative {
  @apply text-red-700 font-bold bg-red-100 px-2 py-1 rounded;
}
</style>