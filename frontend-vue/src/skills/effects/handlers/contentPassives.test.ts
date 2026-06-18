/**
 * S8b 内容批被动测试：contentPassives 29 个事件 handler + costModifiers 5 个条件减费。
 * 经 runEffect 直调 effectId（与被动管线同一分发面），每条覆盖 1 触发 + 关键不触发；
 * 概率分支用序列 RNG 锁定；one-shot 加成经 persistentEffects 取值接口断言。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { runEffect } from '@/skills/effects';
import { passiveCostReduction, playerCardCost } from '@/skills/effects/costModifiers';
import { statusEffects, persistentEffects, clearBattleSkillState } from '@/skills/systems';
import { usePlayerStore, useGameStore, useHistoryStore } from '@/stores/battle';
import { createSequenceRng } from '@/engine';
import type { Skill } from '@/types/skill';
import type { AnimeCard, CharacterCard } from '@/types/card';
import type { ClashInfo, PlayerId } from '@/types/battle';

const animeCard = (id: number, tags: string[] = [], cost = 1): AnimeCard =>
  ({ id, name: `卡${id}`, cost, points: 3, synergy_tags: tags }) as unknown as AnimeCard;

const skillOf = (id: string, type: '主动技能' | '被动光环' = '被动光环', extra: Partial<Skill> = {}): Skill =>
  ({ id, name: id, type, description: '', effectId: id, ...extra }) as Skill;

const charWith = (skills: Skill[]): CharacterCard =>
  ({ id: 1, name: '测试角色', rarity: 'UR', skills }) as unknown as CharacterCard;

/** B 攻 A 守的基础对撞（多数防守反应类被动的夹具）。 */
const clashOf = (over: Partial<ClashInfo> = {}): ClashInfo =>
  ({
    attackerId: 'playerB',
    defenderId: 'playerA',
    attackingCard: animeCard(99, ['战斗']),
    attackStyle: '友好安利',
    ...over,
  }) as ClashInfo;

interface Rewards {
  attackerReputationChange: number;
  defenderReputationChange: number;
  topicBiasChange: number;
}

/** 给 clash 附上结算奖励（battleFlow 在 afterResolve 前合入 clashResult，类型层未声明）。 */
const withRewards = (clash: ClashInfo, rewards: Rewards): ClashInfo =>
  ({ ...clash, rewards }) as unknown as ClashInfo;

const noLoss: Rewards = { attackerReputationChange: 0, defenderReputationChange: 0, topicBiasChange: 0 };

beforeEach(() => {
  setActivePinia(createPinia());
  clearBattleSkillState(); // 共享追踪器是模块级单例，逐测清场
});

