import type { Skill } from '@/types';

export const SKILL_LIBRARY: Record<string, Omit<Skill, 'id'>> = {
  // --- Generic Template Skills ---
  'TPL_DRAW_1': {
    name: '补充论据',
    type: '主动技能',
    description: '从牌库中抽取1张牌。',
    cost: 2,
    cooldown: 3,
  },
  'TPL_GAIN_TP_2': {
    name: '稍作喘息',
    type: '主动技能',
    description: '恢复2点TP。',
    cost: 0,
    cooldown: 4,
  },

  // --- Unique Character Skills ---
  'HARUHI_SOS': {
    name: '「我对普通的人类没有兴趣！」',
    type: '主动技能',
    description: '将一张随机的「UR」稀有度动画卡加入手牌，该卡TP消耗减少1。',
    cost: 5,
    cooldown: 99, // Use once per game
  },
  'KONATA_LUCKY': {
    name: '「此方是无敌的」',
    type: '被动光环',
    description: '己方打出的「日常」系动画卡最终强度+1。',
  },
  'KYON_TSUKKOMI': {
    name: '「真是够了！」',
    type: '主动技能',
    description: '使对方当前议题偏向值减半（向下取整）。',
    cost: 3,
    cooldown: 5,
  },
};

// Function to get a full skill object with its ID
export function getSkillById(id: string): Skill | null {
  if (SKILL_LIBRARY[id]) {
    return {
      id,
      ...SKILL_LIBRARY[id],
    };
  }
  return null;
}
