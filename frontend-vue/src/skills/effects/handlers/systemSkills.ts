/**
 * S8c handler 分桶：系统类主动技 —— 禁技 / 强制行动 / 敌对削弱 / 额外回合 / 护盾。
 * 消费端在 battleFlow（钳制与结算）、runtime（canUseSkill）、persistent 追踪器（护盾闸）。
 * 敌对写入（负向加成 / HOSTILE 限制）会被对方的 effect_shield 自动拦截——handler 不必自查。
 */
import type { EffectContext } from '@/engine';
import { usePlayerStore, useGameStore, useHistoryStore } from '@/stores/battle';
import { persistentEffects } from '../../systems';

type EffectHandler = (ctx: EffectContext) => void | Promise<void>;

function opponentOf(playerId: 'playerA' | 'playerB'): 'playerA' | 'playerB' {
  return playerId === 'playerA' ? 'playerB' : 'playerA';
}

function nameOf(playerId: 'playerA' | 'playerB'): string {
  const playerStore = usePlayerStore();
  return playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
}

export const systemSkills: Record<string, EffectHandler> = {
  /** 对手下次辛辣点评强度-3（battleFlow.applyClashStrengthMods 消费，一次性）。 */
  '战场原黑仪_毒舌反击': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const opp = opponentOf(ctx.playerId);
    persistentEffects.addRestriction(opp, 'harsh_penalty', { amount: 3 }, 3);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 准备毒舌反击：对方下次辛辣点评-3强度！`, 'event');
    useGameStore().addNotification('毒舌反击：对方辛辣-3强度', 'warning');
  },

  /** 对手下回合无法使用任何技能（canUseSkill 消费；duration 2 覆盖对方整回合）。 */
  '绫波丽_绝对沉默': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const opp = opponentOf(ctx.playerId);
    persistentEffects.addSkillDisable(opp, '*', 2);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 发动绝对沉默：${nameOf(opp)} 下回合无法使用技能。`, 'event');
    useGameStore().addNotification('绝对沉默：对手技能禁用', 'warning');
  },

  /** 本回合恋爱卡-1费 + 手牌对对手隐藏（InteractionSystem.viewOpponentHand 消费）。 */
  '加藤惠_存在感消失': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    persistentEffects.addCardTypeCostReduction(ctx.playerId, '恋爱', 1, 1);
    persistentEffects.addRestriction(ctx.playerId, 'hand_hidden', {}, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 存在感消失：恋爱卡-1费，手牌被隐藏。`, 'event');
    useGameStore().addNotification('存在感消失：恋爱-1费 + 手牌隐藏', 'info');
  },

  /** 对手下次攻击必须友好安利（battleFlow 风格钳制消费）。 */
  '八奈见杏菜_天然魅力': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const opp = opponentOf(ctx.playerId);
    persistentEffects.addForcedAction(opp, 'friendly_only', 2);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 的天然魅力：${nameOf(opp)} 只能友好安利了。`, 'event');
    useGameStore().addNotification('天然魅力：对手被强制友好安利', 'warning');
  },

  /** 对手下张打出的卡牌强度-2（持续2回合内的下一张；负向加成，受护盾拦截）。 */
  '千石抚子_蛇神缠绕': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const opp = opponentOf(ctx.playerId);
    persistentEffects.addTemporaryBonus({
      playerId: opp, bonusType: 'strength', amount: -2, duration: 3, oneShot: 'next-play',
      description: '蛇神缠绕：下张卡牌-2强度',
    });
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 施展蛇神缠绕：${nameOf(opp)} 的下张卡牌-2强度。`, 'event');
    useGameStore().addNotification('蛇神缠绕：对手下张卡-2强度', 'warning');
  },

  /** 随机禁用对手主辩手的一个主动技（2回合）+ 己方科幻+2（1回合）。 */
  '草薙素子_电子战': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const playerStore = usePlayerStore();
    const opp = opponentOf(ctx.playerId);
    const oppPlayer = playerStore[opp];
    const oppActive = oppPlayer.characters[oppPlayer.activeCharacterIndex];
    const candidates = (oppActive?.skills || []).filter(s => s.type === '主动技能');

    if (candidates.length > 0) {
      const target = candidates[Math.floor(ctx.rng.next() * candidates.length)];
      persistentEffects.addSkillDisable(opp, target.id, 2);
      useHistoryStore().addLog(`电子战入侵：${nameOf(opp)} 的 [${target.name}] 被禁用！`, 'event');
    } else {
      useHistoryStore().addLog('电子战入侵：对方主辩手没有可禁用的主动技。', 'info');
    }
    persistentEffects.addCardTypeStrengthBonus(ctx.playerId, '科幻', 2, 1);
    useGameStore().addNotification('电子战：禁技 + 科幻+2强度', 'info');
  },

  /** 本回合结束后获得额外回合（battleFlow.endTurn 消费）。 */
  '晓美焰_时间停止': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    persistentEffects.addRestriction(ctx.playerId, 'extra_turn', {}, 2);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 发动时间停止：本回合结束后将获得额外回合！`, 'event');
    useGameStore().addNotification('时间停止：额外回合', 'warning');
  },

  /** 本回合己方校园卡不可被对手技能点名（射击精准等卡牌指定类技能消费）。 */
  '樱岛麻衣_存在感操作': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    persistentEffects.addRestriction(ctx.playerId, 'card_target_shield', { cardType: '校园' }, 2);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 存在感操作：校园卡牌获得指定保护。`, 'event');
    useGameStore().addNotification('存在感操作：校园卡防指定', 'info');
  },

  // ===== 总装补漏：分桶派单遗漏的 2 条被动（敌对加费 / 声望补偿）=====

  /** 班长职责（被动）：己方打出校园卡 → 对手下张卡牌+1费（敌对，受护盾拦截）。 */
  '羽川翼_班长职责': (ctx) => {
    if (ctx.event !== 'onPlay' || !ctx.card?.synergy_tags?.includes('校园')) return;
    const opp = opponentOf(ctx.playerId);
    persistentEffects.addTemporaryBonus({
      playerId: opp, bonusType: 'cost', amount: -1, duration: 2, oneShot: 'next-play',
      description: '班长职责：下张卡牌+1费',
    });
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 班长盯防：${nameOf(opp)} 下张卡牌+1费。`, 'info');
  },

  /** 半吸血鬼（被动）：己方声望受损时 30% 几率减少 1 点损失（结算后补偿）。 */
  '阿良良木历_半吸血鬼': (ctx) => {
    if (ctx.event !== 'afterResolve') return;
    const rewards = (ctx.clash as { rewards?: { attackerReputationChange: number; defenderReputationChange: number } } | undefined)?.rewards;
    if (!rewards) return;
    const ownChange = ctx.role === 'attacker' ? rewards.attackerReputationChange : rewards.defenderReputationChange;
    if (ownChange < 0 && ctx.rng.next() < 0.3) {
      usePlayerStore().changeReputation(ctx.playerId, 1);
      useHistoryStore().addLog(`${nameOf(ctx.playerId)} 的半吸血鬼体质：声望损失-1。`, 'info');
    }
  },
};