// =============================================================
// afterResolve：对撞结算反应
// =============================================================
describe('afterResolve 反应类被动', () => {
  it('傲娇魅力：守方挨友好安利 → 议题偏向朝己方+1；辛辣点评不触发', async () => {
    const gameStore = useGameStore();
    await runEffect('战场原黑仪_傲娇魅力', {
      event: 'afterResolve', playerId: 'playerA', role: 'defender',
      card: animeCard(1), clash: clashOf({ attackStyle: '友好安利' }),
    });
    expect(gameStore.topicBias).toBe(1);

    await runEffect('战场原黑仪_傲娇魅力', {
      event: 'afterResolve', playerId: 'playerA', role: 'defender',
      card: animeCard(2), clash: clashOf({ attackStyle: '辛辣点评' }),
    });
    expect(gameStore.topicBias).toBe(1); // 没变
  });

  it('傲娇魅力：B 为守方时偏向朝 B（负向）移动', async () => {
    await runEffect('战场原黑仪_傲娇魅力', {
      event: 'afterResolve', playerId: 'playerB', role: 'defender',
      clash: clashOf({ attackerId: 'playerA', defenderId: 'playerB', attackStyle: '友好安利' }),
    });
    expect(useGameStore().topicBias).toBe(-1);
  });

  it('大小姐魅力：守方挨友好安利 → 声望+1；辛辣点评不触发', async () => {
    const playerStore = usePlayerStore();
    await runEffect('千反田爱瑠_大小姐魅力', {
      event: 'afterResolve', playerId: 'playerA', role: 'defender',
      clash: clashOf({ attackStyle: '友好安利' }),
    });
    expect(playerStore.playerA.reputation).toBe(31);

    await runEffect('千反田爱瑠_大小姐魅力', {
      event: 'afterResolve', playerId: 'playerA', role: 'defender',
      clash: clashOf({ attackStyle: '辛辣点评' }),
    });
    expect(playerStore.playerA.reputation).toBe(31);
  });

  it('害羞可爱：辛辣点评造成守方声望损失 → 补偿+1；无损失不触发', async () => {
    const playerStore = usePlayerStore();
    const lossClash = withRewards(clashOf({ attackStyle: '辛辣点评' }), {
      attackerReputationChange: 1, defenderReputationChange: -2, topicBiasChange: 0,
    });
    await runEffect('千石抚子_害羞可爱', {
      event: 'afterResolve', playerId: 'playerA', role: 'defender', clash: lossClash,
    });
    expect(playerStore.playerA.reputation).toBe(31);

    await runEffect('千石抚子_害羞可爱', {
      event: 'afterResolve', playerId: 'playerA', role: 'defender',
      clash: withRewards(clashOf({ attackStyle: '辛辣点评' }), noLoss),
    });
    expect(playerStore.playerA.reputation).toBe(31); // 没变
  });

  it('轮回记忆：本方出牌+声望受损+25%命中 → 该牌从弃牌堆回手', async () => {
    const playerStore = usePlayerStore();
    const card = animeCard(7, ['战斗']);
    playerStore.playerA.discardPile = [card];
    const clash = withRewards(clashOf(), {
      attackerReputationChange: 1, defenderReputationChange: -2, topicBiasChange: 0,
    });

    await runEffect('晓美焰_轮回记忆', {
      event: 'afterResolve', playerId: 'playerA', role: 'defender',
      card, clash, rng: createSequenceRng([0.1]),
    });
    expect(playerStore.playerA.hand.map(c => c.id)).toContain(7);
    expect(playerStore.playerA.discardPile).toHaveLength(0);
  });

  it('轮回记忆：概率不中或无声望损失 → 不回手', async () => {
    const playerStore = usePlayerStore();
    const card = animeCard(7, ['战斗']);
    playerStore.playerA.discardPile = [card];
    const lossClash = withRewards(clashOf(), {
      attackerReputationChange: 1, defenderReputationChange: -2, topicBiasChange: 0,
    });

    await runEffect('晓美焰_轮回记忆', {
      event: 'afterResolve', playerId: 'playerA', role: 'defender',
      card, clash: lossClash, rng: createSequenceRng([0.9]),
    });
    expect(playerStore.playerA.discardPile).toHaveLength(1); // 0.9 ≥ 0.25 不中

    await runEffect('晓美焰_轮回记忆', {
      event: 'afterResolve', playerId: 'playerA', role: 'defender',
      card, clash: withRewards(clashOf(), noLoss), rng: createSequenceRng([0.1]),
    });
    expect(playerStore.playerA.discardPile).toHaveLength(1); // 无损失不触发
  });

  it('轮回记忆：攻方按攻方声望损失判定', async () => {
    const playerStore = usePlayerStore();
    const card = animeCard(8, ['科幻']);
    playerStore.playerA.discardPile = [card];
    const clash = withRewards(clashOf({ attackerId: 'playerA', defenderId: 'playerB' }), {
      attackerReputationChange: -1, defenderReputationChange: 0, topicBiasChange: 0,
    });
    await runEffect('晓美焰_轮回记忆', {
      event: 'afterResolve', playerId: 'playerA', role: 'attacker',
      card, clash, rng: createSequenceRng([0.1]),
    });
    expect(playerStore.playerA.hand.map(c => c.id)).toContain(8);
  });

  it('流行追随：守方记下对手攻击卡主类型 → 下次同类型-1费；攻方不触发', async () => {
    await runEffect('千早爱音_流行追随', {
      event: 'afterResolve', playerId: 'playerA', role: 'defender',
      clash: clashOf({ attackingCard: animeCard(99, ['战斗', 'TV']) }),
    });
    expect(persistentEffects.getCostReduction('playerA', ['战斗'])).toBe(1);
    expect(persistentEffects.getCostReduction('playerA', ['日常'])).toBe(0); // 类型限定

    clearBattleSkillState();
    await runEffect('千早爱音_流行追随', {
      event: 'afterResolve', playerId: 'playerB', role: 'attacker',
      clash: clashOf({ attackerId: 'playerB', defenderId: 'playerA' }),
    });
    expect(persistentEffects.getCostReduction('playerB', ['战斗'])).toBe(0);
  });

  it('傲娇反击：挨辛辣点评 → 己方被迫辛辣（harsh_only）；友好安利不触发', async () => {
    await runEffect('逢坂大河_傲娇反击', {
      event: 'afterResolve', playerId: 'playerA', role: 'defender',
      clash: clashOf({ attackStyle: '辛辣点评' }),
    });
    expect(persistentEffects.getForcedAction('playerA')).toBe('harsh_only');

    clearBattleSkillState();
    await runEffect('逢坂大河_傲娇反击', {
      event: 'afterResolve', playerId: 'playerA', role: 'defender',
      clash: clashOf({ attackStyle: '友好安利' }),
    });
    expect(persistentEffects.getForcedAction('playerA')).toBeUndefined();
  });

  it('外硬内软：本方声望受损 → 下次校园卡-1费；无损失不触发', async () => {
    await runEffect('藤林杏_外硬内软', {
      event: 'afterResolve', playerId: 'playerA', role: 'attacker',
      clash: withRewards(clashOf({ attackerId: 'playerA', defenderId: 'playerB' }), {
        attackerReputationChange: -1, defenderReputationChange: 0, topicBiasChange: 0,
      }),
    });
    expect(persistentEffects.getCostReduction('playerA', ['校园'])).toBe(1);
    expect(persistentEffects.getCostReduction('playerA', ['日常'])).toBe(0); // 类型限定

    clearBattleSkillState();
    await runEffect('藤林杏_外硬内软', {
      event: 'afterResolve', playerId: 'playerA', role: 'attacker',
      clash: withRewards(clashOf({ attackerId: 'playerA', defenderId: 'playerB' }), noLoss),
    });
    expect(persistentEffects.getCostReduction('playerA', ['校园'])).toBe(0);
  });
});

