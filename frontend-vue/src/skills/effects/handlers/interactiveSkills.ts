/**
 * S8c handler 分桶：交互式技能 —— 看牌 / 选牌 / 换手牌 / 复制 / 重排牌库 / 改卡。
 * 双轨约定：玩家（playerA）走 InteractionSystem 弹窗；AI（playerB）用 ctx.rng 自动决断，
 * 不弹任何 UI（将来 PvP 时此分支改为对端决策）。
 * 牌库方向约定：牌库顶 = 数组尾（drawCards 从尾部 pop）。
 * 手牌卡是 gameDataStore 主数据的引用——任何「改卡」必须先克隆再替换，严禁原地改 points/tags。
 */
import type { EffectContext } from '@/engine';
import type { AnimeCard } from '@/types/card';
import { usePlayerStore, useGameStore, useHistoryStore } from '@/stores/battle';
import { persistentEffects } from '../../systems';
import { InteractionSystem } from '../../interaction';

type EffectHandler = (ctx: EffectContext) => void | Promise<void>;
type PlayerId = 'playerA' | 'playerB';

const GENRES = ['日常', '科幻', '战斗', '奇幻', '校园', '恋爱', '音乐', '运动'];

function opponentOf(playerId: PlayerId): PlayerId {
  return playerId === 'playerA' ? 'playerB' : 'playerA';
}

function nameOf(playerId: PlayerId): string {
  const playerStore = usePlayerStore();
  return playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
}

/** AI 自动决断（无 UI）；玩家走弹窗。 */
function isAuto(playerId: PlayerId): boolean {
  return playerId === 'playerB';
}

/** 从数组里按注入随机源取一个。 */
function pickRandom<T>(arr: readonly T[], rng: EffectContext['rng']): T {
  return arr[Math.floor(rng.next() * arr.length)];
}

/** 把牌库里的某张卡移到牌库顶（数组尾）。 */
function moveToDeckTop(playerId: PlayerId, cardId: number) {
  const deck = usePlayerStore()[playerId].deck;
  const i = deck.findIndex(c => c.id === cardId);
  if (i >= 0) {
    const [card] = deck.splice(i, 1);
    deck.push(card);
  }
}

