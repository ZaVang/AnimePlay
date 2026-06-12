<script setup lang="ts">
import { computed } from 'vue';
import { usePlayerStore } from '@/stores/battle';
import { SkillSystem } from '@/skills/runtime';
import { isSkillImplemented } from '@/skills/effects';
import type { Card, Skill } from '@/types';

const props = defineProps<{
  character: Card;
  playerId: 'playerA' | 'playerB';
  isMainDebater: boolean;
  isVisible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'useSkill', skill: Skill): void;
  (e: 'rotate'): void;
}>();

const playerStore = usePlayerStore();

// 检查是否可以轮换角色
const canRotate = computed(() => {
  return playerStore.canRotateCharacter(props.playerId);
});
</script>

<template>
  <div v-if="isVisible" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <div class="character-info">
        <img :src="character.image_path" :alt="character.name" class="character-image">
        <div class="character-details">
          <h3 class="text-2xl font-bold">{{ character.name }}</h3>
          <p class="text-sm text-ink-2">{{ character.rarity }} - {{ character.anime_names?.[0] || '未知系列' }}</p>
          <p class="mt-2 text-sm">{{ character.description }}</p>
        </div>
      </div>

      <div class="skills-section">
        <h4 class="text-lg font-bold mb-2">技能</h4>
        <div v-if="!character.skills || character.skills.length === 0" class="text-ink-2">该角色没有技能。</div>
        <div v-else class="skills-list">
          <div v-for="skill in character.skills" :key="skill.id" class="skill-item">
            <div class="skill-header">
              <span class="font-bold">{{ skill.name }}
                <!-- S8a 诚实化：播报式/占位技能明示未实装 -->
                <span
                  v-if="!isSkillImplemented(skill)"
                  class="badge-unimplemented"
                  title="该技能尚未实装：当前不产生实际效果（S8 实装中）"
                >⚠️ 未实装</span>
              </span>
              <span class="text-xs px-2 py-1 rounded-full" :class="skill.type === '被动光环' ? 'bg-surface-2 text-ink-2' : 'bg-accent text-on-accent'">{{ skill.type }}</span>
            </div>
            <p class="text-sm text-ink-2 mt-1">{{ skill.description }}</p>
            <div class="skill-footer" v-if="skill.type === '主动技能'">
              <span>消耗: {{ skill.cost || 0 }} TP</span>
              <span>冷却: {{ skill.cooldown || 0 }} 回合</span>
              <button
                v-if="isMainDebater"
                @click="emit('useSkill', skill)"
                :disabled="!SkillSystem.canUseSkill(playerId, skill)"
                class="btn-use-skill"
              >
                使用
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="actions-section" v-if="!isMainDebater">
        <button 
          @click="emit('rotate')" 
          :disabled="!canRotate"
          :title="canRotate ? '轮换为主辩手' : '本回合已经轮换过主辩手'"
          class="btn-rotate"
          :class="{ 'disabled': !canRotate }"
        >
          轮换为主辩手
          <span v-if="!canRotate" class="text-xs block">(本回合已用)</span>
        </button>
      </div>

      <button @click="emit('close')" class="absolute top-3 right-3 text-ink-2 hover:text-ink text-2xl">✕</button>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  /* ... (same as CardActionModal) */
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal-content {
  @apply bg-elevated text-ink p-6 rounded-lg border-2 border-line-2 w-full max-w-2xl;
  position: relative;
}
.character-info {
  @apply flex gap-6 border-b border-line pb-4 mb-4;
}
.character-image {
  @apply w-32 h-44 object-cover rounded-lg border-2 border-line;
}
.skills-section {
  @apply mb-4;
}
.skills-list {
  @apply space-y-3;
}
.skill-item {
  @apply bg-surface-2/50 p-3 rounded-lg;
}
.skill-header, .skill-footer {
  @apply flex items-center justify-between gap-2;
}
.badge-unimplemented {
  @apply ml-1 align-middle text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/40;
}
.btn-use-skill {
  @apply bg-accent hover:bg-accent-strong disabled:bg-surface-2 disabled:text-ink-3 disabled:cursor-not-allowed text-on-accent font-bold py-1 px-3 rounded;
}
.actions-section {
  @apply text-center mt-4;
}
.btn-rotate {
  @apply bg-accent hover:bg-accent-strong text-on-accent font-bold py-2 px-6 rounded-lg text-lg;
}

.btn-rotate.disabled {
  @apply bg-surface-2 cursor-not-allowed text-ink-3;
}

.btn-rotate.disabled:hover {
  @apply bg-surface-2;
}
</style>