// =============================================================
// onPlay：出牌联动
// =============================================================
describe('onPlay 出牌联动被动', () => {
  const play = (effectId: string, tags: string[], rngValues?: number[]) =>
    runEffect(effectId, {
      event: 'onPlay', playerId: 'playerA', role: 'attacker',
      card: animeCard(1, tags),
      ...(rngValues ? { rng: createSequenceRng(rngValues) } : {}),
    });

  it('校园协调：打出校园卡 → 下次技能-1费；非校园不触发', async () => {
    await play('黄前久美子_校园协调', ['校园']);
    expect(persistentEffects.getSkillCostReduction('playerA')).toBe(1);

    clearBattleSkillState();
    await play('黄前久美子_校园协调', ['科幻']);
    expect(persistentEffects.getSkillCostReduction('playerA')).toBe(0);
  });

  it('数据分析：打出科幻卡 → 下张任意卡-1费；非科幻不触发', async () => {
    await play('长门有希_数据分析', ['科幻']);
    expect(persistentEffects.getCostReduction('playerA', ['日常'])).toBe(1); // 不限类型

    clearBattleSkillState();
    await play('长门有希_数据分析', ['日常']);
    expect(persistentEffects.getCostReduction('playerA', ['日常'])).toBe(0);
  });

  it('魔术师血统：奇幻卡 40% 不消耗（弃牌堆回手 + 日志）；不中则留在弃牌堆', async () => {
    const playerStore = usePlayerStore();
    const card = animeCard(1, ['奇幻']);
    playerStore.playerA.discardPile = [card];

    await play('远坂凛_魔术师血统', ['奇幻'], [0.1]);
    expect(playerStore.playerA.hand.map(c => c.id)).toContain(1);
    expect(useHistoryStore().log.some(l => l.includes('不消耗'))).toBe(true);

    playerStore.playerA.hand = [];
    playerStore.playerA.discardPile = [card];
    await play('远坂凛_魔术师血统', ['奇幻'], [0.9]);
    expect(playerStore.playerA.discardPile).toHaveLength(1); // 0.9 ≥ 0.4 不中
  });

  it('魔法精通：奇幻卡被标记视为任意类型；非奇幻不标记', async () => {
    const card = animeCard(5, ['奇幻']) as AnimeCard & { __treatedAsAnyType?: boolean };
    await runEffect('芙莉莲_魔法精通', { event: 'onPlay', playerId: 'playerA', role: 'attacker', card });
    expect(card.__treatedAsAnyType).toBe(true);

    const plain = animeCard(6, ['日常']) as AnimeCard & { __treatedAsAnyType?: boolean };
    await runEffect('芙莉莲_魔法精通', { event: 'onPlay', playerId: 'playerA', role: 'attacker', card: plain });
    expect(plain.__treatedAsAnyType).toBeUndefined();
  });

  it('贵族血统：本回合首张该主类型 → 下次同类型-1费；第2张不再触发', async () => {
    statusEffects.recordPlay('playerA', ['奇幻']); // 当前张（管线在分发前已记录）
    await play('艾莉丝_格雷拉特_贵族血统', ['奇幻']);
    expect(persistentEffects.getCostReduction('playerA', ['奇幻'])).toBe(1);
    expect(persistentEffects.getCostReduction('playerA', ['战斗'])).toBe(0); // 类型限定

    clearBattleSkillState();
    statusEffects.recordPlay('playerA', ['奇幻']);
    statusEffects.recordPlay('playerA', ['奇幻']); // 本回合第2张奇幻
    await play('艾莉丝_格雷拉特_贵族血统', ['奇幻']);
    expect(persistentEffects.getCostReduction('playerA', ['奇幻'])).toBe(0);
  });

  it('天真烂漫：打出恋爱卡 → 下次技能-1费；非恋爱不触发', async () => {
    await play('藤原千花_天真烂漫', ['恋爱']);
    expect(persistentEffects.getSkillCostReduction('playerA')).toBe(1);

    clearBattleSkillState();
    await play('藤原千花_天真烂漫', ['校园']);
    expect(persistentEffects.getSkillCostReduction('playerA')).toBe(0);
  });

  it('未来知识：打出科幻卡 → 下张任意卡+1强度；非科幻不触发', async () => {
    await play('阿万音铃羽_未来知识', ['科幻']);
    expect(persistentEffects.getStrengthBonus('playerA', ['战斗'])).toBe(1); // 不限类型

    clearBattleSkillState();
    await play('阿万音铃羽_未来知识', ['恋爱']);
    expect(persistentEffects.getStrengthBonus('playerA', ['战斗'])).toBe(0);
  });

  it('副团长：打出科幻卡 → 下次恋爱卡-1费；恋爱卡本身不触发', async () => {
    await play('亚丝娜_结城明日奈_副团长', ['科幻']);
    expect(persistentEffects.getCostReduction('playerA', ['恋爱'])).toBe(1);
    expect(persistentEffects.getCostReduction('playerA', ['科幻'])).toBe(0); // 限恋爱

    clearBattleSkillState();
    await play('亚丝娜_结城明日奈_副团长', ['恋爱']);
    expect(persistentEffects.getCostReduction('playerA', ['恋爱'])).toBe(0);
  });

  it('师父照顾：打出奇幻卡 → 紧接的奇幻卡-1费；被非奇幻出牌打断即作废（next-play 严格连续）', async () => {
    await play('菲伦_师父照顾', ['奇幻']);
    expect(persistentEffects.getCostReduction('playerA', ['奇幻'])).toBe(1);
    expect(persistentEffects.getCostReduction('playerA', ['日常'])).toBe(0); // 限奇幻

    // 下一张打了非奇幻：next-play 语义随出牌消费，奇幻减费作废
    persistentEffects.consumeOneShotBonuses('playerA', 'cost', ['日常']);
    expect(persistentEffects.getCostReduction('playerA', ['奇幻'])).toBe(0);

    await play('菲伦_师父照顾', ['日常']);
    expect(persistentEffects.getCostReduction('playerA', ['奇幻'])).toBe(0); // 非奇幻不触发
  });

  it('前偶像：校园→恋爱+1强度、恋爱→校园+1强度（联动）；无关类型不触发', async () => {
    await play('樱岛麻衣_前偶像', ['校园']);
    expect(persistentEffects.getStrengthBonus('playerA', ['恋爱'])).toBe(1);
    expect(persistentEffects.getStrengthBonus('playerA', ['校园'])).toBe(0);

    clearBattleSkillState();
    await play('樱岛麻衣_前偶像', ['恋爱']);
    expect(persistentEffects.getStrengthBonus('playerA', ['校园'])).toBe(1);

    clearBattleSkillState();
    await play('樱岛麻衣_前偶像', ['日常']);
    expect(persistentEffects.getStrengthBonus('playerA', ['恋爱'])).toBe(0);
    expect(persistentEffects.getStrengthBonus('playerA', ['校园'])).toBe(0);
  });

  it('音乐狂热：累计3种不同主类型 → 下张卡-2费，同阈值只发一次；不足3种不触发', async () => {
    statusEffects.recordPlay('playerA', ['科幻']);
    statusEffects.recordPlay('playerA', ['日常']);
    await play('山田凉_音乐狂热', ['日常']);
    expect(persistentEffects.getCostReduction('playerA', ['任意'])).toBe(0); // 仅2种

    statusEffects.recordPlay('playerA', ['战斗']); // 第3种
    await play('山田凉_音乐狂热', ['战斗']);
    expect(persistentEffects.getCostReduction('playerA', ['任意'])).toBe(2);

    await play('山田凉_音乐狂热', ['战斗']); // 同阈值重入 → markOnce 拦截
    expect(persistentEffects.getCostReduction('playerA', ['任意'])).toBe(2);
  });
});

