/**
 * nurture 领域 store（S5 自 userStore 拆出；S13-C1 瘦身为加点制两轴）。
 * 角色养成数据（好感 + 等级/加点）。数值规则全在 engine/nurture。
 * 不触发存档（由门面统一控制）。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { CharacterNurtureData, StatPoints } from '@/types/nurture';
import type { CharacterCard } from '@/types/card';
import { useGameDataStore } from './gameDataStore';
import { useProfileStore } from './profile';
import {
  getRequiredExpForLevel,
  getLevelFromExp,
  getLevelProgress as engineGetLevelProgress,
  rollLevelUpStatPoints,
  createDefaultNurtureData,
  createEmptyStatPoints,
  MAX_CHARACTER_LEVEL,
  MAX_BREAKTHROUGH,
  breakthroughCost,
  canBreakthrough,
} from '@/engine';
import { useCollectionStore } from './collection';
import {
  TUTORING_KP_COST,
  TUTORING_EXP_GAIN,
  BATTLE_AFFECTION_GAIN,
  BOND_MILESTONES,
  isMilestoneClaimable,
  DAILY_BOND_INTERACTION_AFFECTION,
  DAILY_BOND_INTERACTION_EXP,
  bondOverflowExchange,
} from '@/config/nurture';

/** 与 daily/shop 同款本地日期键（YYYY-M-D）。跨天判定用（每日互动跨天重置）。 */
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** 互动经验：每点好感度 ×5（好感增加联动经验）。 */
const EXP_PER_AFFECTION = 5;

/** 缺省 base 五维（角色数据缺 battle_stats 或角色未找到时的兜底，与战力计算 fallback 一致）。 */
const DEFAULT_BASE_STATS: StatPoints = { hp: 100, atk: 50, def: 30, sp: 40, spd: 60 };

/** 取角色 base 五维（SA-T3 确定成长的分配权重来源）。缺失时退化为均衡兜底。 */
function baseStatsOf(character: CharacterCard | null | undefined): StatPoints {
  return (character?.battle_stats as StatPoints | undefined) ?? DEFAULT_BASE_STATS;
}

