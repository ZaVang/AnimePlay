<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { RouterLink } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { 
  generateBattleStats, 
  simulateBattle, 
  calculateBattlePower,
  type BattleStats 
} from '@/utils/battleCalculator';
import { generateMatchedAISquad, generateTowerFloorEnemies } from '@/utils/aiSquadGenerator';
import CharacterSelectModal from '@/components/battle/CharacterSelectModal.vue';
import type { CharacterCard } from '@/types/card';

const userStore = useUserStore();
const gameDataStore = useGameDataStore();

// 战斗状态 - 直接使用爬塔模式
type BattlePhase = 'towerMode' | 'battle' | 'result';
const currentPhase = ref<BattlePhase>('towerMode');

// 战斗模式 - 固定为爬塔模式
const currentBattleMode = ref<'tower'>('tower');

// 小队数据
interface SquadMember {
  character: CharacterCard;
  battleStats: BattleStats;
  currentHP: number;
  maxHP: number;
  isDefeated: boolean;
  position: number; // 0-3 (左到右)
}

const playerSquad = ref<SquadMember[]>([]);
const enemySquad = ref<SquadMember[]>([]);

// 角色选择弹窗状态
const showCharacterSelectModal = ref(false);
const selectedPosition = ref(0);
const editingSquadId = ref<number | null>(null);

// 战斗进行状态  
const currentTurn = ref(0);
const battleLog = ref<string[]>([]);
const isPlayerTurn = ref(true);
const battleResult = ref<'victory' | 'defeat' | null>(null);

// 选中用于战斗的小队ID
const selectedSquadForBattle = ref<number | null>(null);

// 爬塔模式相关状态
const currentTowerFloor = ref<number>(1);
const towerEnemyData = ref<any>(null);

// 页面状态持久化键
const BATTLE_STATE_KEY = 'squadBattleState';

// 保存状态到sessionStorage
function saveState() {
  const state = {
    currentPhase: currentPhase.value,
    currentTowerFloor: currentTowerFloor.value,
    towerEnemyData: towerEnemyData.value
  };
  try {
    sessionStorage.setItem(BATTLE_STATE_KEY, JSON.stringify(state));
    console.log('[DEBUG] State saved:', state);
  } catch (error) {
    console.warn('[DEBUG] Failed to save state:', error);
  }
}

// 从sessionStorage恢复状态
function loadState() {
  try {
    const savedState = sessionStorage.getItem(BATTLE_STATE_KEY);
    if (savedState) {
      const state = JSON.parse(savedState);
      // 只恢复塔模式状态
      if (state.currentPhase === 'towerMode') {
        currentPhase.value = state.currentPhase;
        currentTowerFloor.value = state.currentTowerFloor || 1;
        towerEnemyData.value = state.towerEnemyData;
        console.log('[DEBUG] State loaded:', state);
      } else {
        console.log('[DEBUG] Reset to tower mode');
        currentPhase.value = 'towerMode';
      }
    }
  } catch (error) {
    console.warn('[DEBUG] Failed to load state:', error);
    currentPhase.value = 'towerMode';
  }
}

// 清除状态
function clearState() {
  try {
    sessionStorage.removeItem(BATTLE_STATE_KEY);
    console.log('[DEBUG] State cleared');
  } catch (error) {
    console.warn('[DEBUG] Failed to clear state:', error);
  }
}

// 获取小队的完整角色信息
function getSquadCharacters(squadId: number): (CharacterCard | null)[] {
  const members = userStore.getSquadMembers(squadId);
  return members.map((id: number | null) => {
    if (id === null) return null;
    const character = gameDataStore.getCharacterCardById(id);
    return character || null;
  });
}

// 计算小队战力
function getSquadPower(squadId: number): number {
  const characters = getSquadCharacters(squadId).filter(Boolean) as CharacterCard[];
  return characters.reduce((total, character) => {
    const nurtureData = userStore.getNurtureData(character.id);
    const battleStats = generateBattleStats(
      character.battle_stats || { hp: 100, atk: 50, def: 30, sp: 40, spd: 60 },
      nurtureData.attributes,
      nurtureData.battleEnhancements || { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 }
    );
    return total + calculateBattlePower(battleStats);
  }, 0);
}