// =============================================================
// beforeResolve：强度注入
// =============================================================
describe('beforeResolve 强度注入被动', () => {
  const collect = () => {
    const bonuses: Array<[string, number]> = [];
    const add = (side: 'attacker' | 'defender', n: number) => bonuses.push([side, n]);
    return { bonuses, add };
  };

  it('骑士守护：声望≤15 的守方+1强度；声望充足或攻方不触发', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.reputation = 12;
    const { bonuses, add } = collect();
    await runEffect('阿尔托莉雅_潘德拉贡_骑士守护', {
      event: 'beforeResolve', playerId: 'playerA', role: 'defender',
      card: animeCard(1), clash: clashOf(), addStrengthBonus: add,
    });
    expect(bonuses).toContainEqual(['defender', 1]);

    playerStore.playerA.reputation = 30;
    const high = collect();
    await runEffect('阿尔托莉雅_潘德拉贡_骑士守护', {
      event: 'beforeResolve', playerId: 'playerA', role: 'defender',
      card: animeCard(1), clash: clashOf(), addStrengthBonus: high.add,
    });
    expect(high.bonuses).toHaveLength(0);

    playerStore.playerA.reputation = 12;
    const atk = collect();
    await runEffect('阿尔托莉雅_潘德拉贡_骑士守护', {
      event: 'beforeResolve', playerId: 'playerA', role: 'attacker',
      card: animeCard(1), clash: clashOf({ attackerId: 'playerA', defenderId: 'playerB' }), addStrengthBonus: atk.add,
    });
    expect(atk.bonuses).toHaveLength(0); // 仅防守生效
  });

  it('零的存在：议题偏向=0 时+1强度；偏向≠0 不触发', async () => {
    const { bonuses, add } = collect();
    await runEffect('绫波丽_零的存在', {
      event: 'beforeResolve', playerId: 'playerA', role: 'attacker',
      card: animeCard(1), clash: clashOf(), addStrengthBonus: add,
    });
    expect(bonuses).toContainEqual(['attacker', 1]);

    useGameStore().topicBias = 2;
    const biased = collect();
    await runEffect('绫波丽_零的存在', {
      event: 'beforeResolve', playerId: 'playerA', role: 'attacker',
      card: animeCard(1), clash: clashOf(), addStrengthBonus: biased.add,
    });
    expect(biased.bonuses).toHaveLength(0);
  });

  it('优等生：本回合第一张出牌+1强度；第二张不触发（设计自「抽取的第一张」改为「打出的第一张」）', async () => {
    statusEffects.recordPlay('playerA', ['科幻']); // 第一张（计数已含当前张）
    const { bonuses, add } = collect();
    await runEffect('雪之下雪乃_优等生', {
      event: 'beforeResolve', playerId: 'playerA', role: 'attacker',
      card: animeCard(1, ['科幻']), clash: clashOf(), addStrengthBonus: add,
    });
    expect(bonuses).toContainEqual(['attacker', 1]);

    statusEffects.recordPlay('playerA', ['日常']); // 第二张
    const second = collect();
    await runEffect('雪之下雪乃_优等生', {
      event: 'beforeResolve', playerId: 'playerA', role: 'attacker',
      card: animeCard(2, ['日常']), clash: clashOf(), addStrengthBonus: second.add,
    });
    expect(second.bonuses).toHaveLength(0);
  });

  it('义体强化：科幻卡进攻 → 压制守方本次对撞光环；非科幻或守方角色不触发', async () => {
    await runEffect('草薙素子_义体强化', {
      event: 'beforeResolve', playerId: 'playerA', role: 'attacker',
      card: animeCard(1, ['科幻']),
      clash: clashOf({ attackerId: 'playerA', defenderId: 'playerB' }),
    });
    expect(statusEffects.consumeAuraSuppression('playerB')).toBe(true);

    await runEffect('草薙素子_义体强化', {
      event: 'beforeResolve', playerId: 'playerA', role: 'attacker',
      card: animeCard(1, ['战斗']),
      clash: clashOf({ attackerId: 'playerA', defenderId: 'playerB' }),
    });
    expect(statusEffects.consumeAuraSuppression('playerB')).toBe(false); // 非科幻

    await runEffect('草薙素子_义体强化', {
      event: 'beforeResolve', playerId: 'playerA', role: 'defender',
      card: animeCard(1, ['科幻']), clash: clashOf(),
    });
    expect(statusEffects.consumeAuraSuppression('playerB')).toBe(false); // 守方不触发
  });
});

