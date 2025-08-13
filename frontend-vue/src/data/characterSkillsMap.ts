// 角色技能映射：将角色ID与其主动/被动技能ID绑定。
// 可覆盖后端原始数据中的 activeSkillId/passiveSkillId，或作为补充。

export interface CharacterSkillBinding {
  activeSkillId?: string;
  passiveSkillId?: string;
}

export const characterSkillsMap: Record<number, CharacterSkillBinding> = {
  // 你要求绑定的角色：
  14823: { passiveSkillId: 'AURA_GENRE_EXPERT', activeSkillId: 'TPL_DRAW_1' },
  49: { passiveSkillId: 'AURA_GENRE_EXPERT', activeSkillId: 'TPL_DRAW_1' },
};


