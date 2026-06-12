/**
 * S8b 复活批：S8a 降级的 16 个「半假实现」被动，按设计机制在正确管线事件上重写。
 * 约定（与 customHandlers 一致）：
 *  - 每个 handler 首行事件守卫，进错事件直接 return；
 *  - 随机一律 ctx.rng（注入源），概率判定 ctx.rng.next() < p，禁止 Math.random；
 *  - turnStart 的 TP 奖励走 gainTpOverflow——changeTp 会被 maxTp 封顶，回满后 +1 会被吞；
 *  - 回合出牌口径经 statusEffects（主类型 = synergy_tags[0]；onPlay/beforeResolve 时当前牌已计入）。
 */
import { usePlayerStore, useGameStore, useHistoryStore } from '@/stores/battle';
import type { EffectContext } from '@/engine';
import type { PlayerId } from '@/types/battle';
import { statusEffects } from '../../systems';

type EffectHandler = (ctx: EffectContext) => void | Promise<void>;

/** 对撞结算数据：battleFlow 在 emitAfterResolve 时随 clash 一并展开（ClashInfo 类型未声明该字段，按约定窄化读取）。 */
interface ClashRewards {
  attackerReputationChange: number;
  defenderReputationChange: number;
  topicBiasChange: number;
}

const rewardsOf = (clash: EffectContext['clash']): ClashRewards | undefined =>
  (clash as { rewards?: ClashRewards } | undefined)?.rewards;

/** 议题偏向是否利己：playerA 看 topicBias>0，playerB 看 <0。 */
const isBiasFavorable = (playerId: PlayerId, topicBias: number): boolean =>
  playerId === 'playerA' ? topicBias > 0 : topicBias < 0;

const opponentOf = (playerId: PlayerId): PlayerId =>
  playerId === 'playerA' ? 'playerB' : 'playerA';

const nameOf = (playerId: PlayerId): string => usePlayerStore()[playerId].name;

/** 本回合已出主类型中 type 的出现次数（当前牌已在列尾）。 */
const typeCountThisTurn = (playerId: PlayerId, type: string): number =>
  statusEffects.typesPlayedThisTurn(playerId).filter(t => t === type).length;

