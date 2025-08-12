export type EffectId =
  | 'DRAW_1'
  | 'STRENGTH_PLUS_2'
  | 'GAIN_TP_2'
  | 'GAIN_TP_1'
  | 'NEXT_CARD_ANY_TYPE'
  | 'BIAS_HALVE_OPP'
  | 'STRENGTH_PLUS_1'
  | 'TOPIC_BIAS_PLUS_1'
  | 'AURA_GENRE_EXPERT'
  | (string & {});

export type TriggerId = 'onPlay' | 'beforeResolve' | 'afterResolve' | (string & {});

const effectTextMap: Record<EffectId, string> = {
  DRAW_1: '抽1张牌',
  STRENGTH_PLUS_2: '强度+2',
  GAIN_TP_2: '恢复2点TP',
  GAIN_TP_1: '恢复1点TP',
  NEXT_CARD_ANY_TYPE: '下一张卡视为任意类型',
  BIAS_HALVE_OPP: '削减对手议题优势一半（向下取整）',
  STRENGTH_PLUS_1: '强度+1',
  TOPIC_BIAS_PLUS_1: '议题偏向+1（向己方）',
  AURA_GENRE_EXPERT: '打出同类型动画卡时，额外+1强度',
};

const triggerTextMap: Record<TriggerId, string> = {
  onPlay: '打出时',
  beforeResolve: '结算前',
  afterResolve: '结算后',
};

export function getEffectText(effectId: string): string {
  return effectTextMap[effectId as EffectId] || effectId;
}

export function getTriggerText(trigger: string): string {
  return triggerTextMap[trigger as TriggerId] || trigger;
}


