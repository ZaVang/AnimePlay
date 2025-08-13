import { usePlayerStore, useGameStore, useHistoryStore } from '@/stores/battle';
import type { ClashInfo } from '@/types/battle';
import type { AnimeCard } from '@/types/card';
import { StatusEffectSystem } from '@/core/systems/StatusEffectSystem';

export type BattleEvent = 'onPlay' | 'beforeResolve' | 'afterResolve';
export type CombatRole = 'attacker' | 'defender';

export interface EffectContext {
  event: BattleEvent;
  playerId: 'playerA' | 'playerB';
  role: CombatRole;
  card?: AnimeCard;
  clash?: ClashInfo;
  addStrengthBonus?: (role: CombatRole, amount: number) => void;
}

type EffectHandler = (ctx: EffectContext) => void;

// Effect registry
const handlers: Record<string, EffectHandler> = {
  // Draw 1 card for the acting player
  DRAW_1: (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    playerStore.drawCards(ctx.playerId, 1);
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 触发效果：抽1张牌。`, 'info');
    gameStore.addNotification('效果：抽1张', 'info');
  },

  // Gain 2 TP (simple utility)
  GAIN_TP_2: (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    playerStore.changeTp(ctx.playerId, 2);
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 恢复2点TP。`, 'info');
  },

  // Gain 1 TP
  GAIN_TP_1: (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    playerStore.changeTp(ctx.playerId, 1);
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 恢复1点TP。`, 'info');
  },

  // Add +2 strength to the side determined by ctx.role (applies in beforeResolve)
  STRENGTH_PLUS_2: (ctx) => {
    if (ctx.event !== 'beforeResolve' || !ctx.addStrengthBonus) return;
    ctx.addStrengthBonus(ctx.role, 2);
    const historyStore = useHistoryStore();
    historyStore.addLog(`${ctx.role === 'attacker' ? '攻方' : '守方'} 获得临时强度 +2。`, 'info');
  },

  // Placeholder: Make next played card count as any type (requires status system)
  NEXT_CARD_ANY_TYPE: (ctx) => {
    const historyStore = useHistoryStore();
    const playerStore = usePlayerStore();
    StatusEffectSystem.grantNextCardAnyType(ctx.playerId);
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 获得效果：下一张卡视为任意类型。`, 'info');
  },

  // Halve opponent bias towards their favor (placeholder demo)
  BIAS_HALVE_OPP: (ctx) => {
    const gameStore = useGameStore();
    const historyStore = useHistoryStore();
    const opponentId = ctx.playerId === 'playerA' ? 'playerB' : 'playerA';
    const oppBias = gameStore.topicBias * (opponentId === 'playerA' ? 1 : -1);
    if (oppBias > 0) {
      const reduce = Math.floor(oppBias / 2);
      gameStore.updateTopicBias(reduce * (opponentId === 'playerA' ? -1 : 1));
      historyStore.addLog(`削减对手议题优势 ${reduce}。`, 'info');
    }
  },

  // +1 Strength for the acting side in beforeResolve
  STRENGTH_PLUS_1: (ctx) => {
    if (ctx.event !== 'beforeResolve' || !ctx.addStrengthBonus) return;
    ctx.addStrengthBonus(ctx.role, 1);
    const historyStore = useHistoryStore();
    historyStore.addLog(`${ctx.role === 'attacker' ? '攻方' : '守方'} 获得临时强度 +1。`, 'info');
  },

  // +1 topic bias towards the acting player's side after resolve
  TOPIC_BIAS_PLUS_1: (ctx) => {
    if (ctx.event !== 'afterResolve') return;
    const gameStore = useGameStore();
    const historyStore = useHistoryStore();
    const delta = ctx.playerId === 'playerA' ? 1 : -1;
    gameStore.updateTopicBias(delta);
    historyStore.addLog(`议题偏向 ${delta > 0 ? '+1' : '-1'}。`, 'info');
  },
};

export function runEffect(effectId: string, ctx: EffectContext) {
  const fn = handlers[effectId];
  if (!fn) {
    console.warn(`Effect handler not found: ${effectId}`);
    return;
  }
  try {
    fn(ctx);
  } catch (e) {
    console.error(`Effect handler error: ${effectId}`, e);
  }
}


