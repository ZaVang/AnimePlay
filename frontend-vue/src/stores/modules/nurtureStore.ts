/**
 * Character Nurturing & Squad Store
 * Handles character development, squad management, and tower progress
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from './authStore';
import { useGameDataStore } from '../gameDataStore';

export interface CharacterNurtureData {
  affection: number;
  intimacy: number;
  lastInteraction: string;
  totalInteractions: number;
  dialogueHistory: string[];
  gifts: string[];
  specialEvents: string[];
  level: number;
  experience: number;
  totalExperience: number;
  attributes: {
    charm: number;
    intelligence: number;
    strength: number;
    mood: number;
  };
  levelBonusAttributes: {
    charm: number;
    intelligence: number;
    strength: number;
  };
  battleEnhancements: {
    hp: number;
    atk: number;
    def: number;
    sp: number;
    spd: number;
  };
  preferences: {
    favoriteTopics: string[];
    dislikedTopics: string[];
    favoriteGifts: string[];
  };
}

interface PresetSquad {
  id: number;
  name: string;
  members: (number | null)[];
  lastUsed?: string;
}

interface TowerProgress {
  currentFloor: number;
  maxFloor: number;
  floorRewards: { [floor: number]: boolean };
  todayAttempts: number;
  lastAttemptDate: string;
}

export const useNurtureStore = defineStore('nurture', () => {
  // --- STATE ---
  const characterNurtureData = ref<Map<number, CharacterNurtureData>>(new Map());
  const presetSquads = ref<PresetSquad[]>([
    { id: 1, name: '小队 A', members: [null, null, null, null] },
    { id: 2, name: '小队 B', members: [null, null, null, null] },
    { id: 3, name: '小队 C', members: [null, null, null, null] }
  ]);
  const towerProgress = ref<TowerProgress>({
    currentFloor: 1,
    maxFloor: 1,
    floorRewards: {},
    todayAttempts: 0,
    lastAttemptDate: ''
  });

  // --- HELPER FUNCTIONS ---
  function distributeRandomAttributes(totalPoints: number): { charm: number; intelligence: number; strength: number } {
    const attributes = ['charm', 'intelligence', 'strength'] as const;
    const distribution = { charm: 0, intelligence: 0, strength: 0 };
    let remainingPoints = totalPoints;

    for (const attr of attributes) {
      const minPoints = Math.floor(totalPoints * 0.1);
      const maxPoints = Math.floor(totalPoints * 0.6);
      const points = Math.min(
        Math.max(minPoints, Math.floor(Math.random() * (maxPoints - minPoints + 1)) + minPoints),
        remainingPoints - (attributes.length - attributes.indexOf(attr) - 1)
      );
      distribution[attr] = points;
      remainingPoints -= points;
    }

    while (remainingPoints > 0) {
      const randomAttr = attributes[Math.floor(Math.random() * attributes.length)];
      distribution[randomAttr]++;
      remainingPoints--;
    }

    return distribution;
  }

  function getRequiredExpForLevel(level: number): number {
    if (level <= 1) return 0;
    return (level - 1) * (level - 1) * 1000;
  }

  function getLevelFromExp(totalExp: number): number {
    let level = 1;
    while (getRequiredExpForLevel(level + 1) <= totalExp) {
      level++;
    }
    return level;
  }

  function getLevelProgress(nurtureData: CharacterNurtureData): { current: number; required: number; percentage: number } {
    const currentLevel = nurtureData.level || 1;
    const totalExp = nurtureData.totalExperience || 0;

    const currentLevelExpStart = getRequiredExpForLevel(currentLevel);
    const nextLevelExpStart = getRequiredExpForLevel(currentLevel + 1);

    const currentLevelExp = Math.max(0, totalExp - currentLevelExpStart);
    const requiredForNext = nextLevelExpStart - currentLevelExpStart;

    const percentage = requiredForNext > 0 ? (currentLevelExp / requiredForNext) * 100 : 0;

    return {
      current: currentLevelExp,
      required: requiredForNext,
      percentage: Math.min(100, Math.max(0, percentage))
    };
  }

  // --- ACTIONS ---
  function resetState() {
    characterNurtureData.value.clear();
    presetSquads.value = [
      { id: 1, name: '小队 A', members: [null, null, null, null] },
      { id: 2, name: '小队 B', members: [null, null, null, null] },
      { id: 3, name: '小队 C', members: [null, null, null, null] }
    ];
    towerProgress.value = {
      currentFloor: 1,
      maxFloor: 1,
      floorRewards: {},
      todayAttempts: 0,
      lastAttemptDate: ''
    };
  }

  function getNurtureData(characterId: number): CharacterNurtureData {
    const authStore = useAuthStore();

    if (!characterNurtureData.value.has(characterId)) {
      const defaultData: CharacterNurtureData = {
        affection: 0,
        intimacy: 0,
        lastInteraction: '',
        totalInteractions: 0,
        dialogueHistory: [],
        gifts: [],
        specialEvents: [],
        level: 1,
        experience: 0,
        totalExperience: 0,
        attributes: {
          charm: 50,
          intelligence: 50,
          strength: 50,
          mood: 80
        },
        levelBonusAttributes: {
          charm: 0,
          intelligence: 0,
          strength: 0
        },
        battleEnhancements: {
          hp: 0,
          atk: 0,
          def: 0,
          sp: 0,
          spd: 0
        },
        preferences: {
          favoriteTopics: [],
          dislikedTopics: [],
          favoriteGifts: []
        }
      };
      characterNurtureData.value.set(characterId, defaultData);
    }

    const data = characterNurtureData.value.get(characterId)!;

    if (!data.levelBonusAttributes) {
      data.levelBonusAttributes = { charm: 0, intelligence: 0, strength: 0 };
    }

    if (data.totalExperience !== undefined) {
      const maxLevel = 100;
      const correctLevel = Math.min(getLevelFromExp(data.totalExperience), maxLevel);
      if ((data.level || 1) !== correctLevel) {
        const oldLevel = data.level || 1;
        data.level = correctLevel;

        if (correctLevel > oldLevel && correctLevel <= maxLevel) {
          for (let level = oldLevel + 1; level <= correctLevel; level++) {
            const totalPoints = level * 10;
            const randomBonus = distributeRandomAttributes(totalPoints);
            data.levelBonusAttributes.charm += randomBonus.charm;
            data.levelBonusAttributes.intelligence += randomBonus.intelligence;
            data.levelBonusAttributes.strength += randomBonus.strength;
          }

          if (correctLevel > oldLevel + 1) {
            authStore.addLog(`角色等级自动同步：Lv.${oldLevel} → Lv.${correctLevel}，获得随机属性加成！`, 'success');
          }
        }
      }
    }

    return data;
  }

  function increaseAffection(characterId: number, amount: number) {
    const authStore = useAuthStore();
    if (!authStore.isLoggedIn) return;

    const nurtureData = getNurtureData(characterId);
    nurtureData.affection = nurtureData.affection + amount;
    nurtureData.lastInteraction = new Date().toISOString();
    nurtureData.totalInteractions++;

    const expReward = amount * 5;
    addCharacterExp(characterId, expReward);

    const gameDataStore = useGameDataStore();
    const character = gameDataStore.getCharacterCardById(characterId);

    if (character) {
      authStore.addLog(`与 ${character.name} 的好感度增加了 ${amount} 点！`, 'success');
    }
  }

  function interactWithCharacter(characterId: number, dialogueId: string) {
    const authStore = useAuthStore();
    if (!authStore.isLoggedIn) return;

    const nurtureData = getNurtureData(characterId);
    nurtureData.dialogueHistory.push(dialogueId);
    nurtureData.lastInteraction = new Date().toISOString();
    nurtureData.totalInteractions++;
  }

  function giveGift(characterId: number, giftId: string) {
    const authStore = useAuthStore();
    if (!authStore.isLoggedIn) return;

    const nurtureData = getNurtureData(characterId);
    nurtureData.gifts.push(giftId);

    const gameDataStore = useGameDataStore();
    const character = gameDataStore.getCharacterCardById(characterId);

    if (character) {
      authStore.addLog(`向 ${character.name} 送出了礼物！`, 'success');
    }
  }

  function enhanceAttribute(characterId: number, attribute: keyof CharacterNurtureData['attributes'], amount: number) {
    const authStore = useAuthStore();
    if (!authStore.isLoggedIn) return;

    const nurtureData = getNurtureData(characterId);
    const oldValue = nurtureData.attributes[attribute];
    nurtureData.attributes[attribute] = Math.min(100, oldValue + amount);

    const expReward = amount * 15;
    addCharacterExp(characterId, expReward);

    const gameDataStore = useGameDataStore();
    const character = gameDataStore.getCharacterCardById(characterId);

    if (character) {
      const attrName = {
        charm: '魅力',
        intelligence: '智力',
        strength: '体力',
        mood: '心情'
      }[attribute] || attribute;
      authStore.addLog(`${character.name} 的${attrName}提升了 ${amount} 点！`, 'success');
    }
  }

  function enhanceBattleStat(characterId: number, stat: keyof CharacterNurtureData['battleEnhancements'], amount: number) {
    const authStore = useAuthStore();
    if (!authStore.isLoggedIn) return;

    try {
      const nurtureData = getNurtureData(characterId);

      if (!nurtureData.battleEnhancements) {
        nurtureData.battleEnhancements = { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 };
      }

      const validStats = ['hp', 'atk', 'def', 'sp', 'spd'] as const;
      for (const validStat of validStats) {
        if (nurtureData.battleEnhancements[validStat] === undefined) {
          nurtureData.battleEnhancements[validStat] = 0;
        }
      }

      const oldValue = nurtureData.battleEnhancements[stat] || 0;
      nurtureData.battleEnhancements[stat] = Math.min(100, oldValue + amount);
    } catch (error) {
      console.error('Error in enhanceBattleStat:', error, { characterId, stat, amount });
      const errorMessage = error instanceof Error ? error.message : String(error);
      authStore.addLog(`战斗属性提升失败：${errorMessage}`, 'warning');
      return;
    }

    const expReward = amount * 25;
    addCharacterExp(characterId, expReward);

    const gameDataStore = useGameDataStore();
    const character = gameDataStore.getCharacterCardById(characterId);

    if (character) {
      const statName = {
        hp: '生命值',
        atk: '攻击力',
        def: '防御力',
        sp: 'SP值',
        spd: '速度'
      }[stat] || stat;
      authStore.addLog(`${character.name} 的${statName}加成提升了 ${amount}%！`, 'success');
    }
  }

  function getEnhancedBattleStats(characterId: number) {
    const gameDataStore = useGameDataStore();
    const character = gameDataStore.getCharacterCardById(characterId);
    if (!character?.battle_stats) return null;

    const nurtureData = getNurtureData(characterId);
    const baseStats = character.battle_stats;
    const enhancements = nurtureData.battleEnhancements;

    return {
      hp: Math.floor(baseStats.hp * (1 + enhancements.hp / 100)),
      atk: Math.floor(baseStats.atk * (1 + enhancements.atk / 100)),
      def: Math.floor(baseStats.def * (1 + enhancements.def / 100)),
      sp: Math.floor(baseStats.sp * (1 + enhancements.sp / 100)),
      spd: Math.floor(baseStats.spd * (1 + enhancements.spd / 100))
    };
  }

  function addCharacterExp(characterId: number, expAmount: number) {
    const authStore = useAuthStore();
    if (!authStore.isLoggedIn || expAmount <= 0) return;

    const nurtureData = getNurtureData(characterId);
    const oldLevel = nurtureData.level;

    nurtureData.experience += expAmount;
    nurtureData.totalExperience += expAmount;

    const maxLevel = 100;
    const newLevel = Math.min(getLevelFromExp(nurtureData.totalExperience), maxLevel);

    if (newLevel > oldLevel && newLevel <= maxLevel) {
      nurtureData.level = newLevel;

      const gameDataStore = useGameDataStore();
      const character = gameDataStore.getCharacterCardById(characterId);

      if (character) {
        let totalCharmGain = 0;
        let totalIntGain = 0;
        let totalStrGain = 0;

        for (let level = oldLevel + 1; level <= newLevel; level++) {
          const totalPoints = level * 10;
          const randomBonus = distributeRandomAttributes(totalPoints);

          nurtureData.levelBonusAttributes.charm += randomBonus.charm;
          nurtureData.levelBonusAttributes.intelligence += randomBonus.intelligence;
          nurtureData.levelBonusAttributes.strength += randomBonus.strength;

          totalCharmGain += randomBonus.charm;
          totalIntGain += randomBonus.intelligence;
          totalStrGain += randomBonus.strength;
        }

        const totalGainMsg = `魅力+${totalCharmGain}, 智力+${totalIntGain}, 体力+${totalStrGain}`;

        authStore.addLog(`🎉 ${character.name} 等级提升！Lv.${oldLevel} → Lv.${newLevel}`, 'success');
        authStore.addLog(`随机属性分配：${totalGainMsg}`, 'info');

        if (newLevel >= maxLevel) {
          authStore.addLog(`🏆 ${character.name} 已达到满级！(Lv.${maxLevel})`, 'success');
        }
      }
    }

    const levelProgress = getLevelProgress(nurtureData);
    nurtureData.experience = levelProgress.current;
  }

  // Squad management
  function updateSquadMember(squadId: number, position: number, characterId: number | null) {
    const squad = presetSquads.value.find((s: PresetSquad) => s.id === squadId);
    if (squad && position >= 0 && position < 4) {
      squad.members[position] = characterId;
      squad.lastUsed = new Date().toISOString();
    }
  }

  function updateSquadName(squadId: number, newName: string) {
    const squad = presetSquads.value.find((s: PresetSquad) => s.id === squadId);
    if (squad) {
      squad.name = newName;
    }
  }

  function getSquadMembers(squadId: number): (number | null)[] {
    const squad = presetSquads.value.find((s: PresetSquad) => s.id === squadId);
    return squad ? [...squad.members] : [null, null, null, null];
  }

  // Tower management
  function getCurrentChallengeFloor(): number {
    return towerProgress.value.currentFloor;
  }

  function completeFloor(floor: number) {
    const authStore = useAuthStore();
    if (floor === towerProgress.value.currentFloor) {
      towerProgress.value.currentFloor = Math.min(floor + 1, 999);
      towerProgress.value.maxFloor = Math.max(towerProgress.value.maxFloor, floor);
      authStore.addLog(`成功通过第${floor}层！`, 'success');
    }
  }

  function hasCompletedFloor(floor: number): boolean {
    return floor < towerProgress.value.currentFloor;
  }

  function canAttemptToday(): boolean {
    return true;
  }

  function recordTowerAttempt() {
    return;
  }

  function loadFromPayload(payload: any) {
    const savedNurtureData = payload.characterNurtureData || [];
    characterNurtureData.value = new Map(savedNurtureData);

    if (payload.towerProgress) {
      towerProgress.value = payload.towerProgress;
    }

    if (payload.presetSquads) {
      presetSquads.value = payload.presetSquads;
    }
  }

  function serializeForSave() {
    return {
      characterNurtureData: Array.from(characterNurtureData.value.entries()),
      towerProgress: towerProgress.value,
      presetSquads: presetSquads.value,
    };
  }

  return {
    characterNurtureData,
    presetSquads,
    towerProgress,
    resetState,
    getNurtureData,
    increaseAffection,
    interactWithCharacter,
    giveGift,
    enhanceAttribute,
    enhanceBattleStat,
    getEnhancedBattleStats,
    getRequiredExpForLevel,
    getLevelFromExp,
    getLevelProgress,
    addCharacterExp,
    updateSquadMember,
    updateSquadName,
    getSquadMembers,
    getCurrentChallengeFloor,
    completeFloor,
    hasCompletedFloor,
    canAttemptToday,
    recordTowerAttempt,
    loadFromPayload,
    serializeForSave,
  };
});