// 获取小队成员数量
function getSquadMemberCount(squadId: number): number {
  const members = userStore.getSquadMembers(squadId);
  return members.filter((id: number | null) => id !== null).length;
}

// 获取小队中已使用的角色ID（排除当前位置）
function getUsedCharacterIds(squadId: number, excludePosition: number): number[] {
  const members = userStore.getSquadMembers(squadId);
  return members
    .map((id: number | null, index: number) => index !== excludePosition ? id : null)
    .filter((id: number | null): id is number => id !== null);
}

// 打开角色选择弹窗
function openCharacterSelect(squadId: number, position: number) {
  editingSquadId.value = squadId;
  selectedPosition.value = position;
  showCharacterSelectModal.value = true;
}

// 处理角色选择
function handleCharacterSelect(characterId: number, position: number) {
  if (editingSquadId.value !== null) {
    userStore.updateSquadMember(editingSquadId.value, position, characterId);
  }
}

// 处理角色移除
function handleCharacterRemove(position: number) {
  if (editingSquadId.value !== null) {
    userStore.updateSquadMember(editingSquadId.value, position, null);
  }
}

// 更新小队名称
function updateSquadName(squadId: number, newName: string) {
  userStore.updateSquadName(squadId, newName);
}

// 创建小队成员
function createSquadMember(character: CharacterCard, position: number): SquadMember {
  const nurtureData = userStore.getNurtureData(character.id);
  const battleStats = generateBattleStats(
    character.battle_stats || { hp: 100, atk: 50, def: 30, sp: 40, spd: 60 },
    nurtureData.attributes,
    nurtureData.battleEnhancements || { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 }
  );
  
  return {
    character,
    battleStats,
    currentHP: battleStats.hp,
    maxHP: battleStats.hp,
    isDefeated: false,
    position
  };
}

// 已移除模式选择功能，直接使用爬塔模式

// 开始爬塔战斗
function startTowerBattle(squadId: number) {
  if (!userStore.isLoggedIn) {
    userStore.addLog('请先登录！', 'warning');
    return;
  }
  
  // 移除每日挑战次数限制

  const members = userStore.getSquadMembers(squadId);
  const characters = members.map((id: number | null) => id ? gameDataStore.getCharacterCardById(id) : null);
  const validCharacters = characters.filter(Boolean) as CharacterCard[];
  
  if (validCharacters.length === 0) {
    userStore.addLog('请至少选择一个角色组成小队！', 'warning');
    return;
  }

  // 检查是否需要4人满编
  if (validCharacters.length < 4) {
    userStore.addLog('爬塔挑战需要4人满编小队！', 'warning');
    return;
  }
  
  // 移除挑战次数记录
  
  // 创建玩家小队
  playerSquad.value = validCharacters.map((character, index) => 
    createSquadMember(character, index)
  );
  
  // 生成当前层的敌人
  if (!towerEnemyData.value) {
    towerEnemyData.value = generateTowerFloorEnemies(currentTowerFloor.value);
  }
  
  // 开始战斗流程
  startBattleCommon(squadId, towerEnemyData.value.members, towerEnemyData.value.name);
}

// 开始预设小队战斗
function startBattle(squadId: number) {
  if (!userStore.isLoggedIn) {
    userStore.addLog('请先登录！', 'warning');
    return;
  }

  const members = userStore.getSquadMembers(squadId);
  const characters = members.map((id: number | null) => id ? gameDataStore.getCharacterCardById(id) : null);
  const validCharacters = characters.filter(Boolean) as CharacterCard[];
  
  if (validCharacters.length === 0) {
    userStore.addLog('请至少选择一个角色组成小队！', 'warning');
    return;
  }

  // 检查是否满足4人要求
  if (validCharacters.length < 4) {
    userStore.addLog('需要4人满编小队才能开始战斗！', 'warning');
    return;
  }
  
  // 创建玩家小队（4人满编）
  playerSquad.value = validCharacters.map((character, index) => 
    createSquadMember(character, index)
  );
  
  // 生成AI小队
  const playerPower = playerSquad.value.reduce((sum, member) => sum + calculateBattlePower(member.battleStats), 0);
  const aiSquadData = generateMatchedAISquad(playerPower);
  
  startBattleCommon(squadId, aiSquadData.members, aiSquadData.name);
}