// =============================================================
// turnStart / turnEnd：回合钩子
// =============================================================
describe('turnStart / turnEnd 回合钩子被动', () => {
  it('不老传说：回合开始冷却额外-1（归零移除）；其他事件不触发', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.skillCooldowns = { 技能a: 2, 技能b: 1 };
    await runEffect('忍野忍_不老传说', { event: 'turnStart', playerId: 'playerA', role: 'attacker' });
    expect(playerStore.playerA.skillCooldowns).toEqual({ 技能a: 1 });

    await runEffect('忍野忍_不老传说', { event: 'onPlay', playerId: 'playerA', role: 'attacker', card: animeCard(1) });
    expect(playerStore.playerA.skillCooldowns).toEqual({ 技能a: 1 }); // 事件守卫
  });

  it('领导魅力：偏向利己（A≥0）→ 冷却-1；不利己不触发；B 方向相反', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.skillCooldowns = { 技能a: 2 };
    await runEffect('坂上智代_领导魅力', { event: 'turnStart', playerId: 'playerA', role: 'attacker' });
    expect(playerStore.playerA.skillCooldowns).toEqual({ 技能a: 1 }); // bias 0 视为利己

    useGameStore().topicBias = -2;
    await runEffect('坂上智代_领导魅力', { event: 'turnStart', playerId: 'playerA', role: 'attacker' });
    expect(playerStore.playerA.skillCooldowns).toEqual({ 技能a: 1 }); // A 处劣势不触发

    playerStore.playerB.skillCooldowns = { 技能x: 2 };
    await runEffect('坂上智代_领导魅力', { event: 'turnStart', playerId: 'playerB', role: 'attacker' });
    expect(playerStore.playerB.skillCooldowns).toEqual({ 技能x: 1 }); // bias -2 对 B 利己
  });

  it('理智思考：回合开始挂「第一张牌-1费」；其他事件不触发', async () => {
    await runEffect('明石_理智思考', { event: 'turnStart', playerId: 'playerA', role: 'attacker' });
    expect(persistentEffects.getCostReduction('playerA', ['随便'])).toBe(1);

    clearBattleSkillState();
    await runEffect('明石_理智思考', { event: 'onPlay', playerId: 'playerA', role: 'attacker', card: animeCard(1) });
    expect(persistentEffects.getCostReduction('playerA', ['随便'])).toBe(0);
  });

  it('省力主义：回合结束未出牌 → 下张卡-1费；出过牌不触发', async () => {
    await runEffect('折木奉太郎_省力主义', { event: 'turnEnd', playerId: 'playerA', role: 'attacker' });
    expect(persistentEffects.getCostReduction('playerA', ['任意'])).toBe(1);

    clearBattleSkillState();
    statusEffects.recordPlay('playerA', ['日常']);
    await runEffect('折木奉太郎_省力主义', { event: 'turnEnd', playerId: 'playerA', role: 'attacker' });
    expect(persistentEffects.getCostReduction('playerA', ['任意'])).toBe(0);
  });
});

