/**
 * 角色养成数据结构。
 * S14-C 起三轴：等级（固定初始五维 + 每级确定加点）+ 好感（里程碑领取给永久小加成 + 每日互动 + 溢出转 KP）
 *  + 星级/突破（消化重复角色卡换永久小加成）。
 * S13-C1 瘦身删除训练/心情/对话/礼物/属性(charm/int/str)/levelBonusAttributes/battleEnhancements/intimacy/preferences/trainingCooldowns。
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
  /** 已领取的好感里程碑 id（config/nurture.ts BOND_MILESTONES）。一次性领取，持久化。永久加成从此集纯派生。 */
  claimedBondMilestones: string[];
  /**
   * ★ S14-C SC-T3：星级/突破次数（0..MAX_BREAKTHROUGH）。消化重复角色卡换永久小加成（不提等级上限）。
   * 缺省 0；加成由 engine breakthroughStatBonus(breakthrough, base) 现算（存计数不存派生）。
   */
  breakthrough: number;
  /**
   * ★ S14-C SC-T4：最近一次每日好感互动的日期键（todayKey：YYYY-M-D）。
   * == 今日则今日已互动；跨天读时视为可再互动（复用 daily 跨天判定范式，扁平字段）。缺省 ''。
   */
  lastBondInteractionDate: string;
}
