<script setup lang="ts">
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/stores/userStore';
import ResourceDisplay from './actions/ResourceDisplay.vue';
import TrainingSystem from './actions/TrainingSystem.vue';
import BattleTraining from './actions/BattleTraining.vue';
import SpecialActivities from './actions/SpecialActivities.vue';

const props = defineProps<{
  character: CharacterCard & { nurtureData: CharacterNurtureData };
}>();
</script>

<template>
  <div class="p-6">
    <!-- 当前资源显示 -->
    <ResourceDisplay :character="character" />
    
    <!-- 养成属性训练区域 -->
    <TrainingSystem :character="character" />
    
    <!-- 战斗属性训练区域 -->
    <BattleTraining :character="character" />
    
    <!-- 特殊活动区域 -->
    <SpecialActivities :character="character" />
  </div>
</template>