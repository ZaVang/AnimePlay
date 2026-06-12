/**
 * 条件费用修饰器（S8b）——「驾驶员骄傲：偏向≥3 时全卡-1费」这类
 * 取费瞬间才能判定的被动。与事件 handler 不同，这里是**查询型**注册表：
 * 出牌费计算（玩家 UI / AI / 实际扣费三处同源）逐个询问主辩手的被动。
 * 返回值 = 减费量（正数减费；不满足条件返回 0）。
 *
 * 注册的 effectId 同样视为「已实装」（isEffectImplemented 计入本表）。
 */
import { usePlayerStore, useGameStore } from '@/stores/battle';
import { persistentEffects } from '../systems';
import { effectiveCardCost } from '@/engine';

type PlayerId = 'playerA' | 'playerB';
export interface CostCard {
  id?: number;
  cost?: number;
  synergy_tags?: string[];
}
export type CostModifier = (playerId: PlayerId, card: CostCard) => number;

/** 议题偏向是否偏向该玩家至少 n 点（正向偏 playerA）。 */
function biasToward(playerId: PlayerId, n: number): boolean {
  const bias = useGameStore().topicBias;
  return playerId === 'playerA' ? bias >= n : bias <= -n;
}

export const costModifiers: Record<string, CostModifier> = {
  // 己方议题偏向≥3 → 全卡-1费
  '惣流_明日香_兰格雷_驾驶员骄傲': (playerId) => (biasToward(playerId, 3) ? 1 : 0),

  // 手牌不同主类型≥3 种 → 全卡-1费（主类型 = synergy_tags[0]；无标签卡不计种类）
  '坂田银时_万事屋精神': (playerId) => {
    const types = new Set(
      usePlayerStore()[playerId].hand
        .map(c => c.synergy_tags?.[0])
        .filter((t): t is string => !!t),
    );
    return types.size >= 3 ? 1 : 0;
  },

  // 己方 TP 落后于对手 → 音乐类卡牌-1费
  '中野梓_后辈努力': (playerId, card) => {
    const playerStore = usePlayerStore();
    const opponentId = playerId === 'playerA' ? 'playerB' : 'playerA';
    if (playerStore[playerId].tp >= playerStore[opponentId].tp) return 0;
    return card.synergy_tags?.includes('音乐') ? 1 : 0;
  },

  // 声望≤15 → 全卡-1费
  '碇真嗣_逃避现实': (playerId) => (usePlayerStore()[playerId].reputation <= 15 ? 1 : 0),

  // 议题偏向=0 → 奇幻类卡牌-1费
  '艾米莉娅_银发王选': (playerId, card) => {
    if (useGameStore().topicBias !== 0) return 0;
    return card.synergy_tags?.includes('奇幻') ? 1 : 0;
  },
};

/** 主辩手被动产生的条件减费合计。 */
export function passiveCostReduction(playerId: PlayerId, card: CostCard): number {
  const player = usePlayerStore()[playerId];
  const active = player.characters[player.activeCharacterIndex];
  let total = 0;
  for (const skill of active?.skills || []) {
    if (skill.type !== '被动光环' || !skill.effectId) continue;
    const mod = costModifiers[skill.effectId];
    if (mod) total += mod(playerId, card);
  }
  return total;
}

/**
 * 出牌实际费用的唯一入口（S8b 起）：卡面费 − 追踪器加减费 − 条件被动减费，下限 0。
 * battleFlow 扣费 / AI 决策 / CardActionModal 显示三处共用，保证「看到的就是扣的」。
 */
export function playerCardCost(playerId: PlayerId, card: CostCard): number {
  const trackerReduction = persistentEffects.getCostReduction(playerId, card.synergy_tags || [], card.id);
  return effectiveCardCost(card.cost, trackerReduction + passiveCostReduction(playerId, card));
}
