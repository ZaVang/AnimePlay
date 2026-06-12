/**
 * 角色养成数据结构（S4 自 stores/userStore 上移到类型层；userStore 转发导出以兼容旧路径）。
 */
export interface CharacterNurtureData {
  affection: number; // 好感度 (0-1000+, 可以超过1000)
  intimacy: number; // 亲密度 (0-100)
  lastInteraction: string; // 最后互动时间
  totalInteractions: number; // 总互动次数
  dialogueHistory: string[]; // 对话历史ID
  gifts: string[]; // 收到的礼物ID列表 (简化数据结构)
  specialEvents: string[]; // 已解锁的特殊事件
  // 角色等级系统
  level: number; // 角色等级 (1-100)
  experience: number; // 当前等级内经验值
  totalExperience: number; // 总经验值 (用于计算等级)
  attributes: {
    charm: number; // 魅力值
    intelligence: number; // 智力值
    strength: number; // 体力值
    mood: number; // 心情值 (0-100)
  };
  // 升级获得的随机属性加成
  levelBonusAttributes: {
    charm: number;
    intelligence: number;
    strength: number;
  };
  // 战斗属性增强 (基于原始 battle_stats 的百分比加成, 0-100%)
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
