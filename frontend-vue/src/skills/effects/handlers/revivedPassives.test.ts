/**
 * S8b 复活批被动测试：16 个 S8a 降级技能按正确机制复活后的触发与守卫语义。
 * 经 runEffect 直接调 effectId（被动管线分发本身由 runtime.test 锁定，末尾留一条冒烟）；
 * 概率分支一律注入 createSequenceRng 锁定；turnStart 的 TP 奖励断言溢出上限生效。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { runEffect } from '@/skills/effects';
import { SkillSystem } from '@/skills/runtime';
import { statusEffects, clearBattleSkillState } from '@/skills/systems';
import { usePlayerStore, useGameStore, useHistoryStore } from '@/stores/battle';
import { createSequenceRng } from '@/engine';
import type { Skill } from '@/types/skill';
import type { AnimeCard, CharacterCard } from '@/types/card';
import type { ClashInfo } from '@/types/battle';

const animeCard = (id: number, tags: string[] = [], cost = 1): AnimeCard =>
  ({ id, name: `卡${id}`, cost, points: 3, synergy_tags: tags }) as unknown as AnimeCard;

const skillOf = (id: string, type: '主动技能' | '被动光环' = '被动光环', extra: Partial<Skill> = {}): Skill =>
  ({ id, name: id, type, description: '', effectId: id, ...extra }) as Skill;

const charWith = (skills: Skill[]): CharacterCard =>
  ({ id: 1, name: '测试角色', rarity: 'UR', skills }) as unknown as CharacterCard;

interface ClashRewards {
  attackerReputationChange: number;
  defenderReputationChange: number;
  topicBiasChange: number;
}

const clashWithRewards = (rewards: Partial<ClashRewards> | null): ClashInfo =>
  ({
    attackerId: 'playerA',
    defenderId: 'playerB',
    attackingCard: animeCard(1, ['战斗']),
    attackStyle: '友好安利',
    ...(rewards
      ? { rewards: { attackerReputationChange: 0, defenderReputationChange: 0, topicBiasChange: 0, ...rewards } }
      : {}),
  }) as unknown as ClashInfo;

beforeEach(() => {
  setActivePinia(createPinia());
  clearBattleSkillState(); // 共享追踪器是模块级单例，逐测清场
});

describe('turnStart 被动（TP 奖励须溢出 maxTp 上限）', () => {
  it('人气者：30% 概率+1TP，溢出上限生效；概率失败不动', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.tp = 2;
    playerStore.playerA.maxTp = 2; // 回合开始 TP 已回满的状态

    await runEffect('八奈见杏菜_人气者', {
      event: 'turnStart', playerId: 'playerA', role: 'attacker', rng: createSequenceRng([0.1]),
    });
    expect(playerStore.playerA.tp).toBe(3); // 0.1 < 0.3 → +1，且超过 maxTp=2（溢出生效）

    await runEffect('八奈见杏菜_人气者', {
      event: 'turnStart', playerId: 'playerA', role: 'attacker', rng: createSequenceRng([0.9]),
    });
    expect(playerStore.playerA.tp).toBe(3); // 0.9 ≥ 0.3 → 不触发
  });

  it('人气者：事件不对（onPlay）即使概率命中也不触发', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.tp = 2;
    await runEffect('八奈见杏菜_人气者', {
      event: 'onPlay', playerId: 'playerA', role: 'attacker', rng: createSequenceRng([0.1]),
    });
    expect(playerStore.playerA.tp).toBe(2);
  });

  it('不死之身：声望<10 回合开始+2；声望=10（边界）不触发', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.reputation = 9;
    await runEffect('CC_不死之身', { event: 'turnStart', playerId: 'playerA', role: 'attacker' });
    expect(playerStore.playerA.reputation).toBe(11);

    playerStore.playerA.reputation = 10;
    await runEffect('CC_不死之身', { event: 'turnStart', playerId: 'playerA', role: 'attacker' });
    expect(playerStore.playerA.reputation).toBe(10);
  });

  it('阳光魅力：偏向利己（A 视角 >0）时+1TP（溢出）；偏向 0 或不利不触发', async () => {
    const playerStore = usePlayerStore();
    const gameStore = useGameStore();
    playerStore.playerA.tp = 2;
    playerStore.playerA.maxTp = 2;

    gameStore.topicBias = 3;
    await runEffect('喜多郁代_阳光魅力', { event: 'turnStart', playerId: 'playerA', role: 'attacker' });
    expect(playerStore.playerA.tp).toBe(3);

    gameStore.topicBias = 0;
    await runEffect('喜多郁代_阳光魅力', { event: 'turnStart', playerId: 'playerA', role: 'attacker' });
    expect(playerStore.playerA.tp).toBe(3);

    gameStore.topicBias = -2;
    await runEffect('喜多郁代_阳光魅力', { event: 'turnStart', playerId: 'playerA', role: 'attacker' });
    expect(playerStore.playerA.tp).toBe(3);
  });

  it('世渡り上手：playerB 视角偏向 <0 为利己', async () => {
    const playerStore = usePlayerStore();
    const gameStore = useGameStore();
    playerStore.playerB.tp = 2;
    playerStore.playerB.maxTp = 2;

    gameStore.topicBias = -1;
    await runEffect('安和昴_世渡_上手', { event: 'turnStart', playerId: 'playerB', role: 'attacker' });
    expect(playerStore.playerB.tp).toBe(3); // 溢出上限

    gameStore.topicBias = 2; // 对 B 不利
    await runEffect('安和昴_世渡_上手', { event: 'turnStart', playerId: 'playerB', role: 'attacker' });
    expect(playerStore.playerB.tp).toBe(3);
  });

  it('温柔体贴：双方声望差≥5 时+1TP（溢出）；差<5 不触发', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.tp = 2;
    playerStore.playerA.maxTp = 2;
    playerStore.playerA.reputation = 30;
    playerStore.playerB.reputation = 25; // 差恰为 5

    await runEffect('由比滨结衣_温柔体贴', { event: 'turnStart', playerId: 'playerA', role: 'attacker' });
    expect(playerStore.playerA.tp).toBe(3);

    playerStore.playerB.reputation = 27; // 差 3
    await runEffect('由比滨结衣_温柔体贴', { event: 'turnStart', playerId: 'playerA', role: 'attacker' });
    expect(playerStore.playerA.tp).toBe(3);
  });

  it('温柔鼓励：声望≤20 时+1TP（溢出）；21 不触发', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.tp = 2;
    playerStore.playerA.maxTp = 2;
    playerStore.playerA.reputation = 20;

    await runEffect('古河渚_温柔鼓励', { event: 'turnStart', playerId: 'playerA', role: 'attacker' });
    expect(playerStore.playerA.tp).toBe(3);

    playerStore.playerA.reputation = 21;
    await runEffect('古河渚_温柔鼓励', { event: 'turnStart', playerId: 'playerA', role: 'attacker' });
    expect(playerStore.playerA.tp).toBe(3);
  });

  it('隐居创作：手牌少于对手时抽1；持平后不再抽（口径为手牌数而非 TP）', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.hand = [animeCard(1)];
    playerStore.playerA.deck = [animeCard(11), animeCard(12)];
    playerStore.playerB.hand = [animeCard(21), animeCard(22)];

    await runEffect('后藤一里_隐居创作', { event: 'turnStart', playerId: 'playerA', role: 'attacker' });
    expect(playerStore.playerA.hand).toHaveLength(2);
    expect(playerStore.playerA.deck).toHaveLength(1);

    await runEffect('后藤一里_隐居创作', { event: 'turnStart', playerId: 'playerA', role: 'attacker' });
    expect(playerStore.playerA.hand).toHaveLength(2); // 2 vs 2 持平 → 不抽
  });
});

describe('beforeResolve 被动（强度经 addStrengthBonus 注入）', () => {
  const collector = () => {
    const bonuses: Array<[string, number]> = [];
    const add = (side: 'attacker' | 'defender', amount: number) => bonuses.push([side, amount]);
    return { bonuses, add };
  };

  it('天然直觉：本回合第一张音乐卡+1；第二张不再触发', async () => {
    const { bonuses, add } = collector();
    statusEffects.recordPlay('playerA', ['音乐', 'TV']); // 当前牌已计入
    await runEffect('平泽唯_天然直觉', {
      event: 'beforeResolve', playerId: 'playerA', role: 'attacker',
      card: animeCard(1, ['音乐', 'TV']), addStrengthBonus: add,
    });
    expect(bonuses).toEqual([['attacker', 1]]);

    statusEffects.recordPlay('playerA', ['音乐']);
    await runEffect('平泽唯_天然直觉', {
      event: 'beforeResolve', playerId: 'playerA', role: 'attacker',
      card: animeCard(2, ['音乐']), addStrengthBonus: add,
    });
    expect(bonuses).toEqual([['attacker', 1]]); // 音乐计数=2 → 静默
  });

  it('天然直觉：非音乐卡不触发；事件不对不触发', async () => {
    const { bonuses, add } = collector();
    statusEffects.recordPlay('playerA', ['日常']);
    await runEffect('平泽唯_天然直觉', {
      event: 'beforeResolve', playerId: 'playerA', role: 'attacker',
      card: animeCard(1, ['日常']), addStrengthBonus: add,
    });
    expect(bonuses).toHaveLength(0);

    statusEffects.recordPlay('playerA', ['音乐']);
    await runEffect('平泽唯_天然直觉', {
      event: 'onPlay', playerId: 'playerA', role: 'attacker',
      card: animeCard(2, ['音乐']), addStrengthBonus: add,
    });
    expect(bonuses).toHaveLength(0); // 事件守卫
  });

  it('音乐世家：本回合第一张校园卡+2（守方注入到 defender 侧）；第二张不触发', async () => {
    const { bonuses, add } = collector();
    statusEffects.recordPlay('playerB', ['校园']);
    await runEffect('高坂丽奈_音乐世家', {
      event: 'beforeResolve', playerId: 'playerB', role: 'defender',
      card: animeCard(1, ['校园']), addStrengthBonus: add,
    });
    expect(bonuses).toEqual([['defender', 2]]);

    statusEffects.recordPlay('playerB', ['校园']);
    await runEffect('高坂丽奈_音乐世家', {
      event: 'beforeResolve', playerId: 'playerB', role: 'defender',
      card: animeCard(2, ['校园']), addStrengthBonus: add,
    });
    expect(bonuses).toHaveLength(1);
  });

  it('音乐世家：校园为副标签（主类型≠校园）时计数为 0 → 不触发', async () => {
    const { bonuses, add } = collector();
    statusEffects.recordPlay('playerA', ['音乐', '校园']); // 主类型=音乐
    await runEffect('高坂丽奈_音乐世家', {
      event: 'beforeResolve', playerId: 'playerA', role: 'attacker',
      card: animeCard(1, ['音乐', '校园']), addStrengthBonus: add,
    });
    expect(bonuses).toHaveLength(0); // 校园主类型计数=0 ≠ 1
  });

  it('团队合作：第2/第3张且类型全新+1；第1张与第4张不触发', async () => {
    const { bonuses, add } = collector();
    const run = (card: AnimeCard) =>
      runEffect('宫森葵_团队合作', {
        event: 'beforeResolve', playerId: 'playerA', role: 'attacker', card, addStrengthBonus: add,
      });

    statusEffects.recordPlay('playerA', ['日常']);
    await run(animeCard(1, ['日常']));
    expect(bonuses).toHaveLength(0); // 第1张

    statusEffects.recordPlay('playerA', ['音乐']);
    await run(animeCard(2, ['音乐']));
    expect(bonuses).toEqual([['attacker', 1]]); // 第2张，全新类型

    statusEffects.recordPlay('playerA', ['科幻']);
    await run(animeCard(3, ['科幻']));
    expect(bonuses).toEqual([['attacker', 1], ['attacker', 1]]); // 第3张，全新类型

    statusEffects.recordPlay('playerA', ['运动']);
    await run(animeCard(4, ['运动']));
    expect(bonuses).toHaveLength(2); // 第4张超出区间
  });

  it('团队合作：第2张与第1张同类型不触发', async () => {
    const { bonuses, add } = collector();
    statusEffects.recordPlay('playerA', ['日常']);
    statusEffects.recordPlay('playerA', ['日常']);
    await runEffect('宫森葵_团队合作', {
      event: 'beforeResolve', playerId: 'playerA', role: 'attacker',
      card: animeCard(2, ['日常']), addStrengthBonus: add,
    });
    expect(bonuses).toHaveLength(0);
  });

  it('双子感应：回合内连续两张同主类型+2；单张/跨回合不算', async () => {
    const { bonuses, add } = collector();
    const run = (card: AnimeCard) =>
      runEffect('柊镜_双子感应', {
        event: 'beforeResolve', playerId: 'playerA', role: 'attacker', card, addStrengthBonus: add,
      });

    statusEffects.recordPlay('playerA', ['音乐']);
    await run(animeCard(1, ['音乐']));
    expect(bonuses).toHaveLength(0); // 回合内仅 1 张

    statusEffects.recordPlay('playerA', ['音乐']);
    await run(animeCard(2, ['音乐']));
    expect(bonuses).toEqual([['attacker', 2]]); // 连续同类型

    statusEffects.resetTurnCounters('playerA'); // 新回合
    statusEffects.recordPlay('playerA', ['音乐']);
    await run(animeCard(3, ['音乐']));
    expect(bonuses).toHaveLength(1); // 跨回合不算（回合内口径）
  });

  it('双子感应：末两张类型不同不触发', async () => {
    const { bonuses, add } = collector();
    statusEffects.recordPlay('playerA', ['日常']);
    statusEffects.recordPlay('playerA', ['音乐']);
    await runEffect('柊镜_双子感应', {
      event: 'beforeResolve', playerId: 'playerA', role: 'attacker',
      card: animeCard(2, ['音乐']), addStrengthBonus: add,
    });
    expect(bonuses).toHaveLength(0);
  });
});

describe('onPlay 被动', () => {
  it('丰收之神：累计满 3 种主类型抽1（同档不重发），满 6 种再抽', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.hand = [];
    playerStore.playerA.deck = [animeCard(11), animeCard(12), animeCard(13), animeCard(14)];
    const run = (card: AnimeCard) =>
      runEffect('赫萝_丰收之神', { event: 'onPlay', playerId: 'playerA', role: 'attacker', card });

    statusEffects.recordPlay('playerA', ['日常']);
    statusEffects.recordPlay('playerA', ['音乐']);
    await run(animeCard(2, ['音乐']));
    expect(playerStore.playerA.hand).toHaveLength(0); // 2 种 → 未达阈值

    statusEffects.recordPlay('playerA', ['科幻']);
    await run(animeCard(3, ['科幻']));
    expect(playerStore.playerA.hand).toHaveLength(1); // 3 种 → 抽1

    await run(animeCard(4, ['科幻']));
    expect(playerStore.playerA.hand).toHaveLength(1); // 同档（丰收_1）不重发

    statusEffects.recordPlay('playerA', ['奇幻']);
    statusEffects.recordPlay('playerA', ['运动']);
    await run(animeCard(5, ['运动']));
    expect(playerStore.playerA.hand).toHaveLength(1); // 5 种仍在丰收_1 档

    statusEffects.recordPlay('playerA', ['战斗']);
    await run(animeCard(6, ['战斗']));
    expect(playerStore.playerA.hand).toHaveLength(2); // 6 种 → 丰收_2 档再抽
  });

  it('丰收之神：事件不对（turnStart）不触发', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.hand = [];
    playerStore.playerA.deck = [animeCard(11)];
    statusEffects.recordPlay('playerA', ['日常']);
    statusEffects.recordPlay('playerA', ['音乐']);
    statusEffects.recordPlay('playerA', ['科幻']);
    await runEffect('赫萝_丰收之神', { event: 'turnStart', playerId: 'playerA', role: 'attacker' });
    expect(playerStore.playerA.hand).toHaveLength(0);
  });
});

describe('afterResolve 被动（结算数据经 clash.rewards）', () => {
  it('赏金猎人：攻方造成对手声望损失时 40% +1TP（溢出）；概率失败/无损失不触发', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.tp = 2;
    playerStore.playerA.maxTp = 2;

    await runEffect('史派克_斯皮格尔_赏金猎人', {
      event: 'afterResolve', playerId: 'playerA', role: 'attacker',
      clash: clashWithRewards({ defenderReputationChange: -3 }), rng: createSequenceRng([0.1]),
    });
    expect(playerStore.playerA.tp).toBe(3); // 0.1 < 0.4，溢出上限

    await runEffect('史派克_斯皮格尔_赏金猎人', {
      event: 'afterResolve', playerId: 'playerA', role: 'attacker',
      clash: clashWithRewards({ defenderReputationChange: -3 }), rng: createSequenceRng([0.9]),
    });
    expect(playerStore.playerA.tp).toBe(3); // 概率失败

    await runEffect('史派克_斯皮格尔_赏金猎人', {
      event: 'afterResolve', playerId: 'playerA', role: 'attacker',
      clash: clashWithRewards({ defenderReputationChange: 0 }), rng: createSequenceRng([0.1]),
    });
    expect(playerStore.playerA.tp).toBe(3); // 对手无声望损失
  });

  it('赏金猎人：守方视角看 attackerReputationChange；缺 rewards 数据静默', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerB.tp = 2;
    playerStore.playerB.maxTp = 2;

    await runEffect('史派克_斯皮格尔_赏金猎人', {
      event: 'afterResolve', playerId: 'playerB', role: 'defender',
      clash: clashWithRewards({ attackerReputationChange: -4 }), rng: createSequenceRng([0.1]),
    });
    expect(playerStore.playerB.tp).toBe(3);

    await runEffect('史派克_斯皮格尔_赏金猎人', {
      event: 'afterResolve', playerId: 'playerB', role: 'defender',
      clash: clashWithRewards(null), rng: createSequenceRng([0.1]),
    });
    expect(playerStore.playerB.tp).toBe(3); // 无 rewards → 守卫直接返回
  });

  it('螺旋公主：偏向朝己方有利变动时同方向再推1点；不利或零变动不触发', async () => {
    const gameStore = useGameStore();
    gameStore.topicBias = 0;

    await runEffect('妮亚_螺旋公主', {
      event: 'afterResolve', playerId: 'playerA', role: 'attacker',
      clash: clashWithRewards({ topicBiasChange: 2 }),
    });
    expect(gameStore.topicBias).toBe(1); // A 有利（>0）→ 追加 +1

    await runEffect('妮亚_螺旋公主', {
      event: 'afterResolve', playerId: 'playerA', role: 'attacker',
      clash: clashWithRewards({ topicBiasChange: -1 }),
    });
    expect(gameStore.topicBias).toBe(1); // 对 A 不利 → 不动

    await runEffect('妮亚_螺旋公主', {
      event: 'afterResolve', playerId: 'playerB', role: 'defender',
      clash: clashWithRewards({ topicBiasChange: -2 }),
    });
    expect(gameStore.topicBias).toBe(0); // B 有利（<0）→ 追加 −1

    await runEffect('妮亚_螺旋公主', {
      event: 'afterResolve', playerId: 'playerB', role: 'defender',
      clash: clashWithRewards({ topicBiasChange: 0 }),
    });
    expect(gameStore.topicBias).toBe(0); // 零变动 → 不动
  });
});

describe('onSkillUsed 被动（playerId=持有者，skillUserId=使用者）', () => {
  const oppSkill = skillOf('某主动技', '主动技能');

  it('天然黑洞：对手用技能 30% +1TP（溢出）；概率失败/自己用技能不触发', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.tp = 2;
    playerStore.playerA.maxTp = 2;

    await runEffect('椎名真由理_天然黑洞', {
      event: 'onSkillUsed', playerId: 'playerA', role: 'defender',
      skill: oppSkill, skillUserId: 'playerB', rng: createSequenceRng([0.1]),
    });
    expect(playerStore.playerA.tp).toBe(3); // 溢出上限

    await runEffect('椎名真由理_天然黑洞', {
      event: 'onSkillUsed', playerId: 'playerA', role: 'defender',
      skill: oppSkill, skillUserId: 'playerB', rng: createSequenceRng([0.9]),
    });
    expect(playerStore.playerA.tp).toBe(3); // 概率失败

    await runEffect('椎名真由理_天然黑洞', {
      event: 'onSkillUsed', playerId: 'playerA', role: 'attacker',
      skill: oppSkill, skillUserId: 'playerA', rng: createSequenceRng([0.1]),
    });
    expect(playerStore.playerA.tp).toBe(3); // 自己用的技能不算
  });

  it('沉默威严：对手用技能 20% 给使用者落无效化旗并记日志；失败/自用不落旗', async () => {
    await runEffect('立华奏_沉默威严', {
      event: 'onSkillUsed', playerId: 'playerA', role: 'defender',
      skill: oppSkill, skillUserId: 'playerB', rng: createSequenceRng([0.1]),
    });
    expect(statusEffects.consumeSkillNegation('playerB')).toBe(true); // 旗在使用者头上
    expect(useHistoryStore().log.some(l => l.includes('沉默威严：技能被无效化！'))).toBe(true);

    await runEffect('立华奏_沉默威严', {
      event: 'onSkillUsed', playerId: 'playerA', role: 'defender',
      skill: oppSkill, skillUserId: 'playerB', rng: createSequenceRng([0.9]),
    });
    expect(statusEffects.consumeSkillNegation('playerB')).toBe(false); // 概率失败

    await runEffect('立华奏_沉默威严', {
      event: 'onSkillUsed', playerId: 'playerA', role: 'attacker',
      skill: oppSkill, skillUserId: 'playerA', rng: createSequenceRng([0.1]),
    });
    expect(statusEffects.consumeSkillNegation('playerA')).toBe(false); // 自己的技能不无效化
  });
});

describe('管线冒烟（复活后经被动管线真实分发）', () => {
  it('emitTurnStart：主辩手携不死之身、声望<10 → +2', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.characters = [charWith([skillOf('CC_不死之身')])];
    playerStore.playerA.activeCharacterIndex = 0;
    playerStore.playerA.reputation = 5;

    await SkillSystem.emitTurnStart('playerA');
    expect(playerStore.playerA.reputation).toBe(7);
  });
});