// 通用战斗开始逻辑
function startBattleCommon(squadId: number, enemyMembers: CharacterCard[], enemyName: string) {
  enemySquad.value = enemyMembers.map((character, index) => 
    createSquadMember(character, index)
  );
  
  selectedSquadForBattle.value = squadId;
  currentPhase.value = 'battle';
  battleLog.value = [`⚔️ 战斗开始！你的小队 vs ${enemyName}`];
  currentTurn.value = 0;
  isPlayerTurn.value = true;
}

// 获取当前前排角色（最前面还活着的）
function getFrontMember(squad: SquadMember[]): SquadMember | null {
  return squad.find(member => !member.isDefeated) || null;
}

// 执行一回合攻击
function executeRound() {
  if (currentPhase.value !== 'battle') return;
  
  const playerFront = getFrontMember(playerSquad.value);
  const enemyFront = getFrontMember(enemySquad.value);
  
  if (!playerFront || !enemyFront) {
    endBattle();
    return;
  }
  
  if (isPlayerTurn.value) {
    // 玩家回合：玩家前排攻击敌人前排
    const damage = calculateRoundDamage(playerFront.battleStats, enemyFront.battleStats);
    enemyFront.currentHP = Math.max(0, enemyFront.currentHP - damage.damage);
    
    battleLog.value.push(
      `🗡️ ${playerFront.character.name} 对 ${enemyFront.character.name} 造成 ${damage.damage} 伤害${damage.isCriticalHit ? ' (连击!)' : ''}`
    );
    
    if (enemyFront.currentHP <= 0) {
      enemyFront.isDefeated = true;
      battleLog.value.push(`💥 ${enemyFront.character.name} 被击败！`);
    }
  } else {
    // AI回合：敌人前排攻击玩家前排
    const damage = calculateRoundDamage(enemyFront.battleStats, playerFront.battleStats);
    playerFront.currentHP = Math.max(0, playerFront.currentHP - damage.damage);
    
    battleLog.value.push(
      `⚔️ ${enemyFront.character.name} 对 ${playerFront.character.name} 造成 ${damage.damage} 伤害${damage.isCriticalHit ? ' (连击!)' : ''}`
    );
    
    if (playerFront.currentHP <= 0) {
      playerFront.isDefeated = true;
      battleLog.value.push(`💔 ${playerFront.character.name} 被击败！`);
    }
  }
  
  isPlayerTurn.value = !isPlayerTurn.value;
  currentTurn.value++;
  
  // 检查战斗结束
  setTimeout(() => {
    checkBattleEnd();
  }, 1500);
}

// 计算回合伤害（使用新的战斗系统）
function calculateRoundDamage(attacker: BattleStats, defender: BattleStats) {
  const baseAttack = attacker.atk;
  const damageBonus = attacker.sp / (1000 + attacker.sp);
  const damageReduction = defender.def / (1000 + defender.def);
  const isCriticalHit = Math.random() < Math.min(attacker.spd / 10, 50) / 100;
  
  let damage = baseAttack * (1 + damageBonus) * (1 - damageReduction);
  
  if (isCriticalHit) {
    damage *= 1.3;
  }
  
  return {
    damage: Math.max(1, Math.floor(damage)),
    isCriticalHit
  };
}

// 检查战斗结束
function checkBattleEnd() {
  const playerAlive = playerSquad.value.some(member => !member.isDefeated);
  const enemyAlive = enemySquad.value.some(member => !member.isDefeated);
  
  if (!playerAlive || !enemyAlive) {
    endBattle();
  }
}

