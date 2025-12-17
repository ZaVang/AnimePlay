<script setup lang="ts">
import { computed } from 'vue';
import type { CharacterCard } from '@/types/card';
import type { BattleStats } from '@/utils/battleCalculator';

interface SquadMember {
  character: CharacterCard;
  battleStats: BattleStats;
  currentHP: number;
  maxHP: number;
  isDefeated: boolean;
  position: number;
}

interface Props {
  playerSquad: SquadMember[];
  enemySquad: SquadMember[];
  battleLog: string[];
  currentTurn: number;
  isPlayerTurn: boolean;
}

interface Emits {
  (e: 'executeRound'): void;
  (e: 'autoFinish'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

function getHPPercentage(member: SquadMember): number {
  return (member.currentHP / member.maxHP) * 100;
}

const reversedBattleLog = computed(() => props.battleLog.slice().reverse());
</script>

<template>
  <div class="space-y-6">
    <!-- 战斗场地 -->
    <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold text-white">第 {{ currentTurn + 1 }} 回合</h2>
        <div
          class="text-lg font-bold"
          :class="isPlayerTurn ? 'text-blue-400' : 'text-red-400'"
        >
          {{ isPlayerTurn ? '你的回合' : '敌方回合' }}
        </div>
      </div>

      <!-- 战斗场地布局 -->
      <div class="grid grid-cols-2 gap-8">
        <!-- 玩家小队 (左侧) -->
        <div>
          <h3 class="text-lg font-bold text-blue-400 mb-4">你的小队</h3>
          <div class="space-y-3">
            <div
              v-for="(member, index) in playerSquad"
              :key="member.character.id"
              class="flex items-center space-x-4 p-3 rounded-lg"
              :class="{
                'bg-blue-900/20 border border-blue-500': index === 0 && !member.isDefeated,
                'bg-gray-700/50': member.isDefeated,
                'bg-gray-800': index > 0 && !member.isDefeated
              }"
            >
              <!-- 角色头像 -->
              <div class="relative">
                <div
                  class="w-16 h-16 rounded-full overflow-hidden border-2"
                  :class="member.isDefeated ? 'border-gray-500' : 'border-blue-400'"
                >
                  <img
                    :src="member.character.image_path"
                    :alt="member.character.name"
                    class="w-full h-full object-cover object-top"
                    :class="member.isDefeated ? 'grayscale' : ''"
                    @error="($event.target as HTMLImageElement).src = '/data/images/character/77.jpg'"
                  >
                </div>
                <!-- 位置编号 -->
                <div class="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                  <span class="text-white font-bold text-xs">{{ index + 1 }}</span>
                </div>
                <!-- 击败标记 -->
                <div v-if="member.isDefeated" class="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                  <span class="text-red-400 text-xl">💀</span>
                </div>
              </div>

              <div class="flex-1">
                <div class="font-medium" :class="member.isDefeated ? 'text-gray-500' : 'text-white'">
                  {{ member.character.name }}
                </div>

                <!-- 血条 -->
                <div class="w-full bg-gray-600 rounded-full h-2 mt-1">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="member.isDefeated ? 'bg-red-600' : 'bg-green-500'"
                    :style="{ width: `${getHPPercentage(member)}%` }"
                  ></div>
                </div>

                <div class="text-xs" :class="member.isDefeated ? 'text-gray-500' : 'text-gray-300'">
                  {{ member.currentHP }}/{{ member.maxHP }} HP
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 敌方小队 (右侧) -->
        <div>
          <h3 class="text-lg font-bold text-red-400 mb-4">敌方小队</h3>
          <div class="space-y-3">
            <div
              v-for="(member, index) in enemySquad"
              :key="member.character.id"
              class="flex items-center space-x-4 p-3 rounded-lg"
              :class="{
                'bg-red-900/20 border border-red-500': index === 0 && !member.isDefeated,
                'bg-gray-700/50': member.isDefeated,
                'bg-gray-800': index > 0 && !member.isDefeated
              }"
            >
              <!-- 敌人角色头像 -->
              <div class="relative">
                <div
                  class="w-16 h-16 rounded-full overflow-hidden border-2"
                  :class="member.isDefeated ? 'border-gray-500' : 'border-red-400'"
                >
                  <img
                    :src="member.character.image_path"
                    :alt="member.character.name"
                    class="w-full h-full object-cover object-top"
                    :class="member.isDefeated ? 'grayscale' : ''"
                    @error="($event.target as HTMLImageElement).src = '/data/images/character/77.jpg'"
                  >
                </div>
                <!-- 位置编号 -->
                <div class="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                  <span class="text-white font-bold text-xs">{{ index + 1 }}</span>
                </div>
                <!-- 击败标记 -->
                <div v-if="member.isDefeated" class="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                  <span class="text-red-400 text-xl">💀</span>
                </div>
              </div>

              <div class="flex-1">
                <div class="font-medium" :class="member.isDefeated ? 'text-gray-500' : 'text-white'">
                  {{ member.character.name }}
                </div>

                <!-- 血条 -->
                <div class="w-full bg-gray-600 rounded-full h-2 mt-1">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="member.isDefeated ? 'bg-red-600' : 'bg-green-500'"
                    :style="{ width: `${getHPPercentage(member)}%` }"
                  ></div>
                </div>

                <div class="text-xs" :class="member.isDefeated ? 'text-gray-500' : 'text-gray-300'">
                  {{ member.currentHP }}/{{ member.maxHP }} HP
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 行动按钮 -->
      <div class="text-center mt-6 space-x-4">
        <button
          @click="emit('executeRound')"
          class="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-colors"
        >
          执行回合
        </button>
        <button
          @click="emit('autoFinish')"
          class="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors"
        >
          一键结算
        </button>
      </div>
    </div>

    <!-- 战斗日志 -->
    <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 class="text-lg font-bold text-white mb-4">战斗日志</h3>
      <div class="max-h-40 overflow-y-auto space-y-1">
        <div
          v-for="(log, index) in reversedBattleLog"
          :key="index"
          class="text-sm text-gray-300 p-2 bg-gray-700/30 rounded"
        >
          {{ log }}
        </div>
      </div>
    </div>
  </div>
</template>
