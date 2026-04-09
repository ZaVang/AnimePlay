<script setup lang="ts">
import { ref } from 'vue';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/types/store';
import QuickInteractions from './interactions/QuickInteractions.vue';
import DeepInteractions from './interactions/DeepInteractions.vue';
import GiftSystem from './interactions/GiftSystem.vue';
import ActivitySystem from './interactions/ActivitySystem.vue';
import CampusActivities from './interactions/CampusActivities.vue';
import CharacterStatus from './interactions/CharacterStatus.vue';

const props = defineProps<{
  character: CharacterCard & { nurtureData: CharacterNurtureData };
}>();

const emit = defineEmits<{
  startDialogue: [];
}>();

// 当前选中的互动类型
const selectedInteractionType = ref<'gift' | 'activity' | 'campus_activity' | null>(null);

// 打开各种互动界面
function openGiftSelection() {
  selectedInteractionType.value = 'gift';
}

function openActivitySelection() {
  selectedInteractionType.value = 'activity';
}

function openCampusActivitySelection() {
  selectedInteractionType.value = 'campus_activity';
}

// 关闭选择界面
function closeSelection() {
  selectedInteractionType.value = null;
}

// 开始对话
function startDialogue() {
  emit('startDialogue');
}
</script>

<template>
  <div class="p-6">
    <!-- 快速互动按钮 -->
    <QuickInteractions :character="character" />

    <!-- 主要互动选项 -->
    <DeepInteractions 
      :character="character"
      @start-dialogue="startDialogue"
      @open-gift="openGiftSelection"
      @open-activity="openActivitySelection"
      @open-campus="openCampusActivitySelection"
    />

    <!-- 礼物选择模态框 -->
    <GiftSystem 
      :character="character"
      :is-open="selectedInteractionType === 'gift'"
      @close="closeSelection"
    />

    <!-- 活动选择模态框 -->
    <ActivitySystem 
      :character="character"
      :is-open="selectedInteractionType === 'activity'"
      @close="closeSelection"
    />

    <!-- 校园活动选择模态框 -->
    <CampusActivities 
      :character="character"
      :is-open="selectedInteractionType === 'campus_activity'"
      @close="closeSelection"
    />
    
    <!-- 当前角色状态提示 -->
    <CharacterStatus :character="character" />
  </div>
</template>