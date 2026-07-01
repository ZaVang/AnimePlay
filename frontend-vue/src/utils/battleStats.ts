/**
 * 玩家角色战力属性的**单一收口 helper**（S14-C SC-T3/SC-T4）。
 *
 * 背景：战斗属性组装（generateBattleStats）此前散落 4+ 处消费端（HomesteadHubView selectedFinalStats/memberPower、
 * SquadBattleView buildCharacterStats、NurtureView finalStats、EquipPickerModal 预览）。养成加成（升级加点 + 突破 +
 * 好感永久）必须在**所有**消费端一致注入，否则详情/explore/实战三屏战力打架（SA-T6 半做重演）。
 *
 * 收口方式：把 statPoints + 突破加成 + 好感永久加成折成**一个** StatPoints（engine resolveNurturedStatPoints，
 * 单一战力口径，不新增 generateBattleStats 第 4 参），再走既有纯加法 generateBattleStats(base, folded, equipBonus)。
 * bondBonusPct 从 config BOND_MILESTONES 派生（engine 不 import config）。
 */
import type { CharacterNurtureData } from '@/types/nurture';
import {
  generateBattleStats,
  resolveNurturedStatPoints,
  type BattleStats,
  type StatBonus,
} from '@/engine';
import { bondPermanentBonusPct } from '@/config/nurture';

/** 养成后的合成加点（等级加点 + 突破 + 好感永久）。展示「加点」段与战力口径一致时用。 */
export function resolveNurturedStatPointsFor(
  nurtureData: Pick<CharacterNurtureData, 'statPoints' | 'breakthrough' | 'claimedBondMilestones'>,
  baseStats: BattleStats,
): BattleStats {
  return resolveNurturedStatPoints(
    nurtureData,
    baseStats,
    bondPermanentBonusPct(nurtureData.claimedBondMilestones),
  );
}

/**
 * 玩家角色最终战斗五维 = base + (等级加点 + 突破 + 好感永久) + equipBonus。
 * 全站所有玩家侧 generateBattleStats 消费点应改调此函数（敌方侧不走养成，仍直接 generateBattleStats）。
 */
export function resolveMemberBattleStats(
  baseStats: BattleStats,
  nurtureData: Pick<CharacterNurtureData, 'statPoints' | 'breakthrough' | 'claimedBondMilestones'>,
  equipBonus: StatBonus,
): BattleStats {
  return generateBattleStats(baseStats, resolveNurturedStatPointsFor(nurtureData, baseStats), equipBonus);
}
