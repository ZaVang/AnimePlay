// 角色技能映射：将角色ID与其主动/被动技能ID绑定。
// 可覆盖后端原始数据中的 activeSkillId/passiveSkillId，或作为补充。

import { urCharacterSkillMap } from './urCharacterSkills';

export interface CharacterSkillBinding {
  activeSkillId?: string;
  passiveSkillId?: string;
}

// 将UR角色技能映射转换为CharacterSkillBinding格式
const urCharacterSkillBindings: Record<number, CharacterSkillBinding> = {};
Object.entries(urCharacterSkillMap).forEach(([characterId, skillIds]) => {
  const id = parseInt(characterId);
  if (skillIds.length >= 2) {
    urCharacterSkillBindings[id] = {
      activeSkillId: skillIds[0], // 第一个技能作为主动技能
      passiveSkillId: skillIds[1], // 第二个技能作为被动技能
    };
  }
});

export const characterSkillsMap: Record<number, CharacterSkillBinding> = {
  // UR角色技能绑定（优先级最高）
  ...urCharacterSkillBindings,
  
  // 非UR角色技能绑定
  14823: { passiveSkillId: 'AURA_GENRE_EXPERT', activeSkillId: 'TPL_DRAW_1' },
  49: { passiveSkillId: 'AURA_GENRE_EXPERT', activeSkillId: 'TPL_DRAW_1' },
};


