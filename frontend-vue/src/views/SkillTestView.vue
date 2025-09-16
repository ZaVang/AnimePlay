<template>
  <div class="skill-test-container p-6 bg-gray-900 min-h-screen text-white">
    <h1 class="text-3xl font-bold mb-6">逢坂大河技能测试</h1>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- 技能状态显示 -->
      <div class="bg-gray-800 rounded-lg p-4">
        <h2 class="text-xl font-bold mb-4">技能注册状态</h2>
        <div class="space-y-2">
          <div v-for="skill in skillStatus" :key="skill.name" class="flex justify-between">
            <span>{{ skill.name }}</span>
            <span :class="skill.registered ? 'text-green-400' : 'text-red-400'">
              {{ skill.registered ? '✅ 已注册' : '❌ 未注册' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 角色状态 -->
      <div class="bg-gray-800 rounded-lg p-4">
        <h2 class="text-xl font-bold mb-4">角色状态</h2>
        <div v-if="taigaCharacter">
          <p><strong>名称:</strong> {{ taigaCharacter.name }}</p>
          <p><strong>ID:</strong> {{ taigaCharacter.id }}</p>
          <p><strong>稀有度:</strong> {{ taigaCharacter.rarity }}</p>
          <p><strong>技能数量:</strong> {{ taigaCharacter.skills?.length || 0 }}</p>
        </div>
        <p v-else class="text-red-400">❌ 角色数据未找到</p>
      </div>

      <!-- 玩家状态 -->
      <div class="bg-gray-800 rounded-lg p-4">
        <h2 class="text-xl font-bold mb-4">玩家状态</h2>
        <div class="space-y-2">
          <p><strong>声望:</strong>
            <input
              v-model.number="playerReputation"
              type="number"
              class="bg-gray-700 text-white px-2 py-1 rounded ml-2"
              @change="updateReputation"
            >
          </p>
          <p><strong>TP:</strong>
            <input
              v-model.number="playerTP"
              type="number"
              class="bg-gray-700 text-white px-2 py-1 rounded ml-2"
              @change="updateTP"
            >
          </p>
        </div>
      </div>

      <!-- 技能测试 -->
      <div class="bg-gray-800 rounded-lg p-4">
        <h2 class="text-xl font-bold mb-4">技能测试</h2>
        <div class="space-y-3">
          <button
            @click="testSkillRegistration"
            class="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            测试技能注册
          </button>
          <button
            @click="usePalmTiger"
            class="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
            :disabled="!canUsePalmTiger"
          >
            使用掌中老虎
          </button>
          <button
            @click="activateTsundereCounter"
            class="w-full bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
          >
            激活傲娇反击
          </button>
        </div>
      </div>

      <!-- 效果显示 -->
      <div class="bg-gray-800 rounded-lg p-4 md:col-span-2">
        <h2 class="text-xl font-bold mb-4">当前效果</h2>
        <div v-if="activeEffects.length === 0" class="text-gray-400">
          无活跃效果
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="(effect, index) in activeEffects"
            :key="index"
            class="bg-gray-700 p-3 rounded flex justify-between"
          >
            <div>
              <p class="font-bold">{{ effect.type }}</p>
              <p class="text-sm text-gray-300">{{ effect.description }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm">持续: {{ effect.duration === -1 ? '永久' : effect.duration + '回合' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 测试日志 -->
      <div class="bg-gray-800 rounded-lg p-4 md:col-span-2">
        <h2 class="text-xl font-bold mb-4">测试日志</h2>
        <div class="bg-black rounded p-3 h-32 overflow-y-auto">
          <div v-for="(log, index) in testLogs" :key="index" class="text-sm mb-1">
            <span class="text-gray-500">[{{ log.time }}]</span>
            <span :class="log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-gray-300'">
              {{ log.message }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useGameDataStore } from '@/stores/gameDataStore';
import { usePlayerStore, useGameStore } from '@/stores/battle';
import { SkillSystem } from '@/core/systems/SkillSystem';
import { systemRegistry } from '@/core/di/registry';
import { hasSkillEffect, runEffect } from '@/skills/registry';
import type { CharacterCard } from '@/types/card';
// import type { PersistentEffect } from '@/types/effects';

const gameDataStore = useGameDataStore();
const playerStore = usePlayerStore();
const gameStore = useGameStore();

const taigaCharacter = ref<CharacterCard | null>(null);
const playerReputation = ref(25);
const playerTP = ref(10);
const activeEffects = ref<any[]>([]);
const testLogs = ref<Array<{ time: string; message: string; type: string }>>([]);

const skillStatus = computed(() => [
  {
    name: '掌中老虎',
    registered: hasSkillEffect('逢坂大河_掌中老虎')
  },
  {
    name: '傲娇反击',
    registered: hasSkillEffect('逢坂大河_傲娇反击')
  }
]);

const canUsePalmTiger = computed(() => {
  return playerReputation.value < 30 && playerTP.value >= 3;
});

function addLog(message: string, type = 'info') {
  const time = new Date().toLocaleTimeString();
  testLogs.value.push({ time, message, type });
  console.log(`[${time}] ${message}`);
}

function updateReputation() {
  playerStore.playerA.reputation = playerReputation.value;
  addLog(`声望更新为: ${playerReputation.value}`);
}

function updateTP() {
  playerStore.playerA.tp = playerTP.value;
  addLog(`TP更新为: ${playerTP.value}`);
}

function updateEffects() {
  try {
    const persistentSystem = systemRegistry.getPersistentEffectSystem();
    // 临时注释，因为API可能不同
    activeEffects.value = [];
    addLog('效果系统已连接');
  } catch (error) {
    addLog('获取效果失败: ' + error, 'error');
  }
}

async function testSkillRegistration() {
  addLog('开始技能注册测试...');

  const skills = ['逢坂大河_掌中老虎', '逢坂大河_傲娇反击'];
  for (const skillId of skills) {
    const registered = hasSkillEffect(skillId);
    addLog(`${skillId}: ${registered ? '✅ 已注册' : '❌ 未注册'}`, registered ? 'success' : 'error');
  }
}

async function usePalmTiger() {
  try {
    addLog('使用掌中老虎技能...');

    await runEffect('逢坂大河_掌中老虎', {
      event: 'onPlay',
      playerId: 'playerA',
      role: 'attacker'
    });

    addLog('✅ 掌中老虎技能使用成功', 'success');
    updateEffects();
  } catch (error) {
    addLog('❌ 掌中老虎技能使用失败: ' + error, 'error');
  }
}

async function activateTsundereCounter() {
  try {
    addLog('激活傲娇反击...');

    await runEffect('逢坂大河_傲娇反击', {
      event: 'onPlay',
      playerId: 'playerA',
      role: 'attacker'
    });

    addLog('✅ 傲娇反击激活成功', 'success');
    updateEffects();
  } catch (error) {
    addLog('❌ 傲娇反击激活失败: ' + error, 'error');
  }
}

onMounted(() => {
  // 加载逢坂大河角色数据
  taigaCharacter.value = gameDataStore.getCharacterCardById(1762);

  if (taigaCharacter.value) {
    addLog(`找到逢坂大河角色: ${taigaCharacter.value.name}`, 'success');

    // 设置为当前角色
    playerStore.playerA.characters[0] = taigaCharacter.value;
    playerStore.playerA.activeCharacterIndex = 0;
  } else {
    addLog('未找到逢坂大河角色数据', 'error');
  }

  // 初始化玩家状态
  updateReputation();
  updateTP();
  updateEffects();

  addLog('技能测试页面初始化完成');
});
</script>

<style scoped>
.skill-test-container {
  font-family: 'Courier New', monospace;
}
</style>