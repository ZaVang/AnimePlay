/**
 * S8b 内容批：被动光环事件 handler（29 个）。
 * 经被动管线分发（runtime.emitActivePassives：只触发主辩手、只分发已实现 effectId），
 * 每个 handler 自带事件守卫——管线对所有事件广播，不守卫就会超发（S8a 降级教训）。
 * 随机一律 ctx.rng；持续效果/计数经 ../../systems 共享实例；日志走战斗日志 store。
 */
import { usePlayerStore, useGameStore, useHistoryStore } from '@/stores/battle';
import type { EffectContext } from '@/engine';
import type { AnimeCard } from '@/types/card';
import type { PlayerId } from '@/types/battle';
import { statusEffects, persistentEffects } from '../../systems';

type EffectHandler = (ctx: EffectContext) => void | Promise<void>;

/** afterResolve 的结算奖励（battleFlow 把 clashResult 合进 clash 后才有；类型层未声明，运行时读取）。 */
interface ClashRewards {
  attackerReputationChange: number;
  defenderReputationChange: number;
  topicBiasChange: number;
}

function rewardsOf(ctx: EffectContext): ClashRewards | undefined {
  return (ctx.clash as { rewards?: ClashRewards } | undefined)?.rewards;
}

/** 本方在本次结算中的声望变动（attacker 看攻方、defender 看守方；无结算数据按 0）。 */
function ownReputationChange(ctx: EffectContext): number {
  const rewards = rewardsOf(ctx);
  if (!rewards) return 0;
  return ctx.role === 'attacker' ? rewards.attackerReputationChange : rewards.defenderReputationChange;
}

function playerName(playerId: PlayerId): string {
  return usePlayerStore()[playerId].name;
}

/** 把指定卡牌从弃牌堆移回手牌；不在弃牌堆则返回 false。 */
function returnCardFromDiscard(playerId: PlayerId, cardId: number): boolean {
  const playerStore = usePlayerStore();
  const i = playerStore[playerId].discardPile.findIndex(c => c.id === cardId);
  if (i < 0) return false;
  const [card] = playerStore[playerId].discardPile.splice(i, 1);
  playerStore[playerId].hand.push(card);
  return true;
}

/** 议题偏向向己方移动 n 点（正向偏 playerA）。 */
function biasTowardSelf(playerId: PlayerId, n: number) {
  useGameStore().updateTopicBias(playerId === 'playerA' ? n : -n);
}

function hasTag(ctx: EffectContext, tag: string): boolean {
  return !!ctx.card?.synergy_tags?.includes(tag);
}

