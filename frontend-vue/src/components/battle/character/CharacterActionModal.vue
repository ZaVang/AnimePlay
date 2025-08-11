<script setup lang="ts">
import { computed } from 'vue';
import { usePlayerStore } from '@/stores/battle';
import { SkillSystem } from '@/core/systems/SkillSystem';
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
</script>

<template>
  <div v-if="isVisible" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <div class="character-info">
        <img :src="character.image_path" :alt="character.name" class="character-image">
        <div class="character-details">
          <h3 class="text-2xl font-bold">{{ character.name }}</h3>
          <p class="text-sm text-gray-400">{{ character.rarity }} - {{ character.anime_names?.[0] || '未知系列' }}</p>
          <p class="mt-2 text-sm">{{ character.description }}</p>
        </div>
      </div>

      <div class="skills-section">
        <h4 class="text-lg font-bold mb-2">技能</h4>
        <div v-if="!character.skills || character.skills.length === 0" class="text-gray-500">该角色没有技能。</div>
        <div v-else class="skills-list">
          <div v-for="skill in character.skills" :key="skill.id" class="skill-item">
            <div class="skill-header">
              <span class="font-bold">{{ skill.name }}</span>
              <span class="text-xs px-2 py-1 rounded-full" :class="skill.type === '被动光环' ? 'bg-gray-600' : 'bg-blue-600'">{{ skill.type }}</span>
            </div>
            <p class="text-sm text-gray-300 mt-1">{{ skill.description }}</p>
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
        <button @click="emit('rotate')" class="btn-rotate">轮换为主辩手</button>
      </div>

      <button @click="emit('close')" class="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl">✕</button>
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
  @apply bg-gray-800 text-white p-6 rounded-lg border-2 border-gray-700 w-full max-w-2xl;
  position: relative;
}
.character-info {
  @apply flex gap-6 border-b border-gray-700 pb-4 mb-4;
}
.character-image {
  @apply w-32 h-44 object-cover rounded-lg border-2 border-gray-600;
}
.skills-section {
  @apply mb-4;
}
.skills-list {
  @apply space-y-3;
}
.skill-item {
  @apply bg-gray-900/50 p-3 rounded-lg;
}
.skill-header, .skill-footer {
  @apply flex items-center justify-between gap-2;
}
.btn-use-skill {
  @apply bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-1 px-3 rounded;
}
.actions-section {
  @apply text-center mt-4;
}
.btn-rotate {
  @apply bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg text-lg;
}
</style>