// =============================================================
// onSkillUsed：技能响应
// =============================================================
describe('onSkillUsed 技能响应被动', () => {
  it('电磁干扰：对手用技能 25% 冷却+1（无冷却记录按 0 起算）；不中或己方使用不触发', async () => {
    const playerStore = usePlayerStore();
    playerStore.setSkillCooldown('playerB', '技能X', 2);

    await runEffect('御坂美琴_电磁干扰', {
      event: 'onSkillUsed', playerId: 'playerA', role: 'defender',
      skill: skillOf('技能X', '主动技能'), skillUserId: 'playerB', rng: createSequenceRng([0.1]),
    });
    expect(playerStore.playerB.skillCooldowns['技能X']).toBe(3); // 2+1

    await runEffect('御坂美琴_电磁干扰', {
      event: 'onSkillUsed', playerId: 'playerA', role: 'defender',
      skill: skillOf('技能X', '主动技能'), skillUserId: 'playerB', rng: createSequenceRng([0.9]),
    });
    expect(playerStore.playerB.skillCooldowns['技能X']).toBe(3); // 0.9 ≥ 0.25 不中

    playerStore.setSkillCooldown('playerA', '技能Y', 2);
    await runEffect('御坂美琴_电磁干扰', {
      event: 'onSkillUsed', playerId: 'playerA', role: 'attacker',
      skill: skillOf('技能Y', '主动技能'), skillUserId: 'playerA', rng: createSequenceRng([0.1]),
    });
    expect(playerStore.playerA.skillCooldowns['技能Y']).toBe(2); // 己方使用不干扰
  });

  it('团队协调：己方用技能 → 全队冷却-1（含刚用技能新上的冷却）；对手用技能不触发', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.skillCooldowns = { 刚用的技能: 3, 其他技能: 1 };
    await runEffect('伊地知虹夏_团队协调', {
      event: 'onSkillUsed', playerId: 'playerA', role: 'attacker',
      skill: skillOf('刚用的技能', '主动技能'), skillUserId: 'playerA',
    });
    expect(playerStore.playerA.skillCooldowns).toEqual({ 刚用的技能: 2 }); // 其他技能 1→0 移除

    await runEffect('伊地知虹夏_团队协调', {
      event: 'onSkillUsed', playerId: 'playerA', role: 'defender',
      skill: skillOf('对手技能', '主动技能'), skillUserId: 'playerB',
    });
    expect(playerStore.playerA.skillCooldowns).toEqual({ 刚用的技能: 2 }); // 对手使用不触发
  });

  it('皇族智谋：己方用技能 → 下张卡+1强度；对手用技能不触发', async () => {
    await runEffect('鲁路修_兰佩路基_皇族智谋', {
      event: 'onSkillUsed', playerId: 'playerA', role: 'attacker',
      skill: skillOf('某技能', '主动技能'), skillUserId: 'playerA',
    });
    expect(persistentEffects.getStrengthBonus('playerA', ['任意'])).toBe(1);

    clearBattleSkillState();
    await runEffect('鲁路修_兰佩路基_皇族智谋', {
      event: 'onSkillUsed', playerId: 'playerA', role: 'defender',
      skill: skillOf('某技能', '主动技能'), skillUserId: 'playerB',
    });
    expect(persistentEffects.getStrengthBonus('playerA', ['任意'])).toBe(0);
  });
});

