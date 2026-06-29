/**
 * nurture 领域 store（S5 自 userStore 拆出）：
 * 角色养成数据（好感/互动/属性/角色等级）。数值规则全在 engine/nurture。
 * 不触发存档（由门面统一控制）。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { CharacterNurtureData } from '@/types/nurture';
import { useGameDataStore } from './gameDataStore';
import { useProfileStore } from './profile';
import {
  defaultRng,
  getRequiredExpForLevel,
  getLevelFromExp,
  getLevelProgress as engineGetLevelProgress,
  levelUpAttributePoints,
  distributeRandomAttributes,
  createDefaultNurtureData,
  applyBattleEnhancements,
  MAX_CHARACTER_LEVEL,
  ATTRIBUTE_CAP,
  ENHANCEMENT_CAP,
  EXP_PER_AFFECTION,
  EXP_PER_ATTRIBUTE,
  EXP_PER_BATTLE_STAT,
} from '@/engine';

export const useNurtureStore = defineStore('nurture', () => {
  const characterNurtureData = ref<Map<number, CharacterNurtureData>>(new Map());

  // 获取角色养成数据，如果不存在则创建默认数据（兼容旧数据的补丁逻辑保留）
  function getNurtureData(characterId: number): CharacterNurtureData {
    const profile = useProfileStore();
    if (!characterNurtureData.value.has(characterId)) {
      characterNurtureData.value.set(characterId, createDefaultNurtureData());
    }

    const data = characterNurtureData.value.get(characterId)!;

    if (!data.levelBonusAttributes) {
      data.levelBonusAttributes = { charm: 0, intelligence: 0, strength: 0 };
    }

    // 确保等级与总经验值同步（修复旧数据）
    if (data.totalExperience !== undefined) {
      const correctLevel = Math.min(getLevelFromExp(data.totalExperience), MAX_CHARACTER_LEVEL);
      if ((data.level || 1) !== correctLevel) {
        const oldLevel = data.level || 1;
        data.level = correctLevel;

        if (correctLevel > oldLevel && correctLevel <= MAX_CHARACTER_LEVEL) {
          for (let level = oldLevel + 1; level <= correctLevel; level++) {
            const randomBonus = distributeRandomAttributes(levelUpAttributePoints(level), defaultRng);
            data.levelBonusAttributes.charm += randomBonus.charm;
            data.levelBonusAttributes.intelligence += randomBonus.intelligence;
            data.levelBonusAttributes.strength += randomBonus.strength;
          }
          if (correctLevel > oldLevel + 1) {
            profile.addLog(`角色等级自动同步：Lv.${oldLevel} → Lv.${correctLevel}，获得随机属性加成！`, 'success');
          }
        }
      }
    }

    return data;
  }

  function increaseAffection(characterId: number, amount: number) {
    const profile = useProfileStore();
    if (!profile.isLoggedIn) return;

    const nurtureData = getNurtureData(characterId);
    nurtureData.affection = nurtureData.affection + amount; // 无上限
    nurtureData.lastInteraction = new Date().toISOString();
    nurtureData.totalInteractions++;

    addCharacterExp(characterId, amount * EXP_PER_AFFECTION);

    const character = useGameDataStore().getCharacterCardById(characterId);
    if (character) {
      profile.addLog(`与 ${character.name} 的好感度增加了 ${amount} 点！`, 'success');
    }
  }

  /**
   * 家园挂机离线结算专用：静默加好感。
   * 不走 increaseAffection 的「经验耦合(amount×5) + 每次 addLog」——挂机经验由结算方按速率另算、
   * 一次性汇总播报，避免逐角色刷屏与经验重复计入。
   */
  function addIdleAffection(characterId: number, amount: number) {
    if (amount <= 0) return;
    const nurtureData = getNurtureData(characterId);
    nurtureData.affection += amount; // 无上限，同 increaseAffection
    nurtureData.lastInteraction = new Date().toISOString();
  }

  function interactWithCharacter(characterId: number, dialogueId: string) {
    const profile = useProfileStore();
    if (!profile.isLoggedIn) return;

    const nurtureData = getNurtureData(characterId);
    nurtureData.dialogueHistory.push(dialogueId);
    nurtureData.lastInteraction = new Date().toISOString();
    nurtureData.totalInteractions++;
  }

  function giveGift(characterId: number, giftId: string) {
    const profile = useProfileStore();
    if (!profile.isLoggedIn) return;

    getNurtureData(characterId).gifts.push(giftId);

    const character = useGameDataStore().getCharacterCardById(characterId);
    if (character) {
      profile.addLog(`向 ${character.name} 送出了礼物！`, 'success');
    }
  }

  function enhanceAttribute(
    characterId: number,
    attribute: keyof CharacterNurtureData['attributes'],
    amount: number,
  ) {
    const profile = useProfileStore();
    if (!profile.isLoggedIn) return;

    const nurtureData = getNurtureData(characterId);
    const oldValue = nurtureData.attributes[attribute];
    nurtureData.attributes[attribute] = Math.min(ATTRIBUTE_CAP, oldValue + amount);

    addCharacterExp(characterId, amount * EXP_PER_ATTRIBUTE);

    const character = useGameDataStore().getCharacterCardById(characterId);
    if (character) {
      const attrName =
        { charm: '魅力', intelligence: '智力', strength: '体力', mood: '心情' }[attribute] || attribute;
      profile.addLog(`${character.name} 的${attrName}提升了 ${amount} 点！`, 'success');
    }
  }

  function enhanceBattleStat(
    characterId: number,
    stat: keyof CharacterNurtureData['battleEnhancements'],
    amount: number,
  ) {
    const profile = useProfileStore();
    if (!profile.isLoggedIn) return;

    const nurtureData = getNurtureData(characterId);
    if (!nurtureData.battleEnhancements) {
      nurtureData.battleEnhancements = { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 };
    }
    const oldValue = nurtureData.battleEnhancements[stat] || 0;
    nurtureData.battleEnhancements[stat] = Math.min(ENHANCEMENT_CAP, oldValue + amount);

    addCharacterExp(characterId, amount * EXP_PER_BATTLE_STAT);

    const character = useGameDataStore().getCharacterCardById(characterId);
    if (character) {
      const statName = { hp: '生命值', atk: '攻击力', def: '防御力', sp: 'SP值', spd: '速度' }[stat] || stat;
      profile.addLog(`${character.name} 的${statName}加成提升了 ${amount}%！`, 'success');
    }
  }

  // --- 训练冷却（S6 起持久化在 CharacterNurtureData.trainingCooldowns） ---

  /** 设置训练冷却（分钟）。 */
  function setTrainingCooldown(characterId: number, programId: string, durationMinutes: number) {
    const data = getNurtureData(characterId);
    if (!data.trainingCooldowns) data.trainingCooldowns = {};
    data.trainingCooldowns[programId] = Date.now() + durationMinutes * 60 * 1000;
  }

  /** 剩余冷却秒数（无冷却/已过期为 0；过期项顺手清掉）。 */
  function getTrainingCooldownRemaining(characterId: number, programId: string): number {
    const data = getNurtureData(characterId);
    const endTs = data.trainingCooldowns?.[programId];
    if (!endTs) return 0;
    const remaining = Math.ceil((endTs - Date.now()) / 1000);
    if (remaining <= 0) {
      delete data.trainingCooldowns![programId];
      return 0;
    }
    return remaining;
  }

  function isTrainingOnCooldown(characterId: number, programId: string): boolean {
    return getTrainingCooldownRemaining(characterId, programId) > 0;
  }

  /** 最终战斗属性 = 原始属性 × (1 + 强化%)。 */
  function getEnhancedBattleStats(characterId: number) {
    const character = useGameDataStore().getCharacterCardById(characterId);
    if (!character?.battle_stats) return null;
    return applyBattleEnhancements(character.battle_stats, getNurtureData(characterId).battleEnhancements);
  }

  function getLevelProgress(nurtureData: CharacterNurtureData) {
    return engineGetLevelProgress(nurtureData.level || 1, nurtureData.totalExperience || 0);
  }

  /** 角色经验与升级（升级随机属性经 engine 分配）。 */
  function addCharacterExp(characterId: number, expAmount: number) {
    const profile = useProfileStore();
    if (!profile.isLoggedIn || expAmount <= 0) return;

    const nurtureData = getNurtureData(characterId);
    const oldLevel = nurtureData.level;

    nurtureData.experience += expAmount;
    nurtureData.totalExperience += expAmount;

    const newLevel = Math.min(getLevelFromExp(nurtureData.totalExperience), MAX_CHARACTER_LEVEL);

    if (newLevel > oldLevel && newLevel <= MAX_CHARACTER_LEVEL) {
      nurtureData.level = newLevel;

      const character = useGameDataStore().getCharacterCardById(characterId);
      if (character) {
        let totalCharmGain = 0;
        let totalIntGain = 0;
        let totalStrGain = 0;

        for (let level = oldLevel + 1; level <= newLevel; level++) {
          const randomBonus = distributeRandomAttributes(levelUpAttributePoints(level), defaultRng);
          nurtureData.levelBonusAttributes.charm += randomBonus.charm;
          nurtureData.levelBonusAttributes.intelligence += randomBonus.intelligence;
          nurtureData.levelBonusAttributes.strength += randomBonus.strength;
          totalCharmGain += randomBonus.charm;
          totalIntGain += randomBonus.intelligence;
          totalStrGain += randomBonus.strength;
        }

        profile.addLog(`🎉 ${character.name} 等级提升！Lv.${oldLevel} → Lv.${newLevel}`, 'success');
        profile.addLog(`随机属性分配：魅力+${totalCharmGain}, 智力+${totalIntGain}, 体力+${totalStrGain}`, 'info');
        if (newLevel >= MAX_CHARACTER_LEVEL) {
          profile.addLog(`🏆 ${character.name} 已达到满级！(Lv.${MAX_CHARACTER_LEVEL})`, 'success');
        }
      }
    }

    // 重置当前等级的经验值显示
    nurtureData.experience = getLevelProgress(nurtureData).current;
  }

  // --- 持久化装配 ---

  function serialize(): [number, CharacterNurtureData][] {
    return Array.from(characterNurtureData.value.entries());
  }

  function deserialize(entries: [number, CharacterNurtureData][]) {
    characterNurtureData.value = new Map(entries);
  }

  function reset() {
    characterNurtureData.value.clear();
  }

  return {
    characterNurtureData,
    getNurtureData,
    increaseAffection,
    addIdleAffection,
    interactWithCharacter,
    giveGift,
    enhanceAttribute,
    enhanceBattleStat,
    setTrainingCooldown,
    getTrainingCooldownRemaining,
    isTrainingOnCooldown,
    getEnhancedBattleStats,
    getRequiredExpForLevel,
    getLevelFromExp,
    getLevelProgress,
    addCharacterExp,
    serialize,
    deserialize,
    reset,
  };
});