export const revivedPassives: Record<string, EffectHandler> = {
  // ===== turnStart：行动方回合开始（TP 已回满、冷却已减）触发其主辩手被动 =====

  '八奈见杏菜_人气者': (ctx) => {
    if (ctx.event !== 'turnStart') return;
    if (ctx.rng.next() >= 0.3) return;
    usePlayerStore().gainTpOverflow(ctx.playerId, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 的人气者魅力：获得1TP。`, 'info');
  },

  'CC_不死之身': (ctx) => {
    if (ctx.event !== 'turnStart') return;
    const playerStore = usePlayerStore();
    if (playerStore[ctx.playerId].reputation >= 10) return;
    playerStore.changeReputation(ctx.playerId, 2);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 的不死之身：声望自动恢复+2。`, 'info');
  },

  '喜多郁代_阳光魅力': (ctx) => {
    if (ctx.event !== 'turnStart') return;
    if (!isBiasFavorable(ctx.playerId, useGameStore().topicBias)) return;
    usePlayerStore().gainTpOverflow(ctx.playerId, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 的阳光魅力：议题优势，获得1TP。`, 'info');
  },

  '由比滨结衣_温柔体贴': (ctx) => {
    if (ctx.event !== 'turnStart') return;
    const playerStore = usePlayerStore();
    const repDiff = Math.abs(
      playerStore[ctx.playerId].reputation - playerStore[opponentOf(ctx.playerId)].reputation,
    );
    if (repDiff < 5) return;
    playerStore.gainTpOverflow(ctx.playerId, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 的温柔体贴：声望差距大，获得1TP。`, 'info');
  },

  '安和昴_世渡_上手': (ctx) => {
    if (ctx.event !== 'turnStart') return;
    if (!isBiasFavorable(ctx.playerId, useGameStore().topicBias)) return;
    usePlayerStore().gainTpOverflow(ctx.playerId, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 世渡り上手：议题优势，获得1TP。`, 'info');
  },

  '古河渚_温柔鼓励': (ctx) => {
    if (ctx.event !== 'turnStart') return;
    const playerStore = usePlayerStore();
    if (playerStore[ctx.playerId].reputation > 20) return;
    playerStore.gainTpOverflow(ctx.playerId, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 的温柔鼓励：低谷中获得1TP。`, 'info');
  },

  '后藤一里_隐居创作': (ctx) => {
    // 设计调整（S8b）：比较口径从「TP 少于对手」改为「手牌少于对手」——
    // turnStart 时 TP 刚回满、双方几乎恒等，原条件形同虚设；手牌劣势才是有意义的补偿点。
    if (ctx.event !== 'turnStart') return;
    const playerStore = usePlayerStore();
    if (playerStore[ctx.playerId].hand.length >= playerStore[opponentOf(ctx.playerId)].hand.length) return;
    playerStore.drawCards(ctx.playerId, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 隐居创作：手牌劣势，抽1张牌。`, 'info');
  },

  // ===== beforeResolve：对撞结算前（ctx.card = 本方打出的牌，强度经 addStrengthBonus 注入） =====

  '平泽唯_天然直觉': (ctx) => {
    if (ctx.event !== 'beforeResolve' || !ctx.addStrengthBonus) return;
    if (!ctx.card?.synergy_tags?.includes('音乐')) return;
    if (typeCountThisTurn(ctx.playerId, '音乐') !== 1) return; // 仅本回合第一张音乐主类型
    ctx.addStrengthBonus(ctx.role, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 的天然直觉：本回合首张音乐卡+1强度。`, 'info');
  },

  '高坂丽奈_音乐世家': (ctx) => {
    if (ctx.event !== 'beforeResolve' || !ctx.addStrengthBonus) return;
    if (!ctx.card?.synergy_tags?.includes('校园')) return;
    if (typeCountThisTurn(ctx.playerId, '校园') !== 1) return; // 仅本回合第一张校园主类型
    ctx.addStrengthBonus(ctx.role, 2);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 的音乐世家：本回合首张校园卡+2强度。`, 'info');
  },

  '宫森葵_团队合作': (ctx) => {
    if (ctx.event !== 'beforeResolve' || !ctx.addStrengthBonus) return;
    const types = statusEffects.typesPlayedThisTurn(ctx.playerId);
    if (types.length !== 2 && types.length !== 3) return; // 本回合第2/第3张出牌
    const current = types[types.length - 1];
    if (types.slice(0, -1).some(t => t === current)) return; // 须与此前所有主类型都不同
    ctx.addStrengthBonus(ctx.role, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 的团队合作：多样出牌+1强度。`, 'info');
  },

  '柊镜_双子感应': (ctx) => {
    // 口径说明：取「回合内」连续两张同主类型（resetTurnCounters 清场，跨回合不算）。
    if (ctx.event !== 'beforeResolve' || !ctx.addStrengthBonus) return;
    const types = statusEffects.typesPlayedThisTurn(ctx.playerId);
    if (types.length < 2) return;
    if (types[types.length - 1] !== types[types.length - 2]) return;
    ctx.addStrengthBonus(ctx.role, 2);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 的双子感应：连续同类型+2强度。`, 'info');
  },

  // ===== onPlay：本方打出一张牌后（出牌计数已含当前这张） =====

  '赫萝_丰收之神': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const distinct = statusEffects.distinctTypesAll(ctx.playerId);
    if (distinct < 3) return; // 对局累计每满 3 种不同主类型奖励一次（markOnce 防同档重发）
    if (!statusEffects.markOnce(ctx.playerId, `丰收_${Math.floor(distinct / 3)}`)) return;
    usePlayerStore().drawCards(ctx.playerId, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 的丰收之神：类型丰收，抽1张牌。`, 'info');
  },

  // ===== afterResolve：对撞结算后（结算数据经 clash.rewards 读取） =====

  '史派克_斯皮格尔_赏金猎人': (ctx) => {
    if (ctx.event !== 'afterResolve') return;
    const rewards = rewardsOf(ctx.clash);
    if (!rewards) return;
    const opponentLost =
      ctx.role === 'attacker'
        ? rewards.defenderReputationChange < 0
        : rewards.attackerReputationChange < 0;
    if (!opponentLost) return;
    if (ctx.rng.next() >= 0.4) return;
    usePlayerStore().gainTpOverflow(ctx.playerId, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 的赏金猎人：造成损失，获得1TP。`, 'info');
  },

  '妮亚_螺旋公主': (ctx) => {
    if (ctx.event !== 'afterResolve') return;
    const rewards = rewardsOf(ctx.clash);
    if (!rewards) return;
    if (!isBiasFavorable(ctx.playerId, rewards.topicBiasChange)) return; // 偏向须朝己方有利方向变动
    useGameStore().updateTopicBias(ctx.playerId === 'playerA' ? 1 : -1); // 同方向再推 1
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 的螺旋公主：议题偏向额外推进1点。`, 'info');
  },

  // ===== onSkillUsed：任一方使用技能后（playerId=被动持有者，skillUserId=使用者） =====

  '椎名真由理_天然黑洞': (ctx) => {
    if (ctx.event !== 'onSkillUsed') return;
    if (!ctx.skillUserId || ctx.skillUserId === ctx.playerId) return; // 只响应对手的技能
    if (ctx.rng.next() >= 0.3) return;
    usePlayerStore().gainTpOverflow(ctx.playerId, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 的天然黑洞：吸收对手技能能量，获得1TP。`, 'info');
  },

  '立华奏_沉默威严': (ctx) => {
    if (ctx.event !== 'onSkillUsed') return;
    if (!ctx.skillUserId || ctx.skillUserId === ctx.playerId) return; // 只响应对手的技能
    if (ctx.rng.next() >= 0.2) return;
    statusEffects.flagSkillNegation(ctx.skillUserId); // useSkill 在效果执行前消费此旗
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 的沉默威严：技能被无效化！`, 'event');
  },
};
