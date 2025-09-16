<script setup lang="ts">
import type { AnimeCard } from '@/types/card';
import { useGameStore, usePlayerStore } from '@/stores/battle';
import { StrengthCalculator } from '@/core/calculation/StrengthCalculator';
import { computed } from 'vue';

const props = defineProps<{
  card: AnimeCard;
  playerId: 'playerA' | 'playerB';
}>();

const gameStore = useGameStore();
const playerStore = usePlayerStore();

// 根据稀有度获取基础强度
const getBaseStrength = (rarity: string): number => {
  const rarityStrength = {
    'UR': 10,
    'HR': 8,
    'SSR': 6,
    'SR': 4,
    'R': 3,
    'N': 2
  };
  return rarityStrength[rarity as keyof typeof rarityStrength] || 2;
};

// 计算基础强度和最终强度
const baseStrength = computed(() => {
  return props.card.points || getBaseStrength(props.card.rarity);
});

const finalStrength = computed(() => {
  return StrengthCalculator.calculateFinalStrength(props.card, props.playerId);
});

// 是否有强度加成
const hasStrengthBonus = computed(() => {
  return finalStrength.value > baseStrength.value;
});

// 获取当前角色的羁绊标签
const activeCharacterTags = computed(() => {
  const activeCharacter = playerStore.getActiveCharacter(props.playerId);
  if (!activeCharacter?.synergy_tags) return [];
  return activeCharacter.synergy_tags;
});

// 检查羁绊匹配
const hasMatchingTags = computed(() => {
  if (!props.card.synergy_tags || !activeCharacterTags.value.length) return false;
  return props.card.synergy_tags.some(tag => activeCharacterTags.value.includes(tag));
});

// 匹配的标签数量
const matchingTagCount = computed(() => {
  if (!props.card.synergy_tags || !activeCharacterTags.value.length) return 0;
  return props.card.synergy_tags.filter(tag => activeCharacterTags.value.includes(tag)).length;
});
</script>

<template>
  <div class="card-strength-preview">
    <!-- 强度显示 -->
    <div class="strength-indicator" :class="{ 'has-synergy': hasMatchingTags, 'has-bonus': hasStrengthBonus }">
      <span class="strength-value">
        {{ baseStrength }}<span v-if="hasStrengthBonus" class="final-strength">({{ finalStrength }})</span>
      </span>
      <span class="strength-label">强度</span>
    </div>

    <!-- 羁绊指示器 -->
    <div v-if="hasMatchingTags" class="synergy-indicator">
      <div class="synergy-icon">⚡</div>
      <span class="synergy-count">{{ matchingTagCount }}</span>
    </div>

    <!-- 简化的标签显示 -->
    <div v-if="card.synergy_tags && card.synergy_tags.length > 0" class="tags-preview">
      <div class="tag-dots">
        <div
          v-for="(tag, index) in card.synergy_tags.slice(0, 3)"
          :key="tag"
          class="tag-dot"
          :class="{ 'active': activeCharacterTags.includes(tag) }"
          :title="tag"
        />
        <span v-if="card.synergy_tags.length > 3" class="more-tags">+{{ card.synergy_tags.length - 3 }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-strength-preview {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  z-index: 10;
}

.strength-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 8px;
  padding: 4px 8px;
  min-width: 40px;
  transition: all 0.2s ease;
}

.strength-indicator.has-synergy {
  background: rgba(34, 197, 94, 0.9);
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
}

.strength-indicator.has-bonus {
  background: rgba(59, 130, 246, 0.9);
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
}

.strength-indicator.has-synergy.has-bonus {
  background: rgba(34, 197, 94, 0.9);
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
}

.strength-value {
  font-size: 18px;
  font-weight: bold;
  color: #fbbf24;
  line-height: 1;
}

.final-strength {
  font-size: 14px;
  color: #10b981;
  margin-left: 2px;
}

.strength-label {
  font-size: 10px;
  color: #d1d5db;
  line-height: 1;
}

.synergy-indicator {
  display: flex;
  align-items: center;
  background: rgba(34, 197, 94, 0.9);
  border-radius: 12px;
  padding: 2px 6px;
  font-size: 12px;
  color: white;
  font-weight: bold;
}

.synergy-icon {
  font-size: 14px;
  margin-right: 2px;
}

.synergy-count {
  font-size: 10px;
}

.tags-preview {
  display: flex;
  align-items: center;
}

.tag-dots {
  display: flex;
  align-items: center;
  gap: 2px;
}

.tag-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(107, 114, 128, 0.8);
  transition: all 0.2s ease;
}

.tag-dot.active {
  background: #22c55e;
  box-shadow: 0 0 4px rgba(34, 197, 94, 0.6);
}

.more-tags {
  font-size: 8px;
  color: #9ca3af;
  margin-left: 2px;
}
</style>