export const interactiveSkills: Record<string, EffectHandler> = {
  /** 查看牌库顶3张，选1张置顶（其余保持原相对顺序）。 */
  '长门有希_信息操作': async (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const deck = usePlayerStore()[ctx.playerId].deck;
    if (deck.length === 0) return;
    const top3 = deck.slice(-Math.min(3, deck.length)).reverse(); // 顶在前

    let chosen: AnimeCard | undefined;
    if (isAuto(ctx.playerId)) {
      chosen = pickRandom(top3, ctx.rng);
    } else {
      const result = await InteractionSystem.getInstance().selectFromCards(top3, {
        count: 1, source: 'viewed', required: false, title: '信息操作：选 1 张置于牌库顶',
      });
      chosen = result.selected[0];
    }
    if (chosen) {
      moveToDeckTop(ctx.playerId, chosen.id);
      useHistoryStore().addLog(`${nameOf(ctx.playerId)} 信息操作：重排了牌库顶。`, 'info');
    }
  },

  /** 双方交换一张手牌（己方选给出的牌，随机获得对方一张），换来的牌成本-2（一次性）。 */
  'CC_GEASS契约': async (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const playerStore = usePlayerStore();
    const opp = opponentOf(ctx.playerId);
    const ownHand = playerStore[ctx.playerId].hand;
    const oppHand = playerStore[opp].hand;
    if (ownHand.length === 0 || oppHand.length === 0) {
      useHistoryStore().addLog('GEASS契约：有一方没有手牌，契约未成立。', 'info');
      return;
    }

    let give: AnimeCard | undefined;
    if (isAuto(ctx.playerId)) {
      give = pickRandom(ownHand, ctx.rng);
    } else {
      const result = await InteractionSystem.getInstance().selectFromCards([...ownHand], {
        count: 1, source: 'hand', required: true, title: 'GEASS契约：选 1 张交给对方',
      });
      give = result.selected[0] ?? ownHand[0];
    }
    const gain = pickRandom(oppHand, ctx.rng);

    playerStore.removeCardFromHand(ctx.playerId, give);
    playerStore.removeCardFromHand(opp, gain);
    playerStore.addCardToHand(ctx.playerId, gain);
    playerStore.addCardToHand(opp, give);

    persistentEffects.addTemporaryBonus({
      playerId: ctx.playerId, bonusType: 'cost', amount: 2, duration: 1,
      oneShot: 'next-match', cardId: gain.id,
      description: `GEASS契约：[${gain.name}] 本回合-2费`,
    });
    useHistoryStore().addLog(`GEASS契约成立：${nameOf(ctx.playerId)} 用 [${give.name}] 换来 [${gain.name}]（本回合-2费）。`, 'event');
  },

  /** 选择一张己方手牌，获得「结算前强度+2」（点名卡牌，打出时生效）。 */
  '远坂凛_宝石魔术': async (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const hand = usePlayerStore()[ctx.playerId].hand;
    if (hand.length === 0) return;

    let target: AnimeCard | undefined;
    if (isAuto(ctx.playerId)) {
      target = hand.reduce((best, c) => ((c.points || 0) > (best.points || 0) ? c : best));
    } else {
      const result = await InteractionSystem.getInstance().selectFromCards([...hand], {
        count: 1, source: 'hand', required: true, title: '宝石魔术：选 1 张注入宝石（+2强度）',
      });
      target = result.selected[0] ?? hand[0];
    }
    if (target) {
      persistentEffects.addTemporaryBonus({
        playerId: ctx.playerId, bonusType: 'strength', amount: 2, duration: -1,
        oneShot: 'next-match', cardId: target.id,
        description: `宝石魔术：[${target.name}] +2强度`,
      });
      useHistoryStore().addLog(`${nameOf(ctx.playerId)} 宝石魔术：[${target.name}] 被强化（+2强度）。`, 'event');
    }
  },

  /** 指定一种类型，对手下回合只能打出该类型卡牌（无则只能跳过攻击）。 */
  '鲁路修_兰佩路基_GEASS命令': async (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const opp = opponentOf(ctx.playerId);

    let type: string | null;
    if (isAuto(ctx.playerId)) {
      type = pickRandom(GENRES, ctx.rng);
    } else {
      type = await InteractionSystem.getInstance().selectCardType(GENRES, 'GEASS命令：指定对手只能打出的类型');
    }
    if (!type) type = GENRES[0];

    persistentEffects.addRestriction(opp, 'forced_card_type', { type }, 2);
    useHistoryStore().addLog(`GEASS命令下达：${nameOf(opp)} 下回合只能打出${type}类卡牌！`, 'event');
    useGameStore().addNotification(`GEASS命令：对手只能出${type}类`, 'warning');
  },

  /** 查看对手2张手牌，若其中有日常类则抽1张牌。 */
  '泉此方_宅女知识': async (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const playerStore = usePlayerStore();
    const seen = await InteractionSystem.getInstance().viewOpponentHand(ctx.playerId, {
      count: 2, source: 'hand', title: '宅女知识：侦查对手手牌',
    });
    if (seen.some(c => c.synergy_tags?.includes('日常'))) {
      playerStore.drawCards(ctx.playerId, 1);
      useHistoryStore().addLog(`${nameOf(ctx.playerId)} 宅女知识：发现日常同好，抽1张牌。`, 'info');
    }
  },

  /** 选择己方一张手牌，将其强度调整为5点（克隆替换，不污染主数据）。 */
  '羽川翼_完美主义': async (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const playerStore = usePlayerStore();
    const hand = playerStore[ctx.playerId].hand;
    if (hand.length === 0) return;

    let target: AnimeCard | undefined;
    if (isAuto(ctx.playerId)) {
      target = hand.reduce((worst, c) => ((c.points || 0) < (worst.points || 0) ? c : worst));
    } else {
      const result = await InteractionSystem.getInstance().selectFromCards([...hand], {
        count: 1, source: 'hand', required: true, title: '完美主义：选 1 张标准化为5点强度',
      });
      target = result.selected[0] ?? hand[0];
    }
    if (target) {
      const i = hand.findIndex(c => c.id === target!.id);
      if (i >= 0) hand.splice(i, 1, { ...target, points: 5 });
      useHistoryStore().addLog(`${nameOf(ctx.playerId)} 完美主义：[${target.name}] 强度标准化为 5。`, 'event');
    }
  },

  /** 查看对手全部手牌，复制其中一张奇幻类卡牌到己方手牌。 */
  '芙莉莲_魔法收集': async (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const playerStore = usePlayerStore();
    const opp = opponentOf(ctx.playerId);
    const seen = await InteractionSystem.getInstance().viewOpponentHand(ctx.playerId, {
      count: 99, source: 'hand', title: '魔法收集：查看对手手牌',
    });
    const fantasy = seen.filter(c => c.synergy_tags?.includes('奇幻'));
    if (fantasy.length === 0) {
      useHistoryStore().addLog(`魔法收集：${nameOf(opp)} 手中没有奇幻魔法可学。`, 'info');
      return;
    }

    let target: AnimeCard | undefined;
    if (isAuto(ctx.playerId)) {
      target = fantasy[0];
    } else {
      const result = await InteractionSystem.getInstance().selectFromCards(fantasy, {
        count: 1, source: 'viewed', required: true, title: '魔法收集：选 1 张奇幻卡复制',
      });
      target = result.selected[0] ?? fantasy[0];
    }
    if (target) {
      playerStore.addCardToHand(ctx.playerId, { ...target });
      useHistoryStore().addLog(`${nameOf(ctx.playerId)} 魔法收集：复制了 [${target.name}]！`, 'event');
    }
  },

  /** 查看对手1张随机手牌，并令对手下张打出的卡牌成本+2（敌对，受护盾拦截）。 */
  '阿万音铃羽_时间警告': async (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const opp = opponentOf(ctx.playerId);
    await InteractionSystem.getInstance().viewOpponentHand(ctx.playerId, {
      count: 1, source: 'hand', title: '时间警告：窥见对手的牌',
    });
    persistentEffects.addTemporaryBonus({
      playerId: opp, bonusType: 'cost', amount: -2, duration: 3, oneShot: 'next-play',
      description: '时间警告：下张卡牌+2费',
    });
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 发出时间警告：${nameOf(opp)} 下张卡牌+2费。`, 'event');
    useGameStore().addNotification('时间警告：对手下张卡+2费', 'warning');
  },

  /** 指定对手一张手牌令其成本+2（直到打出；校园卡受「存在感操作」保护不可指定）。 */
  '柊镜_射击精准': async (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const playerStore = usePlayerStore();
    const opp = opponentOf(ctx.playerId);
    const shield = persistentEffects.getRestriction(opp, 'card_target_shield') as { cardType?: string } | undefined;
    const targetable = playerStore[opp].hand.filter(
      c => !(shield?.cardType && c.synergy_tags?.includes(shield.cardType)),
    );
    if (targetable.length === 0) {
      useHistoryStore().addLog('射击精准：对方没有可指定的手牌（受保护）。', 'info');
      return;
    }

    let target: AnimeCard | undefined;
    if (isAuto(ctx.playerId)) {
      target = pickRandom(targetable, ctx.rng);
    } else {
      const result = await InteractionSystem.getInstance().selectFromCards(targetable, {
        count: 1, source: 'viewed', required: true, title: '射击精准：锁定对手一张手牌（+2费）',
      });
      target = result.selected[0] ?? targetable[0];
    }
    if (target) {
      persistentEffects.addTemporaryBonus({
        playerId: opp, bonusType: 'cost', amount: -2, duration: -1,
        oneShot: 'next-match', cardId: target.id,
        description: `射击精准：[${target.name}] +2费`,
      });
      useHistoryStore().addLog(`${nameOf(ctx.playerId)} 射击精准：锁定 [${target.name}]，其费用+2。`, 'event');
    }
  },

  /** 将己方一张手牌的主类型改为任意类型（克隆替换，直到打出为止自然生效）。 */
  '安原绘麻_原画创作': async (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const playerStore = usePlayerStore();
    const hand = playerStore[ctx.playerId].hand;
    if (hand.length === 0) return;

    let target: AnimeCard | undefined;
    let type: string | null;
    if (isAuto(ctx.playerId)) {
      target = pickRandom(hand, ctx.rng);
      type = pickRandom(GENRES, ctx.rng);
    } else {
      const interaction = InteractionSystem.getInstance();
      const result = await interaction.selectFromCards([...hand], {
        count: 1, source: 'hand', required: true, title: '原画创作：选 1 张重绘类型',
      });
      target = result.selected[0] ?? hand[0];
      type = await interaction.selectCardType(GENRES, '原画创作：改为哪种类型？');
    }
    if (target && type) {
      const i = hand.findIndex(c => c.id === target!.id);
      if (i >= 0) {
        hand.splice(i, 1, { ...target, synergy_tags: [type, ...(target.synergy_tags || []).slice(1)] });
      }
      useHistoryStore().addLog(`${nameOf(ctx.playerId)} 原画创作：[${target.name}] 重绘为${type}类。`, 'event');
    }
  },

  /** 抽2张牌，玩家弃1张（AI 弃点数最低）；弃掉校园类则额外抽1。 */
  '千反田爱瑠_好奇探究': async (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const playerStore = usePlayerStore();
    playerStore.drawCards(ctx.playerId, 2);
    const hand = playerStore[ctx.playerId].hand;
    if (hand.length === 0) return;

    let toDiscard: AnimeCard | undefined;
    if (isAuto(ctx.playerId)) {
      toDiscard = hand.reduce((worst, c) => ((c.points || 0) < (worst.points || 0) ? c : worst));
    } else {
      const result = await InteractionSystem.getInstance().selectFromCards([...hand], {
        count: 1, source: 'hand', required: true, title: '好奇探究：抽2后弃1张',
      });
      toDiscard = result.selected[0] ?? hand[0];
    }
    if (toDiscard) {
      playerStore.discardCardFromHand(ctx.playerId, String(toDiscard.id));
      useHistoryStore().addLog(`${nameOf(ctx.playerId)} 好奇探究：弃掉了 [${toDiscard.name}]。`, 'info');
      if (toDiscard.synergy_tags?.includes('校园')) {
        playerStore.drawCards(ctx.playerId, 1);
        useHistoryStore().addLog('弃掉校园话题反而更在意了：额外抽1张！', 'info');
      }
    }
  },

  /** 查看对手2张手牌并抽1张牌。 */
  '喜多郁代_社交网络': async (ctx) => {
    if (ctx.event !== 'onPlay') return;
    await InteractionSystem.getInstance().viewOpponentHand(ctx.playerId, {
      count: 2, source: 'hand', title: '社交网络：打探对手情报',
    });
    usePlayerStore().drawCards(ctx.playerId, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 社交网络：情报到手，抽1张牌。`, 'info');
  },

  /** 议题偏向巨变+4（向己方），发动后到下回合结束无法打出卡牌（play_limit 0）。 */
  '惠惠_爆裂魔法': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const gameStore = useGameStore();
    gameStore.updateTopicBias(ctx.playerId === 'playerA' ? 4 : -4);
    // duration 3：覆盖本回合剩余 + 对方回合 + 己方下回合（时序见 persistent.test 锁定语义）
    persistentEffects.addRestriction(ctx.playerId, 'play_limit', { max: 0 }, 3);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 发动爆裂魔法！！议题偏向巨变+4，随后力竭倒地。`, 'event');
    useGameStore().addNotification('爆裂魔法：偏向+4，下回合无法出牌', 'warning');
  },

  /** 声望≤25（带伤状态）时本回合全卡牌+2强度。 */
  '逢坂大河_掌中老虎': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const playerStore = usePlayerStore();
    if (playerStore[ctx.playerId].reputation > 25) {
      useHistoryStore().addLog('掌中老虎按兵不动：还没被惹急。', 'info');
      return;
    }
    persistentEffects.addTemporaryBonus({
      playerId: ctx.playerId, bonusType: 'strength', amount: 2, duration: 1,
      description: '掌中老虎：本回合全卡牌+2强度',
    });
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 掌中老虎暴走：本回合全卡牌+2强度！`, 'event');
  },

  /** 抽2张牌，标记其中1张（玩家选/AI 选点数最高）：下回合结束前打出时+2强度。 */
  '藤原千花_千花游戏': async (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const playerStore = usePlayerStore();
    const before = playerStore[ctx.playerId].hand.length;
    playerStore.drawCards(ctx.playerId, 2);
    const hand = playerStore[ctx.playerId].hand;
    const drawn = hand.slice(before);
    const pool = drawn.length > 0 ? drawn : hand;
    if (pool.length === 0) return;

    let marked: AnimeCard | undefined;
    if (isAuto(ctx.playerId)) {
      marked = pool.reduce((best, c) => ((c.points || 0) > (best.points || 0) ? c : best));
    } else {
      const result = await InteractionSystem.getInstance().selectFromCards(pool, {
        count: 1, source: 'hand', required: true, title: '千花游戏：标记1张（打出时+2强度）',
      });
      marked = result.selected[0] ?? pool[0];
    }
    if (marked) {
      persistentEffects.addTemporaryBonus({
        playerId: ctx.playerId, bonusType: 'strength', amount: 2, duration: 3,
        oneShot: 'next-match', cardId: marked.id,
        description: `千花游戏：[${marked.name}] 打出时+2强度`,
      });
      useHistoryStore().addLog(`${nameOf(ctx.playerId)} 千花游戏：悄悄标记了 [${marked.name}]。`, 'info');
    }
  },

  /** 查看牌库顶3张，选1张加入手牌，其余原序留在牌库。 */
  '宫森葵_制作进行': async (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const playerStore = usePlayerStore();
    const deck = playerStore[ctx.playerId].deck;
    if (deck.length === 0) return;
    const top = deck.slice(-Math.min(3, deck.length)).reverse();

    let chosen: AnimeCard | undefined;
    if (isAuto(ctx.playerId)) {
      chosen = top.reduce((best, c) => ((c.points || 0) > (best.points || 0) ? c : best));
    } else {
      const result = await InteractionSystem.getInstance().selectFromCards(top, {
        count: 1, source: 'viewed', required: true, title: '制作进行：选1张加入手牌',
      });
      chosen = result.selected[0] ?? top[0];
    }
    if (chosen) {
      const i = deck.findIndex(c => c.id === chosen!.id);
      if (i >= 0) deck.splice(i, 1);
      playerStore.addCardToHand(ctx.playerId, chosen);
      useHistoryStore().addLog(`${nameOf(ctx.playerId)} 制作进行：拿到了 [${chosen.name}]。`, 'info');
    }
  },

  /** TP≤对手时：查看对手3张手牌并抽1张牌。 */
  '折木奉太郎_节能推理': async (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const playerStore = usePlayerStore();
    const opp = opponentOf(ctx.playerId);
    if (playerStore[ctx.playerId].tp > playerStore[opp].tp) {
      useHistoryStore().addLog('节能推理：现在没必要节能（TP 占优）。', 'info');
      return;
    }
    await InteractionSystem.getInstance().viewOpponentHand(ctx.playerId, {
      count: 3, source: 'hand', title: '节能推理：低成本侦查',
    });
    playerStore.drawCards(ctx.playerId, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 节能推理：我能不做的事就不做，抽1张。`, 'info');
  },

  /** 查看对手2张手牌，若其中有恋爱或校园类，己方+1TP。 */
  '由比滨结衣_察言观色': async (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const playerStore = usePlayerStore();
    const seen = await InteractionSystem.getInstance().viewOpponentHand(ctx.playerId, {
      count: 2, source: 'hand', title: '察言观色：读取对手情绪',
    });
    if (seen.some(c => c.synergy_tags?.includes('恋爱') || c.synergy_tags?.includes('校园'))) {
      playerStore.changeTp(ctx.playerId, 1);
      useHistoryStore().addLog(`${nameOf(ctx.playerId)} 察言观色：读懂了气氛，+1TP。`, 'info');
    }
  },

  /** 查看牌库顶4张，选1张奇幻类加入手牌（无奇幻则落空）。 */
  '菲伦_魔法修行': async (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const playerStore = usePlayerStore();
    const deck = playerStore[ctx.playerId].deck;
    if (deck.length === 0) return;
    const top = deck.slice(-Math.min(4, deck.length)).reverse();
    const fantasy = top.filter(c => c.synergy_tags?.includes('奇幻'));
    if (fantasy.length === 0) {
      useHistoryStore().addLog('魔法修行：牌库顶没有可学的奇幻魔法。', 'info');
      return;
    }

    let chosen: AnimeCard | undefined;
    if (isAuto(ctx.playerId)) {
      chosen = fantasy[0];
    } else {
      const result = await InteractionSystem.getInstance().selectFromCards(fantasy, {
        count: 1, source: 'viewed', required: true, title: '魔法修行：选1张奇幻卡',
      });
      chosen = result.selected[0] ?? fantasy[0];
    }
    if (chosen) {
      const i = deck.findIndex(c => c.id === chosen!.id);
      if (i >= 0) deck.splice(i, 1);
      playerStore.addCardToHand(ctx.playerId, chosen);
      useHistoryStore().addLog(`${nameOf(ctx.playerId)} 魔法修行：习得 [${chosen.name}]。`, 'info');
    }
  },

  /** 查看牌库顶5张，选2张加入手牌，其余放回牌库底（替换 legacy 简化版「直接抽2」）。 */
  '冈部伦太郎_命运探测': async (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const playerStore = usePlayerStore();
    const deck = playerStore[ctx.playerId].deck;
    if (deck.length === 0) return;
    const topN = Math.min(5, deck.length);
    const top = deck.slice(-topN).reverse(); // 顶在前

    let chosen: AnimeCard[];
    if (isAuto(ctx.playerId)) {
      chosen = [...top].sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, Math.min(2, top.length));
    } else {
      const result = await InteractionSystem.getInstance().selectFromCards(top, {
        count: Math.min(2, top.length), source: 'viewed', required: true, title: '命运探测：选 2 张加入手牌',
      });
      chosen = result.selected.length > 0 ? result.selected : top.slice(0, Math.min(2, top.length));
    }

    // 顶 N 张全部取出 → 选中的进手牌，其余按原顺序放到牌库底（数组头）
    deck.splice(deck.length - topN, topN);
    const rest = top.filter(c => !chosen.some(s => s.id === c.id));
    for (const card of chosen) playerStore.addCardToHand(ctx.playerId, card);
    deck.unshift(...rest.reverse());

    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 命运探测：从未来线选中 ${chosen.length} 张牌。`, 'event');
  },
};