// =============================================================
// costModifiers：条件减费（取费瞬间判定）
// =============================================================
describe('costModifiers 条件减费', () => {
  const equip = (playerId: PlayerId, effectId: string) => {
    const playerStore = usePlayerStore();
    playerStore[playerId].characters = [charWith([skillOf(effectId)])];
    playerStore[playerId].activeCharacterIndex = 0;
  };

  it('驾驶员骄傲：偏向≥3 全卡-1费；不足不触发；B 按反向偏向判定', () => {
    equip('playerA', '惣流_明日香_兰格雷_驾驶员骄傲');
    useGameStore().topicBias = 3;
    expect(passiveCostReduction('playerA', animeCard(1, ['科幻'], 3))).toBe(1);

    useGameStore().topicBias = 2;
    expect(passiveCostReduction('playerA', animeCard(1, ['科幻'], 3))).toBe(0);

    equip('playerB', '惣流_明日香_兰格雷_驾驶员骄傲');
    useGameStore().topicBias = -3;
    expect(passiveCostReduction('playerB', animeCard(1, [], 3))).toBe(1);
    useGameStore().topicBias = 3;
    expect(passiveCostReduction('playerB', animeCard(1, [], 3))).toBe(0);
  });

  it('万事屋精神：手牌主类型≥3种 → 全卡-1费；仅2种不触发', () => {
    equip('playerA', '坂田银时_万事屋精神');
    const playerStore = usePlayerStore();
    playerStore.playerA.hand = [animeCard(1, ['科幻']), animeCard(2, ['日常']), animeCard(3, ['战斗', 'TV'])];
    expect(passiveCostReduction('playerA', animeCard(9, ['恋爱'], 2))).toBe(1);

    playerStore.playerA.hand = [animeCard(1, ['科幻']), animeCard(2, ['科幻']), animeCard(3, ['战斗'])];
    expect(passiveCostReduction('playerA', animeCard(9, ['恋爱'], 2))).toBe(0);
  });

  it('后辈努力：己方 TP 落后时音乐卡-1费；非音乐或 TP 不落后不触发', () => {
    equip('playerA', '中野梓_后辈努力');
    const playerStore = usePlayerStore();
    playerStore.playerA.tp = 2;
    playerStore.playerB.tp = 5;
    expect(passiveCostReduction('playerA', animeCard(1, ['音乐'], 2))).toBe(1);
    expect(passiveCostReduction('playerA', animeCard(1, ['科幻'], 2))).toBe(0); // 非音乐

    playerStore.playerA.tp = 5;
    expect(passiveCostReduction('playerA', animeCard(1, ['音乐'], 2))).toBe(0); // TP 持平
  });

  it('逃避现实：声望≤15 全卡-1费；16 不触发', () => {
    equip('playerA', '碇真嗣_逃避现实');
    const playerStore = usePlayerStore();
    playerStore.playerA.reputation = 15;
    expect(passiveCostReduction('playerA', animeCard(1, [], 2))).toBe(1);

    playerStore.playerA.reputation = 16;
    expect(passiveCostReduction('playerA', animeCard(1, [], 2))).toBe(0);
  });

  it('银发王选：偏向=0 时奇幻卡-1费；非奇幻或偏向≠0 不触发', () => {
    equip('playerA', '艾米莉娅_银发王选');
    useGameStore().topicBias = 0;
    expect(passiveCostReduction('playerA', animeCard(1, ['奇幻'], 2))).toBe(1);
    expect(passiveCostReduction('playerA', animeCard(1, ['日常'], 2))).toBe(0);

    useGameStore().topicBias = 1;
    expect(passiveCostReduction('playerA', animeCard(1, ['奇幻'], 2))).toBe(0);
  });

  it('playerCardCost：卡面费 − 追踪器减费 − 条件被动减费，下限 0', () => {
    equip('playerA', '碇真嗣_逃避现实');
    usePlayerStore().playerA.reputation = 10;
    expect(playerCardCost('playerA', animeCard(1, ['科幻'], 3))).toBe(2); // 3−1

    persistentEffects.addCardTypeCostReduction('playerA', '科幻', 1, 1);
    expect(playerCardCost('playerA', animeCard(1, ['科幻'], 3))).toBe(1); // 3−1−1
    expect(playerCardCost('playerA', animeCard(2, ['科幻'], 1))).toBe(0); // 下限 0
  });
});

describe('蕾塞（新增 UR）致命诱饵', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    clearBattleSkillState();
  });

  it('打出战斗卡 → 对手下张卡牌-1强度（一次性）；非战斗卡不触发', async () => {
    await runEffect('蕾塞_致命诱饵', { event: 'onPlay', playerId: 'playerA', role: 'attacker', card: animeCard(1, ['战斗']) });
    expect(persistentEffects.getStrengthBonus('playerB', ['战斗'])).toBe(-1);
    persistentEffects.consumeOneShotBonuses('playerB', 'strength', ['战斗']);
    expect(persistentEffects.getStrengthBonus('playerB', ['战斗'])).toBe(0);

    await runEffect('蕾塞_致命诱饵', { event: 'onPlay', playerId: 'playerA', role: 'attacker', card: animeCard(2, ['日常']) });
    expect(persistentEffects.getStrengthBonus('playerB', ['日常'])).toBe(0);
  });
});