// 结束战斗
function endBattle() {
  currentPhase.value = 'result';
  
  const playerAlive = playerSquad.value.some(member => !member.isDefeated);
  const enemyAlive = enemySquad.value.some(member => !member.isDefeated);
  
  if (playerAlive && !enemyAlive) {
    battleResult.value = 'victory';
    battleLog.value.push('🎉 胜利！');
    
    // 胜利奖励
    let baseReward = 50;
    let knowledgeReward = 25;
    
    // 爬塔模式特殊奖励
    if (currentBattleMode.value === 'tower') {
      baseReward += currentTowerFloor.value * 10; // 层数奖励
      knowledgeReward += currentTowerFloor.value * 5;
      
      // 通过当前层并进入下一层
      userStore.completeFloor(currentTowerFloor.value);
      battleLog.value.push(`🏆 通过第${currentTowerFloor.value}层！`);
      
      // 自动进入下一层
      currentTowerFloor.value = currentTowerFloor.value + 1;
      towerEnemyData.value = null; // 清除当前层敌人数据，需要重新生成
      battleLog.value.push(`⬆️ 自动进入第${currentTowerFloor.value}层！`);
      
      // 保存新状态
      saveState();
    }
    
    const survivalBonus = playerSquad.value.filter(m => !m.isDefeated).length * 10;
    const totalExp = baseReward + survivalBonus;
    
    userStore.addExp(totalExp);
    userStore.playerState.knowledgePoints += knowledgeReward;
    userStore.addLog(`战斗胜利！获得 ${totalExp} 经验和 ${knowledgeReward} 知识点！`, 'success');
    
  } else if (!playerAlive && enemyAlive) {
    battleResult.value = 'defeat';
    battleLog.value.push('💔 败北...');
    
    // 失败仍有少量奖励
    let consolationExp = 15;
    if (currentBattleMode.value === 'tower') {
      consolationExp += Math.floor(currentTowerFloor.value * 2); // 层数安慰奖励
    }
    
    userStore.addExp(consolationExp);
    userStore.addLog(`虽然失败了，但从战斗中学到了经验。获得 ${consolationExp} 经验！`, 'info');
    
  } else {
    battleResult.value = 'victory'; // 平局算胜利
    battleLog.value.push('⚖️ 平局！');
  }
}

// 重新开始
function restart() {
  console.log('[DEBUG] restart called');
  currentPhase.value = 'towerMode';
  playerSquad.value = [];
  enemySquad.value = [];
  battleLog.value = [];
  currentTurn.value = 0;
  isPlayerTurn.value = true;
  battleResult.value = null;
  selectedSquadForBattle.value = null;
  // 保持敌人数据
  console.log('[DEBUG] Restarted, phase:', currentPhase.value);
}

// 返回爬塔模式
function returnToTowerMode() {
  console.log('[DEBUG] returnToTowerMode called');
  currentPhase.value = 'towerMode';
  // 不要调用restart()，避免清除towerEnemyData
  playerSquad.value = [];
  enemySquad.value = [];
  battleLog.value = [];
  currentTurn.value = 0;
  isPlayerTurn.value = true;
  battleResult.value = null;
  selectedSquadForBattle.value = null;
  // 保持towerEnemyData和currentTowerFloor，避免状态丢失
  saveState(); // 保存状态
  console.log('[DEBUG] Returned to tower mode, phase:', currentPhase.value);
}

// 获取生命值百分比
function getHPPercentage(member: SquadMember): number {
  return (member.currentHP / member.maxHP) * 100;
}