export const contentPassives: Record<string, EffectHandler> = {
  // ===== afterResolve：对撞结算反应 =====

  // 对手对己方使用「友好安利」时，己方议题偏向额外+1
  '战场原黑仪_傲娇魅力': (ctx) => {
    if (ctx.event !== 'afterResolve' || ctx.role !== 'defender') return;
    if (ctx.clash?.attackStyle !== '友好安利') return;
    biasTowardSelf(ctx.playerId, 1);
    useHistoryStore().addLog(`${playerName(ctx.playerId)} 的傲娇魅力：友好安利反被利用，议题偏向+1。`, 'info');
  },

  // 对手对己方使用「友好安利」时，己方声望+1
  '千反田爱瑠_大小姐魅力': (ctx) => {
    if (ctx.event !== 'afterResolve' || ctx.role !== 'defender') return;
    if (ctx.clash?.attackStyle !== '友好安利') return;
    usePlayerStore().changeReputation(ctx.playerId, 1);
    useHistoryStore().addLog(`${playerName(ctx.playerId)} 的大小姐魅力：声望+1。`, 'info');
  },

  // 对手「辛辣点评」造成己方声望损失时，补偿+1（等效损失-1）
  '千石抚子_害羞可爱': (ctx) => {
    if (ctx.event !== 'afterResolve' || ctx.role !== 'defender') return;
    if (ctx.clash?.attackStyle !== '辛辣点评') return;
    const rewards = rewardsOf(ctx);
    if (!rewards || rewards.defenderReputationChange >= 0) return;
    usePlayerStore().changeReputation(ctx.playerId, 1);
    useHistoryStore().addLog(`${playerName(ctx.playerId)} 的害羞可爱：声望损失-1（补偿+1）。`, 'info');
  },

  // 本方本次有出牌且声望受损时，25% 把该牌从弃牌堆收回手牌
  //（设计「被击败的卡牌」按现实落地为：本次结算己方声望受损 = 视为败方）
  '晓美焰_轮回记忆': (ctx) => {
    if (ctx.event !== 'afterResolve' || !ctx.card) return;
    if (ownReputationChange(ctx) >= 0) return;
    if (ctx.rng.next() >= 0.25) return;
    if (!returnCardFromDiscard(ctx.playerId, ctx.card.id)) return;
    useHistoryStore().addLog(`${playerName(ctx.playerId)} 的轮回记忆：[${ctx.card.name}] 回到手牌。`, 'info');
  },

  // 对手攻击卡的主类型 → 己方下次同类型卡-1费
  '千早爱音_流行追随': (ctx) => {
    if (ctx.event !== 'afterResolve' || ctx.role !== 'defender') return;
    const primary = ctx.clash?.attackingCard?.synergy_tags?.[0];
    if (!primary) return;
    persistentEffects.addTemporaryBonus({
      playerId: ctx.playerId, cardType: primary, bonusType: 'cost', amount: 1,
      duration: 2, oneShot: 'next-match',
      description: `流行追随：下次${primary}类卡牌-1费`,
    });
  },

  // 对手「辛辣点评」→ 己方下次攻击被迫辛辣点评
  '逢坂大河_傲娇反击': (ctx) => {
    if (ctx.event !== 'afterResolve' || ctx.role !== 'defender') return;
    if (ctx.clash?.attackStyle !== '辛辣点评') return;
    persistentEffects.addForcedAction(ctx.playerId, 'harsh_only', 2);
    useHistoryStore().addLog(`${playerName(ctx.playerId)} 的傲娇反击：下次攻击必须选择辛辣点评！`, 'info');
  },

  // 己方声望受损时 → 下次校园类卡牌-1费
  '藤林杏_外硬内软': (ctx) => {
    if (ctx.event !== 'afterResolve') return;
    if (ownReputationChange(ctx) >= 0) return;
    persistentEffects.addTemporaryBonus({
      playerId: ctx.playerId, cardType: '校园', bonusType: 'cost', amount: 1,
      duration: 2, oneShot: 'next-match',
      description: '外硬内软：下次校园类卡牌-1费',
    });
  },

  // ===== onPlay：出牌联动 =====

  // 打出校园卡 → 下次技能-1费
  '黄前久美子_校园协调': (ctx) => {
    if (ctx.event !== 'onPlay' || !hasTag(ctx, '校园')) return;
    persistentEffects.addTemporaryBonus({
      playerId: ctx.playerId, bonusType: 'tp_cost', amount: 1, duration: 2, oneShot: 'next-play',
      description: '校园协调：下次技能-1费',
    });
  },

  // 打出科幻卡 → 下张卡牌-1费
  '长门有希_数据分析': (ctx) => {
    if (ctx.event !== 'onPlay' || !hasTag(ctx, '科幻')) return;
    persistentEffects.addTemporaryBonus({
      playerId: ctx.playerId, bonusType: 'cost', amount: 1, duration: 2, oneShot: 'next-play',
      description: '数据分析：下张卡牌-1费',
    });
  },

  // 打出奇幻卡 40% 不消耗（从弃牌堆收回手牌）
  '远坂凛_魔术师血统': (ctx) => {
    if (ctx.event !== 'onPlay' || !ctx.card || !hasTag(ctx, '奇幻')) return;
    if (ctx.rng.next() >= 0.4) return;
    if (!returnCardFromDiscard(ctx.playerId, ctx.card.id)) return;
    useHistoryStore().addLog(`${playerName(ctx.playerId)} 的魔术师血统：[${ctx.card.name}] 不消耗，回到手牌。`, 'info');
  },

  // 奇幻卡视为任意类型（光环类型判定按通配，engine/battle/strength 消费该标志）
  '芙莉莲_魔法精通': (ctx) => {
    if (ctx.event !== 'onPlay' || !ctx.card || !hasTag(ctx, '奇幻')) return;
    (ctx.card as AnimeCard & { __treatedAsAnyType?: boolean }).__treatedAsAnyType = true;
  },

  // 本回合首张某主类型 → 下次同类型卡-1费（「同一类型的第2张」；出牌计数已含当前张）
  '艾莉丝_格雷拉特_贵族血统': (ctx) => {
    if (ctx.event !== 'onPlay' || !ctx.card) return;
    const primary = ctx.card.synergy_tags?.[0];
    if (!primary) return;
    const count = statusEffects.typesPlayedThisTurn(ctx.playerId).filter(t => t === primary).length;
    if (count !== 1) return;
    persistentEffects.addTemporaryBonus({
      playerId: ctx.playerId, cardType: primary, bonusType: 'cost', amount: 1,
      duration: 1, oneShot: 'next-match',
      description: `贵族血统：下次${primary}类卡牌-1费`,
    });
  },

  // 打出恋爱卡 → 下次技能-1费
  '藤原千花_天真烂漫': (ctx) => {
    if (ctx.event !== 'onPlay' || !hasTag(ctx, '恋爱')) return;
    persistentEffects.addTemporaryBonus({
      playerId: ctx.playerId, bonusType: 'tp_cost', amount: 1, duration: 2, oneShot: 'next-play',
      description: '天真烂漫：下次技能-1费',
    });
  },

  // 设计原文「预知对手下回合第一张牌」无信息展示通道；
  // 按现实改为「打出科幻后下张卡牌+1强度（预判优势）」。
  '阿万音铃羽_未来知识': (ctx) => {
    if (ctx.event !== 'onPlay' || !hasTag(ctx, '科幻')) return;
    persistentEffects.addTemporaryBonus({
      playerId: ctx.playerId, bonusType: 'strength', amount: 1, duration: 2, oneShot: 'next-play',
      description: '未来知识：下张卡牌+1强度',
    });
  },

  // 打出科幻卡 → 下次恋爱类卡牌-1费
  '亚丝娜_结城明日奈_副团长': (ctx) => {
    if (ctx.event !== 'onPlay' || !hasTag(ctx, '科幻')) return;
    persistentEffects.addTemporaryBonus({
      playerId: ctx.playerId, cardType: '恋爱', bonusType: 'cost', amount: 1,
      duration: 2, oneShot: 'next-match',
      description: '副团长：下次恋爱类卡牌-1费',
    });
  },

  // next-play + 类型限定 = 严格「连续」语义：下张若非奇幻，加成随出牌作废
  '菲伦_师父照顾': (ctx) => {
    if (ctx.event !== 'onPlay' || !hasTag(ctx, '奇幻')) return;
    persistentEffects.addTemporaryBonus({
      playerId: ctx.playerId, cardType: '奇幻', bonusType: 'cost', amount: 1,
      duration: 1, oneShot: 'next-play',
      description: '师父照顾：紧接的奇幻卡牌-1费',
    });
  },

  // 设计原文「校园↔恋爱互相触发被动」不可判定；按现实改为类型联动：
  // 打出校园 → 恋爱+1强度（1回合）；打出恋爱 → 校园+1强度（1回合）。
  '樱岛麻衣_前偶像': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    if (hasTag(ctx, '校园')) persistentEffects.addCardTypeStrengthBonus(ctx.playerId, '恋爱', 1, 1);
    if (hasTag(ctx, '恋爱')) persistentEffects.addCardTypeStrengthBonus(ctx.playerId, '校园', 1, 1);
  },

  // 对局累计每出满 3 种不同主类型（3/6/9…），下次卡牌-2费（markOnce 防同阈值重发）
  '山田凉_音乐狂热': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const d = statusEffects.distinctTypesAll(ctx.playerId);
    if (d < 3 || !statusEffects.markOnce(ctx.playerId, `音乐狂热_${Math.floor(d / 3)}`)) return;
    persistentEffects.addTemporaryBonus({
      playerId: ctx.playerId, bonusType: 'cost', amount: 2, duration: 2, oneShot: 'next-play',
      description: '音乐狂热：下张卡牌-2费',
    });
  },

  // ===== beforeResolve：结算前强度注入 =====

  // 声望≤15 时防守强度+1
  '阿尔托莉雅_潘德拉贡_骑士守护': (ctx) => {
    if (ctx.event !== 'beforeResolve' || ctx.role !== 'defender' || !ctx.addStrengthBonus) return;
    if (usePlayerStore()[ctx.playerId].reputation > 15) return;
    ctx.addStrengthBonus(ctx.role, 1);
    useHistoryStore().addLog('骑士守护：逆境防守+1强度。', 'info');
  },

  // 议题偏向=0 时强度+1
  '绫波丽_零的存在': (ctx) => {
    if (ctx.event !== 'beforeResolve' || !ctx.addStrengthBonus) return;
    if (useGameStore().topicBias !== 0) return;
    ctx.addStrengthBonus(ctx.role, 1);
    useHistoryStore().addLog('零的存在：议题均衡，+1强度。', 'info');
  },

  // 设计原文「每回合抽取的第一张牌+1强度」依赖不存在的抽牌挂钩；
  // 按现实改为「每回合打出的第一张牌+1强度」（出牌计数已含当前张）。
  '雪之下雪乃_优等生': (ctx) => {
    if (ctx.event !== 'beforeResolve' || !ctx.addStrengthBonus) return;
    if (statusEffects.playsThisTurn(ctx.playerId) !== 1) return;
    ctx.addStrengthBonus(ctx.role, 1);
    useHistoryStore().addLog('优等生：本回合第一张出牌+1强度。', 'info');
  },

  // 科幻卡进攻时压制防守方本次对撞的被动光环
  '草薙素子_义体强化': (ctx) => {
    if (ctx.event !== 'beforeResolve' || ctx.role !== 'attacker' || !hasTag(ctx, '科幻')) return;
    const defenderId = ctx.clash?.defenderId;
    if (!defenderId) return;
    statusEffects.suppressAuraFor(defenderId);
    useHistoryStore().addLog('义体强化：本次对撞无视对方被动光环。', 'info');
  },

  // ===== turnStart / turnEnd：回合钩子 =====

  // 回合开始技能冷却额外-1（battleFlow 的常规递减之外再减一次）
  '忍野忍_不老传说': (ctx) => {
    if (ctx.event !== 'turnStart') return;
    const playerStore = usePlayerStore();
    if (Object.keys(playerStore[ctx.playerId].skillCooldowns).length === 0) return;
    playerStore.reduceSkillCooldowns(ctx.playerId);
    useHistoryStore().addLog(`${playerName(ctx.playerId)} 的不老传说：技能冷却额外-1。`, 'info');
  },

  // 回合开始时偏向不利己则不触发（A 需 ≥0，B 需 ≤0）→ 全队技能冷却-1
  '坂上智代_领导魅力': (ctx) => {
    if (ctx.event !== 'turnStart') return;
    const bias = useGameStore().topicBias;
    const favorable = ctx.playerId === 'playerA' ? bias >= 0 : bias <= 0;
    if (!favorable) return;
    const playerStore = usePlayerStore();
    if (Object.keys(playerStore[ctx.playerId].skillCooldowns).length === 0) return;
    playerStore.reduceSkillCooldowns(ctx.playerId);
    useHistoryStore().addLog(`${playerName(ctx.playerId)} 的领导魅力：全队技能冷却-1。`, 'info');
  },

  // 每回合第一张牌-1费（回合开始挂 next-play 减费，首张出牌即消费）
  '明石_理智思考': (ctx) => {
    if (ctx.event !== 'turnStart') return;
    persistentEffects.addTemporaryBonus({
      playerId: ctx.playerId, bonusType: 'cost', amount: 1, duration: 1, oneShot: 'next-play',
      description: '理智思考：本回合第一张牌-1费',
    });
  },

  // 设计原文「每跳过一次攻击机会」；按现实落地为「回合结束时本回合零出牌」
  //（turnEnd 时出牌计数尚未重置）→ 下张卡牌-1费。
  '折木奉太郎_省力主义': (ctx) => {
    if (ctx.event !== 'turnEnd') return;
    if (statusEffects.playsThisTurn(ctx.playerId) !== 0) return;
    persistentEffects.addTemporaryBonus({
      playerId: ctx.playerId, bonusType: 'cost', amount: 1, duration: 2, oneShot: 'next-play',
      description: '省力主义：下张卡牌-1费',
    });
  },

  // ===== onSkillUsed：技能响应 =====

  // 对手使用技能时 25% 使该技能冷却+1
  '御坂美琴_电磁干扰': (ctx) => {
    if (ctx.event !== 'onSkillUsed' || !ctx.skill || !ctx.skillUserId) return;
    if (ctx.skillUserId === ctx.playerId) return;
    if (ctx.rng.next() >= 0.25) return;
    const playerStore = usePlayerStore();
    const current = playerStore[ctx.skillUserId].skillCooldowns[ctx.skill.id] || 0;
    playerStore.setSkillCooldown(ctx.skillUserId, ctx.skill.id, current + 1);
    useHistoryStore().addLog(`${playerName(ctx.playerId)} 的电磁干扰：[${ctx.skill.name}] 冷却+1。`, 'info');
  },

  // 己方使用技能后全队冷却-1。
  // 注：reduceSkillCooldowns 会把刚用技能新上的冷却一并-1（等效该技能冷却缩短1回合），
  // 与设计「全队技能冷却-1」一致。
  '伊地知虹夏_团队协调': (ctx) => {
    if (ctx.event !== 'onSkillUsed' || ctx.skillUserId !== ctx.playerId) return;
    usePlayerStore().reduceSkillCooldowns(ctx.playerId);
    useHistoryStore().addLog(`${playerName(ctx.playerId)} 的团队协调：全队技能冷却-1。`, 'info');
  },

  // 己方每使用一次技能 → 下张卡牌+1强度
  '鲁路修_兰佩路基_皇族智谋': (ctx) => {
    if (ctx.event !== 'onSkillUsed' || ctx.skillUserId !== ctx.playerId) return;
    persistentEffects.addTemporaryBonus({
      playerId: ctx.playerId, bonusType: 'strength', amount: 1, duration: 2, oneShot: 'next-play',
      description: '皇族智谋：下张卡牌+1强度',
    });
  },
};
