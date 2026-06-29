/**
 * 角色养成数据结构。
 * S13-C1 瘦身为「等级（固定初始五维 + 每级随机加点）+ 好感（关系仪表/里程碑，不接战力）」两轴。
 * 删除训练/心情/对话/礼物/属性(charm/int/str)/levelBonusAttributes/battleEnhancements/intimacy/preferences/trainingCooldowns。
 */

/** 五战斗维加点（升级时 roll 固定点数随机分配，累加至此；纯加法注入战力）。 */
export interface StatPoints {
  hp: number;
  atk: number;
  def: number;
  sp: number;
  spd: number;
}

export interface CharacterNurtureData {
  affection: number; // 好感度 (0+，无上限；关系仪表/里程碑，不接战力)
  lastInteraction: string; // 最后互动时间 (ISO)
  // 角色等级系统
  level: number; // 角色等级 (1-100)
  experience: number; // 当前等级内经验值
  totalExperience: number; // 总经验值 (用于计算等级)
  /** 升级随机加点累加（每级 roll POINTS_PER_LEVEL 点分配到 5 战斗维）。 */
  statPoints: StatPoints;
  /** 已领取的好感里程碑 id（config/nurture.ts BOND_MILESTONES）。一次性领取，持久化。 */
  claimedBondMilestones: string[];
}