// 一键结算战斗
function autoFinishBattle() {
  if (currentPhase.value !== 'battle') return;
  
  console.log('[DEBUG] Auto finish battle started');
  
  // 最大回合数限制，避免无限循环
  const maxRounds = 100;
  let roundCount = 0;
  
  const autoRound = () => {
    if (currentPhase.value !== 'battle' || roundCount >= maxRounds) {
      if (roundCount >= maxRounds) {
        battleLog.value.push('⚠️ 战斗超过最大回合数，强制结束！');
        endBattle();
      }
      return;
    }
    
    const playerFront = getFrontMember(playerSquad.value);
    const enemyFront = getFrontMember(enemySquad.value);
    
    if (!playerFront || !enemyFront) {
      endBattle();
      return;
    }
    
    // 执行一回合攻击
    if (isPlayerTurn.value) {
      // 玩家回合
      const damage = calculateRoundDamage(playerFront.battleStats, enemyFront.battleStats);
      enemyFront.currentHP = Math.max(0, enemyFront.currentHP - damage.damage);
      
      battleLog.value.push(
        `🗡️ ${playerFront.character.name} 对 ${enemyFront.character.name} 造成 ${damage.damage} 伤害${damage.isCriticalHit ? ' (连击!)' : ''}`
      );
      
      if (enemyFront.currentHP <= 0) {
        enemyFront.isDefeated = true;
        battleLog.value.push(`💥 ${enemyFront.character.name} 被击败！`);
      }
    } else {
      // AI回合
      const damage = calculateRoundDamage(enemyFront.battleStats, playerFront.battleStats);
      playerFront.currentHP = Math.max(0, playerFront.currentHP - damage.damage);
      
      battleLog.value.push(
        `⚔️ ${enemyFront.character.name} 对 ${playerFront.character.name} 造成 ${damage.damage} 伤害${damage.isCriticalHit ? ' (连击!)' : ''}`
      );
      
      if (playerFront.currentHP <= 0) {
        playerFront.isDefeated = true;
        battleLog.value.push(`💔 ${playerFront.character.name} 被击败！`);
      }
    }
    
    isPlayerTurn.value = !isPlayerTurn.value;
    currentTurn.value++;
    roundCount++;
    
    // 检查战斗是否结束
    const playerAlive = playerSquad.value.some(member => !member.isDefeated);
    const enemyAlive = enemySquad.value.some(member => !member.isDefeated);
    
    if (!playerAlive || !enemyAlive) {
      endBattle();
      return;
    }
    
    // 继续下一回合（使用很短的延时保持视觉效果）
    setTimeout(autoRound, 50);
  };
  
  // 开始自动战斗
  battleLog.value.push('⚡ 开始自动结算...');
  autoRound();
}

// 刷新爬塔敌人
function refreshTowerEnemies() {
  console.log('[DEBUG] refreshTowerEnemies called');
  towerEnemyData.value = generateTowerFloorEnemies(currentTowerFloor.value);
  saveState(); // 保存新的敌人数据
  console.log('[DEBUG] Tower enemies refreshed:', towerEnemyData.value);
}

// 组件挂载时恢复状态
onMounted(() => {
  console.log('[DEBUG] Component mounted, loading state...');
  loadState();
});

// 组件卸载前保存状态
onBeforeUnmount(() => {
  console.log('[DEBUG] Component unmounting, saving state...');
  saveState();
});
</script>

