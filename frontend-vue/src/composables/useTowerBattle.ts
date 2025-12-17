/**
 * Tower Battle Composable
 * Handles tower battle initiation, combat execution, and rewards
 *
 * MIGRATED: Now uses modular stores (authStore, nurtureStore, economyStore)
 */

import { computed, type Ref } from 'vue';
import { useAuthStore } from '@/stores/modules/authStore';
import { useNurtureStore } from '@/stores/modules/nurtureStore';
import { useEconomyStore } from '@/stores/modules/economyStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { generateTowerFloorEnemies, generateMatchedAISquad } from '@/utils/aiSquadGenerator';
import { simulateBattle, calculateBattlePower } from '@/utils/battleCalculator';
import type { SquadMember, BattlePhase } from './useBattleState';
import type { CharacterCard } from '@/types/card';

export function useTowerBattle(
  playerSquad: Ref<SquadMember[]>,
  enemySquad: Ref<SquadMember[]>,
  currentPhase: Ref<BattlePhase>,
  battleLog: Ref<string[]>,
  currentTurn: Ref<number>,
  isPlayerTurn: Ref<boolean>,
  battleResult: Ref<'victory' | 'defeat' | null>,
  selectedSquadForBattle: Ref<number | null>,
  currentBattleMode: Ref<'tower'>,
  towerEnemyData: Ref<any>,
  createSquadMember: (character: CharacterCard, position: number) => SquadMember
) {
  const authStore = useAuthStore();
  const nurtureStore = useNurtureStore();
  const economyStore = useEconomyStore();
  const gameDataStore = useGameDataStore();

  const currentTowerFloor = computed(() => nurtureStore.getCurrentChallengeFloor());

  function startTowerBattle(squadId: number) {
    if (!authStore.isLoggedIn) {
      authStore.addLog('请先登录！', 'warning');
      return;
    }

    const members = nurtureStore.getSquadMembers(squadId);
    const characters = members.map((id: number | null) => id ? gameDataStore.getCharacterCardById(id) : null);
    const validCharacters = characters.filter(Boolean) as CharacterCard[];

    if (validCharacters.length === 0) {
      authStore.addLog('请至少选择一个角色组成小队！', 'warning');
      return;
    }

    if (validCharacters.length < 4) {
      authStore.addLog('爬塔挑战需要4人满编小队！', 'warning');
      return;
    }

    playerSquad.value = validCharacters.map((character, index) =>
      createSquadMember(character, index)
    );

    if (!towerEnemyData.value) {
      towerEnemyData.value = generateTowerFloorEnemies(currentTowerFloor.value);
    }

    startBattleCommon(squadId, towerEnemyData.value.members, towerEnemyData.value.name);
  }

  function startBattle(squadId: number) {
    if (!authStore.isLoggedIn) {
      authStore.addLog('请先登录！', 'warning');
      return;
    }

    const members = nurtureStore.getSquadMembers(squadId);
    const characters = members.map((id: number | null) => id ? gameDataStore.getCharacterCardById(id) : null);
    const validCharacters = characters.filter(Boolean) as CharacterCard[];

    if (validCharacters.length === 0) {
      authStore.addLog('请至少选择一个角色组成小队！', 'warning');
      return;
    }

    if (validCharacters.length < 4) {
      authStore.addLog('需要4人满编小队才能开始战斗！', 'warning');
      return;
    }

    playerSquad.value = validCharacters.map((character, index) =>
      createSquadMember(character, index)
    );

    const playerPower = playerSquad.value.reduce((sum, member) => sum + calculateBattlePower(member.battleStats), 0);
    const aiSquadData = generateMatchedAISquad(playerPower);

    startBattleCommon(squadId, aiSquadData.members, aiSquadData.name);
  }

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

  function calculateRoundDamage(attacker: any, defender: any): { damage: number; isCriticalHit: boolean } {
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

  function getFrontMember(squad: SquadMember[]): SquadMember | null {
    return squad.find(member => !member.isDefeated) || null;
  }

  function checkBattleEnd() {
    const playerAlive = playerSquad.value.some(member => !member.isDefeated);
    const enemyAlive = enemySquad.value.some(member => !member.isDefeated);

    if (!playerAlive || !enemyAlive) {
      endBattle();
    }
  }

  function endBattle() {
    currentPhase.value = 'result';

    const playerAlive = playerSquad.value.some(member => !member.isDefeated);
    const enemyAlive = enemySquad.value.some(member => !member.isDefeated);

    if (playerAlive && !enemyAlive) {
      battleResult.value = 'victory';
      battleLog.value.push('🎉 胜利！');

      let baseReward = 50;
      let knowledgeReward = 25;

      if (currentBattleMode.value === 'tower') {
        baseReward += currentTowerFloor.value * 10;
        knowledgeReward += currentTowerFloor.value * 5;

        const completedFloor = currentTowerFloor.value;
        nurtureStore.completeFloor(completedFloor);
        battleLog.value.push(`🏆 通过第${completedFloor}层！`);

        towerEnemyData.value = null;
        battleLog.value.push(`⬆️ 自动进入第${currentTowerFloor.value}层！`);
      }

      const survivalBonus = playerSquad.value.filter(m => !m.isDefeated).length * 10;
      const totalExp = baseReward + survivalBonus;

      authStore.addExp(totalExp);
      economyStore.knowledgePoints += knowledgeReward;

      const characterExp = Math.floor(totalExp / 2);
      playerSquad.value.forEach(member => {
        let individualExp = characterExp;

        if (!member.isDefeated) {
          individualExp += 20;
        }

        if (currentBattleMode.value === 'tower') {
          individualExp += currentTowerFloor.value * 5;
        }

        nurtureStore.addCharacterExp(member.character.id, individualExp);
      });

      authStore.addLog(`战斗胜利！获得 ${totalExp} 经验和 ${knowledgeReward} 知识点！`, 'success');
      authStore.addLog(`参战角色获得 ${characterExp}~${characterExp + 20 + (currentBattleMode.value === 'tower' ? currentTowerFloor.value * 5 : 0)} 角色经验！`, 'info');

    } else if (!playerAlive && enemyAlive) {
      battleResult.value = 'defeat';
      battleLog.value.push('💔 败北...');

      let consolationExp = 15;
      if (currentBattleMode.value === 'tower') {
        consolationExp += Math.floor(currentTowerFloor.value * 2);
      }

      authStore.addExp(consolationExp);

      const characterFailExp = Math.floor(consolationExp / 3);
      playerSquad.value.forEach(member => {
        nurtureStore.addCharacterExp(member.character.id, characterFailExp);
      });

      authStore.addLog(`虽然失败了，但从战斗中学到了经验。获得 ${consolationExp} 经验！`, 'info');
      authStore.addLog(`参战角色获得 ${characterFailExp} 角色经验！`, 'info');

    } else {
      battleResult.value = 'victory';
      battleLog.value.push('⚖️ 平局！');
    }
  }

  function executeRound() {
    if (currentPhase.value !== 'battle') return;

    const playerFront = getFrontMember(playerSquad.value);
    const enemyFront = getFrontMember(enemySquad.value);

    if (!playerFront || !enemyFront) {
      endBattle();
      return;
    }

    if (isPlayerTurn.value) {
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

    setTimeout(() => {
      checkBattleEnd();
    }, 1500);
  }

  function autoFinishBattle() {
    if (currentPhase.value !== 'battle') return;

    console.log('[DEBUG] Auto finish battle started');

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

      if (isPlayerTurn.value) {
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

      const playerAlive = playerSquad.value.some(member => !member.isDefeated);
      const enemyAlive = enemySquad.value.some(member => !member.isDefeated);

      if (!playerAlive || !enemyAlive) {
        endBattle();
        return;
      }

      setTimeout(autoRound, 50);
    };

    battleLog.value.push('⚡ 开始自动结算...');
    autoRound();
  }

  function refreshTowerEnemies() {
    console.log('[DEBUG] refreshTowerEnemies called');
    towerEnemyData.value = generateTowerFloorEnemies(currentTowerFloor.value);
    console.log('[DEBUG] Tower enemies refreshed:', towerEnemyData.value);
  }

  return {
    currentTowerFloor,
    startTowerBattle,
    startBattle,
    calculateRoundDamage,
    refreshTowerEnemies,
    executeRound,
    autoFinishBattle,
  };
}
