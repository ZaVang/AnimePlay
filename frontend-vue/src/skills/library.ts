import type { Skill } from '@/types/skill';
import { urCharacterSkills } from '@/data/urCharacterSkills';

export const skillLibrary: Skill[] = [
  // --- Template Active Skills ---
  {
    id: 'TPL_DRAW_1',
    name: '灵感迸发',
    type: '主动技能',
    description: '从牌库中抽取1张卡。',
    cost: 2,
    cooldown: 1,
    initialCooldown: 0,
    effectId: 'DRAW_1',
  },
  {
    id: 'TPL_GAIN_TP_2',
    name: '稍作喘息',
    type: '主动技能',
    description: '恢复2点TP。',
    cost: 0,
    cooldown: 3,
    initialCooldown: 1,
    effectId: 'GAIN_TP_2',
  },

  // --- Character-Specific Active Skills ---
  {
    id: 'KYON_TSUKKOMI',
    name: '没完没了的吐槽',
    type: '主动技能',
    description: '削减对方一半的议题优势（向下取整）。',
    cost: 3,
    cooldown: 2,
    initialCooldown: 1,
    effectId: 'BIAS_HALVE_OPP',
  },

  // --- Template Passive Auras ---
  {
    id: 'AURA_GENRE_EXPERT',
    name: '类型专家',
    type: '被动光环',
    description: '己方打出同类型动画卡时，额外获得1点强度。',
    effectId: 'AURA_GENRE_EXPERT',
  },

  // --- Character-Specific Passive Auras ---
  {
    id: 'HARUHI_AURA',
    name: '团长命令',
    type: '被动光环',
    description: '己方回合开始时，若己方议题优势小于等于0，则有50%几率获得1点TP。',
  },
  {
    id: 'PASSIVE_PLACEHOLDER',
    name: '待定光环',
    type: '被动光环',
    description: '此技能尚未实现。',
  },
  {
    id: 'ACTIVE_PLACEHOLDER',
    name: '待定技能',
    type: '主动技能',
    description: '此技能尚未实现。',
    cost: 1,
    cooldown: 1,
  },
  
  // --- UR Character Skills ---
  ...urCharacterSkills,
];