<template>
  <div class="min-h-screen bg-gray-900 py-8">
    <div class="container mx-auto px-4">
      
      <!-- 页面标题 -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-white mb-2">挑战塔</h1>
        <p class="text-gray-400">逐层挑战，难度递增，证明你的实力！</p>
      </div>
      
      <!-- 未登录状态 -->
      <div v-if="!userStore.isLoggedIn" class="text-center py-20">
        <h2 class="text-2xl font-bold text-gray-300 mb-4">请先登录</h2>
        <p class="text-gray-500">登录后即可参与爬塔挑战</p>
      </div>

      <!-- 爬塔模式界面 -->
      <div v-else-if="currentPhase === 'towerMode'" class="space-y-6">

        <!-- 爬塔信息面板 -->
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div class="grid md:grid-cols-3 gap-6">
            <!-- 当前进度 -->
            <div class="text-center">
              <h3 class="text-lg font-bold text-white mb-2">当前进度</h3>
              <div class="text-3xl font-bold text-green-400 mb-2">第 {{ currentTowerFloor }} 层</div>
              <div class="text-sm text-gray-400">历史最高：{{ userStore.towerProgress.maxFloor }} 层</div>
            </div>
            
            <!-- 层数状态 -->
            <div class="text-center">
              <h3 class="text-lg font-bold text-white mb-2">层数状态</h3>
              <div class="text-2xl font-bold text-blue-400 mb-2">
                {{ userStore.hasCompletedFloor(currentTowerFloor) ? '已通过' : '未挑战' }}
              </div>
              <div class="text-sm text-gray-400">每层只能挑战一次，无次数限制</div>
            </div>
            
            <!-- 当前敌人信息 -->
            <div class="text-center">
              <h3 class="text-lg font-bold text-white mb-2">当前层敌人</h3>
              <div v-if="!towerEnemyData" class="space-y-2">
                <button 
                  @click="refreshTowerEnemies"
                  class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                >
                  刷新敌人
                </button>
              </div>
              <div v-else class="space-y-2">
                <div class="font-bold text-red-400">{{ towerEnemyData.name }}</div>
                <div class="text-sm text-gray-400">{{ towerEnemyData.description }}</div>
                <div class="text-lg font-bold text-yellow-400">
                  战力: {{ towerEnemyData.floorPower }}
                </div>
                <div class="text-sm mb-2">
                  <span class="px-2 py-1 rounded text-xs font-bold"
                        :class="{
                          'bg-green-500 text-white': towerEnemyData.difficulty === '简单',
                          'bg-yellow-500 text-black': towerEnemyData.difficulty === '中等',
                          'bg-red-500 text-white': towerEnemyData.difficulty === '困难',
                          'bg-purple-500 text-white': towerEnemyData.difficulty === '极难'
                        }">
                    {{ towerEnemyData.difficulty }}
                  </span>
                </div>
                <button 
                  @click="refreshTowerEnemies"
                  class="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded transition-colors"
                >
                  重新刷新
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 选择挑战小队 -->
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 class="text-xl font-bold text-white mb-4">选择挑战小队</h3>
          
          <div class="grid md:grid-cols-3 gap-6">
            <div 
              v-for="squad in userStore.presetSquads" 
              :key="squad.id"
              class="bg-gray-700 rounded-lg p-4 border border-gray-600"
            >
              <!-- 小队名称和成员数 -->
              <div class="flex items-center justify-between mb-3">
                <input 
                  :value="squad.name"
                  @change="updateSquadName(squad.id, ($event.target as HTMLInputElement).value)"
                  class="font-bold text-white bg-transparent border border-transparent hover:border-gray-500 rounded px-2 py-1 transition-colors"
                  maxlength="20"
                >
                <div class="text-sm text-gray-400">{{ getSquadMemberCount(squad.id) }}/4</div>
              </div>
              
              <!-- 小队成员预览 -->
              <div class="grid grid-cols-4 gap-2 mb-3">
                <div 
                  v-for="position in 4" 
                  :key="position"
                  @click="openCharacterSelect(squad.id, position - 1)"
                  class="relative bg-gray-600 rounded border-2 cursor-pointer hover:border-blue-500 transition-colors overflow-hidden"
                  :class="squad.members[position - 1] ? 'border-green-500' : 'border-gray-600 border-dashed'"
                  style="aspect-ratio: 2/3; width: 50px; height: 75px;"
                >
                  <div v-if="squad.members[position - 1]" class="absolute inset-0">
                    <img 
                      :src="gameDataStore.getCharacterCardById(squad.members[position - 1]!)?.image_path"
                      :alt="gameDataStore.getCharacterCardById(squad.members[position - 1]!)?.name"
                      class="w-full h-full object-cover object-top"
                      @error="($event.target as HTMLImageElement).src = '/data/images/character/77.jpg'"
                    >
                    <!-- 位置编号 -->
                    <div class="absolute top-0 left-0 w-4 h-4 bg-black/70 rounded-br text-white text-xs flex items-center justify-center">
                      {{ position }}
                    </div>
                  </div>
                  <div v-else class="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                    <div class="text-lg mb-1">+</div>
                    <div class="text-xs">{{ position }}</div>
                  </div>
                </div>
              </div>
              
              <!-- 小队战力 -->
              <div class="mb-3 text-sm">
                <span class="text-gray-400">战力:</span>
                <span class="text-yellow-400 font-bold ml-1">{{ getSquadPower(squad.id) }}</span>
              </div>
              
              <!-- 挑战按钮 -->
              <button 
                @click="startTowerBattle(squad.id)"
                :disabled="getSquadMemberCount(squad.id) < 4 || userStore.hasCompletedFloor(currentTowerFloor) || !towerEnemyData"
                class="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
              >
                <span v-if="getSquadMemberCount(squad.id) === 0">需要角色</span>
                <span v-else-if="getSquadMemberCount(squad.id) < 4">需要4人满编 ({{ getSquadMemberCount(squad.id) }}/4)</span>
                <span v-else-if="userStore.hasCompletedFloor(currentTowerFloor)">本层已通过</span>
                <span v-else-if="!towerEnemyData">刷新敌人信息</span>
                <span v-else>开始挑战</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 爬塔说明 -->
        <div class="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
          <div class="flex items-start space-x-3">
            <div class="text-blue-400 text-xl">🏗️</div>
            <div>
              <h3 class="text-blue-400 font-bold mb-2">爬塔规则</h3>
              <ul class="text-sm text-gray-300 space-y-1">
                <li>• 每层敌人战力和稀有度都会递增</li>
                <li>• 胜利可获得大量经验和知识点奖励</li>
                <li>• 每日最多挑战10次</li>
                <li>• 通过当前层后解锁下一层</li>
                <li>• 每5层难度显著提升</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 战斗阶段 -->
      <div v-else-if="currentPhase === 'battle'" class="space-y-6">
        
        <!-- 战斗场地 -->
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold text-white">第 {{ currentTurn + 1 }} 回合</h2>
            <div class="text-lg font-bold" :class="isPlayerTurn ? 'text-blue-400' : 'text-red-400'">
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
                    <div class="w-16 h-16 rounded-full overflow-hidden border-2"
                         :class="member.isDefeated ? 'border-gray-500' : 'border-blue-400'">
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
                    <div class="w-16 h-16 rounded-full overflow-hidden border-2"
                         :class="member.isDefeated ? 'border-gray-500' : 'border-red-400'">
                      <!-- 显示真实角色头像 -->
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
              @click="executeRound"
              class="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-colors"
            >
              执行回合
            </button>
            <button 
              @click="autoFinishBattle"
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
              v-for="(log, index) in battleLog.slice().reverse()"
              :key="index"
              class="text-sm text-gray-300 p-2 bg-gray-700/30 rounded"
            >
              {{ log }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- 结果阶段 -->
      <div v-else-if="currentPhase === 'result'" class="text-center space-y-6">
        <div class="bg-gray-800 rounded-lg p-8 border border-gray-700">
          <div class="text-6xl mb-4">
            {{ battleResult === 'victory' ? '🎉' : '💔' }}
          </div>
          
          <h2 class="text-3xl font-bold mb-4" :class="battleResult === 'victory' ? 'text-green-400' : 'text-red-400'">
            {{ battleResult === 'victory' ? '胜利！' : '失败...' }}
          </h2>
          
          <div class="space-y-2 mb-6">
            <div 
              v-for="(log, index) in battleLog.slice(-5)"
              :key="index"
              class="text-gray-300"
            >
              {{ log }}
            </div>
          </div>
          
          <div class="flex gap-4 justify-center">
            <button 
              @click="restart"
              class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
            >
              {{ battleResult === 'victory' ? '继续挑战' : '返回爬塔' }}
            </button>
            
            <button 
              v-if="selectedSquadForBattle && battleResult === 'defeat'"
              @click="startTowerBattle(selectedSquadForBattle)"
              class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
            >
              再次挑战
            </button>
          </div>
        </div>
      </div>
      
    </div>
    
    <!-- 角色选择弹窗 -->
    <CharacterSelectModal
      :is-open="showCharacterSelectModal"
      :position="selectedPosition"
      :current-character-id="editingSquadId ? (userStore.getSquadMembers(editingSquadId)[selectedPosition] || undefined) : undefined"
      :used-character-ids="editingSquadId ? getUsedCharacterIds(editingSquadId, selectedPosition) : []"
      @close="showCharacterSelectModal = false"
      @select="handleCharacterSelect"
      @remove="handleCharacterRemove"
    />
  </div>
</template>

<style scoped>
/* 小队选择卡片动画 */
.bg-gray-800:hover {
  transform: translateY(-2px);
  transition: transform 0.2s ease;
}

/* 角色位置方格悬停效果 */
.cursor-pointer:hover {
  transform: scale(1.02);
}
</style>