export const useNurtureStore = defineStore('nurture', () => {
  const characterNurtureData = ref<Map<number, CharacterNurtureData>>(new Map());

  // 获取角色养成数据，如果不存在则创建默认数据（兼容旧数据的补丁逻辑保留）
  function getNurtureData(characterId: number): CharacterNurtureData {
    if (!characterNurtureData.value.has(characterId)) {
      characterNurtureData.value.set(characterId, createDefaultNurtureData());
    }

    const data = characterNurtureData.value.get(characterId)!;

    // 防御性补全（迁移已归一，但运行时新建/手改兜底）
    if (!data.statPoints) data.statPoints = createEmptyStatPoints();
    if (!data.claimedBondMilestones) data.claimedBondMilestones = [];
    if (data.breakthrough == null) data.breakthrough = 0;
    if (data.lastBondInteractionDate == null) data.lastBondInteractionDate = '';

    return data;
  }

  function increaseAffection(characterId: number, amount: number) {
    const profile = useProfileStore();
    if (!profile.isLoggedIn) return;

    const nurtureData = getNurtureData(characterId);
    nurtureData.affection = nurtureData.affection + amount; // 无上限
    nurtureData.lastInteraction = new Date().toISOString();

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

  /**
   * 带塔参战涨好感（S13-C1）：塔战斗结算后给参战角色静默涨好感（与挂机好感同字段）。
   * 不联动经验（经验由塔结算另发），不逐角色播报。
   */
  function addBattleAffection(characterId: number, amount = BATTLE_AFFECTION_GAIN) {
    if (amount <= 0) return;
    const nurtureData = getNurtureData(characterId);
    nurtureData.affection += amount;
    nurtureData.lastInteraction = new Date().toISOString();
  }

  function getLevelProgress(nurtureData: CharacterNurtureData) {
    return engineGetLevelProgress(nurtureData.level || 1, nurtureData.totalExperience || 0);
  }

  /** 角色经验与升级（升级随机加点经 engine 分配到 5 战斗维）。 */
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
      // SA-T3：升级加点改确定成长——按角色 base 五维比例分配，去随机。
      // 旧档已 roll 的 statPoints 不动（已知取舍：只影响未来升级，不做一次性重算迁移，不升 schema）。
      const gain = rollLevelUpStatPoints(oldLevel, newLevel, baseStatsOf(character));
      nurtureData.statPoints.hp += gain.hp;
      nurtureData.statPoints.atk += gain.atk;
      nurtureData.statPoints.def += gain.def;
      nurtureData.statPoints.sp += gain.sp;
      nurtureData.statPoints.spd += gain.spd;

      if (character) {
        const total = gain.hp + gain.atk + gain.def + gain.sp + gain.spd;
        profile.addLog(`🎉 ${character.name} 等级提升！Lv.${oldLevel} → Lv.${newLevel}`, 'success');
        profile.addLog(
          `成长加点 +${total}：HP+${gain.hp} ATK+${gain.atk} DEF+${gain.def} SP+${gain.sp} SPD+${gain.spd}`,
          'info',
        );
        if (newLevel >= MAX_CHARACTER_LEVEL) {
          profile.addLog(`🏆 ${character.name} 已达到满级！(Lv.${MAX_CHARACTER_LEVEL})`, 'success');
        }
      }
    }

    // 重置当前等级的经验值显示
    nurtureData.experience = getLevelProgress(nurtureData).current;
  }

  /**
   * 补习（S13-C1）：花知识点换角色经验（新 KP sink，走唯一货币出口 profile.spend）。
   * 余额不足 / 未登录 / 已满级返回 false 不变更。
   */
  function tutorCharacter(characterId: number): boolean {
    const profile = useProfileStore();
    if (!profile.isLoggedIn) return false;

    const nurtureData = getNurtureData(characterId);
    if (nurtureData.level >= MAX_CHARACTER_LEVEL) {
      profile.addLog('该角色已满级，无需补习。', 'warning');
      return false;
    }
    if (!profile.spend('knowledgePoints', TUTORING_KP_COST)) {
      profile.addLog(`补习需要 ${TUTORING_KP_COST} 知识点，余额不足。`, 'warning');
      return false;
    }

    addCharacterExp(characterId, TUTORING_EXP_GAIN);
    const character = useGameDataStore().getCharacterCardById(characterId);
    if (character) {
      profile.addLog(`为 ${character.name} 补习，消耗 ${TUTORING_KP_COST} 知识点 → +${TUTORING_EXP_GAIN} 经验。`, 'success');
    }
    return true;
  }

  /**
   * 领取好感里程碑奖励（S13-C1）：达阈值且未领过 → 一次性 KP 经 profile.earn 发放，记录已领。
   * 返回是否成功（未登录 / 未达阈值 / 已领 / 未知 id = false）。
   */
  function claimBondMilestone(characterId: number, milestoneId: string): boolean {
    const profile = useProfileStore();
    if (!profile.isLoggedIn) return false;

    const milestone = BOND_MILESTONES.find(m => m.id === milestoneId);
    if (!milestone) return false;

    const nurtureData = getNurtureData(characterId);
    if (!isMilestoneClaimable(nurtureData.affection, nurtureData.claimedBondMilestones, milestone)) {
      return false;
    }

    nurtureData.claimedBondMilestones.push(milestone.id);
    profile.earn('knowledgePoints', milestone.reward);

    const character = useGameDataStore().getCharacterCardById(characterId);
    if (character) {
      profile.addLog(`「${milestone.title}」里程碑达成（${character.name}）：+${milestone.reward} 知识点！`, 'success');
    }
    return true;
  }

  /**
   * ★ SC-T3 突破：读重复卡数、判上限/卡量、扣卡（经 collection.consumeCharacterCards 保留本体）、breakthrough++。
   * 返回是否成功（未登录 / 已满星 / 重复卡不足 = false 不变更）。副作用（扣卡）收口 collection，engine 只出判定。
   */
  function breakthroughCharacter(characterId: number): boolean {
    const profile = useProfileStore();
    if (!profile.isLoggedIn) return false;

    const nurtureData = getNurtureData(characterId);
    if (nurtureData.breakthrough >= MAX_BREAKTHROUGH) {
      profile.addLog('该角色已达最高突破星级。', 'warning');
      return false;
    }

    const collection = useCollectionStore();
    const spare = collection.getCharacterCardCount(characterId) - 1; // 保留本体 1 张
    if (!canBreakthrough(nurtureData.breakthrough, spare)) {
      const cost = breakthroughCost(nurtureData.breakthrough);
      profile.addLog(`突破需要 ${cost} 张重复角色卡（当前可用 ${Math.max(0, spare)} 张）。`, 'warning');
      return false;
    }

    const cost = breakthroughCost(nurtureData.breakthrough);
    if (!collection.consumeCharacterCards(characterId, cost)) return false; // 扣卡收口（防呆双保险）

    nurtureData.breakthrough += 1;
    const character = useGameDataStore().getCharacterCardById(characterId);
    if (character) {
      profile.addLog(
        `✨ ${character.name} 突破至 ${nurtureData.breakthrough} 星！消耗 ${cost} 张重复卡，五维永久提升。`,
        'success',
      );
    }
    return true;
  }

  /**
   * ★ SC-T4 每日好感互动（送礼/对话）：每日一次跨天重置，给固定好感 + 少量经验。
   * 跨天判定读 lastBondInteractionDate（扁平字段，复用 daily todayKey 范式，无定时器）。
   * 返回是否成功（未登录 / 今日已互动 = false）。
   */
  function dailyBondInteraction(characterId: number): boolean {
    const profile = useProfileStore();
    if (!profile.isLoggedIn) return false;

    const nurtureData = getNurtureData(characterId);
    const today = todayKey();
    if (nurtureData.lastBondInteractionDate === today) {
      profile.addLog('今日已与该角色互动过，明日再来吧。', 'info');
      return false;
    }

    nurtureData.lastBondInteractionDate = today;
    nurtureData.affection += DAILY_BOND_INTERACTION_AFFECTION;
    nurtureData.lastInteraction = new Date().toISOString();
    addCharacterExp(characterId, DAILY_BOND_INTERACTION_EXP);

    const character = useGameDataStore().getCharacterCardById(characterId);
    if (character) {
      profile.addLog(
        `与 ${character.name} 互动：好感 +${DAILY_BOND_INTERACTION_AFFECTION}，经验 +${DAILY_BOND_INTERACTION_EXP}。`,
        'success',
      );
    }
    return true;
  }

  /** 今日是否可与该角色互动（UI 门控用）。 */
  function canDailyBondInteract(characterId: number): boolean {
    const nurtureData = getNurtureData(characterId);
    return nurtureData.lastBondInteractionDate !== todayKey();
  }

  /**
   * ★ SC-T4 好感溢出转 KP：领完最高档后超出部分整份兑 KP（经 profile.earn），扣对应好感。
   * 返回兑得 KP（0 = 未过最高档 / 溢出不足一份，不变更）。
   */
  function claimBondOverflow(characterId: number): number {
    const profile = useProfileStore();
    if (!profile.isLoggedIn) return 0;

    const nurtureData = getNurtureData(characterId);
    const { kp, spendAffection } = bondOverflowExchange(nurtureData.affection);
    if (kp <= 0) return 0;

    nurtureData.affection -= spendAffection;
    profile.earn('knowledgePoints', kp);
    const character = useGameDataStore().getCharacterCardById(characterId);
    if (character) {
      profile.addLog(`${character.name} 好感溢出兑换：-${spendAffection} 好感 → +${kp} 知识点。`, 'success');
    }
    return kp;
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
    addBattleAffection,
    getRequiredExpForLevel,
    getLevelFromExp,
    getLevelProgress,
    addCharacterExp,
    tutorCharacter,
    claimBondMilestone,
    breakthroughCharacter,
    dailyBondInteraction,
    canDailyBondInteract,
    claimBondOverflow,
    serialize,
    deserialize,
    reset,
  };
});
