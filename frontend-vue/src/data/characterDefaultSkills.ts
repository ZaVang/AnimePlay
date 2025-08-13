// 角色默认技能模板（按稀有度兜底），仅在该角色未配置任何独有技能时使用
export const characterDefaultSkills: Partial<Record<
  'N' | 'R' | 'SR' | 'SSR' | 'HR' | 'UR',
  { activeSkillId?: string; passiveSkillId?: string }
>> = {
  N: { activeSkillId: 'TPL_DRAW_1', passiveSkillId: 'AURA_GENRE_EXPERT' },
  R: { activeSkillId: 'TPL_GAIN_TP_2', passiveSkillId: 'AURA_GENRE_EXPERT' },
  SR: { activeSkillId: 'TPL_DRAW_1', passiveSkillId: 'AURA_GENRE_EXPERT' },
  SSR: { activeSkillId: 'TPL_GAIN_TP_2', passiveSkillId: 'AURA_GENRE_EXPERT' },
  HR: { activeSkillId: 'TPL_DRAW_1', passiveSkillId: 'AURA_GENRE_EXPERT' },
  UR: { activeSkillId: 'TPL_GAIN_TP_2', passiveSkillId: 'AURA_GENRE_EXPERT' },
};


