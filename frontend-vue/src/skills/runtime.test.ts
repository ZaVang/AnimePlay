/**
 * 技能运行时钩子测试（S8a）：禁技消费、被动光环管线（首次接通）、
 * #36/#37 新增真实现技能、诚实化判定。完整编排链路（battleFlow 钳制/扣费）靠手测，
 * 这里锁定 runtime 层的分发与守卫语义。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { SkillSystem } from './runtime';
import { runEffect, isSkillImplemented } from './effects';
import { persistentEffects, clearBattleSkillState } from './systems';
import { usePlayerStore } from '@/stores/battle';
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

beforeEach(() => {
  setActivePinia(createPinia());
  clearBattleSkillState(); // 共享追踪器是模块级单例，逐测清场
});

describe('canUseSkill 消费禁技限制（S8a）', () => {
  const active = skillOf('技能X', '主动技能', { cost: 1, cooldown: 2 });

  it('正常可用 → 全体禁用后不可用 → 不影响对手', () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.tp = 5;
    expect(SkillSystem.canUseSkill('playerA', active)).toBe(true);

    persistentEffects.addSkillDisable('playerA', '*', 2);
    expect(SkillSystem.canUseSkill('playerA', active)).toBe(false);
    playerStore.playerB.tp = 5;
    expect(SkillSystem.canUseSkill('playerB', active)).toBe(true);
  });

  it('指定技能禁用只挡该技能', () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.tp = 5;
    persistentEffects.addSkillDisable('playerA', '技能X', 2);
    expect(SkillSystem.canUseSkill('playerA', active)).toBe(false);
    expect(SkillSystem.canUseSkill('playerA', skillOf('技能Y', '主动技能', { cost: 1 }))).toBe(true);
  });
});

describe('被动光环管线（S8a 首次接通）', () => {
  it('onPlay：围炉夜话——打出日常卡且手牌≤3 → 抽1（叠加在日常系示例抽1之上）', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.characters = [charWith([skillOf('志摩凛_围炉夜话')])];
    playerStore.playerA.activeCharacterIndex = 0;
    playerStore.playerA.hand = [];
    playerStore.playerA.deck = [animeCard(11), animeCard(12), animeCard(13), animeCard(14), animeCard(15)];

    await SkillSystem.onCardPlayed('playerA', animeCard(1, ['日常']));
    // 日常系示例效果抽1 + 围炉夜话（手牌≤3）抽1
    expect(playerStore.playerA.hand).toHaveLength(2);
    expect(playerStore.playerA.deck).toHaveLength(3);
  });

  it('onPlay：手牌充裕（>3）时围炉夜话不触发', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.characters = [charWith([skillOf('志摩凛_围炉夜话')])];
    playerStore.playerA.activeCharacterIndex = 0;
    playerStore.playerA.hand = [animeCard(21), animeCard(22), animeCard(23), animeCard(24)];
    playerStore.playerA.deck = [animeCard(11), animeCard(12), animeCard(13), animeCard(14), animeCard(15)];

    await SkillSystem.onCardPlayed('playerA', animeCard(1, ['日常']));
    expect(playerStore.playerA.hand).toHaveLength(5); // 仅日常系示例抽1
  });

  it('未注册 effectId 的被动保持静默（不分发、无状态变化）', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.characters = [charWith([skillOf('未来的某个限定皮肤技能_占位')])];
    playerStore.playerA.activeCharacterIndex = 0;
    playerStore.playerA.hand = [];
    playerStore.playerA.deck = [animeCard(11), animeCard(12)];

    await SkillSystem.onCardPlayed('playerA', animeCard(1, ['科幻']));
    expect(playerStore.playerA.hand).toHaveLength(0); // 非日常卡无示例抽牌；未注册被动无任何效果
  });

  it('★ 费用修饰器型被动不进事件管线（银发王选——S8c 活体测试抓到的告警回归）', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const playerStore = usePlayerStore();
    playerStore.playerA.characters = [charWith([skillOf('艾米莉娅_银发王选')])];
    playerStore.playerA.activeCharacterIndex = 0;
    playerStore.playerA.hand = [];
    playerStore.playerA.deck = [animeCard(11)];

    await SkillSystem.onCardPlayed('playerA', animeCard(1, ['奇幻']));
    expect(warn).not.toHaveBeenCalled(); // 不应分发到 runEffect 刷「handler not found」
    warn.mockRestore();
  });

  it('beforeResolve：阿克曼血统——声望≤15 时主辩手为出牌侧注入+1强度', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.characters = [charWith([skillOf('三笠_阿克曼_阿克曼血统')])];
    playerStore.playerA.activeCharacterIndex = 0;
    playerStore.playerA.reputation = 12;

    const clash = {
      attackerId: 'playerA',
      defenderId: 'playerB',
      attackingCard: animeCard(1, ['战斗']),
      attackStyle: '友好安利',
    } as unknown as ClashInfo;

    const bonuses: Array<[string, number]> = [];
    await SkillSystem.emitBeforeResolve(clash, (side, amount) => bonuses.push([side, amount]));
    expect(bonuses).toContainEqual(['attacker', 1]);
  });

  it('beforeResolve：声望>15 时阿克曼血统不触发', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.characters = [charWith([skillOf('三笠_阿克曼_阿克曼血统')])];
    playerStore.playerA.activeCharacterIndex = 0;
    playerStore.playerA.reputation = 30;

    const clash = {
      attackerId: 'playerA',
      defenderId: 'playerB',
      attackingCard: animeCard(1, ['战斗']),
      attackStyle: '友好安利',
    } as unknown as ClashInfo;

    const bonuses: Array<[string, number]> = [];
    await SkillSystem.emitBeforeResolve(clash, (side, amount) => bonuses.push([side, amount]));
    expect(bonuses).toHaveLength(0);
  });

  it('通电样本·科学逻辑：打出科幻卡 30% 抽1（注入序列 RNG 锁定两个分支）', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.hand = [];
    playerStore.playerA.deck = [animeCard(11), animeCard(12), animeCard(13)];

    await runEffect('牧濑红莉栖_科学逻辑', {
      event: 'onPlay', playerId: 'playerA', role: 'attacker',
      card: animeCard(1, ['科幻']), rng: createSequenceRng([0.1]),
    });
    expect(playerStore.playerA.hand).toHaveLength(1); // 0.1 < 0.3 → 抽

    await runEffect('牧濑红莉栖_科学逻辑', {
      event: 'onPlay', playerId: 'playerA', role: 'attacker',
      card: animeCard(2, ['科幻']), rng: createSequenceRng([0.9]),
    });
    expect(playerStore.playerA.hand).toHaveLength(1); // 0.9 ≥ 0.3 → 不抽
  });
});

describe('#36/#37 新增真实现主动技（S8a 补全设计）', () => {
  it('立体机动：扣3TP、战斗+2强度（1回合）、抽1、上3回合冷却', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.tp = 5;
    playerStore.playerA.hand = [];
    playerStore.playerA.deck = [animeCard(11), animeCard(12)];

    await SkillSystem.useSkill('playerA', skillOf('三笠_阿克曼_立体机动', '主动技能', { cost: 3, cooldown: 3 }));
    expect(playerStore.playerA.tp).toBe(2);
    expect(playerStore.playerA.hand).toHaveLength(1);
    expect(persistentEffects.getStrengthBonus('playerA', ['战斗'])).toBe(2);
    expect(persistentEffects.getStrengthBonus('playerA', ['日常'])).toBe(0);
    expect(playerStore.playerA.skillCooldowns['三笠_阿克曼_立体机动']).toBe(3);
  });

  it('秘境营地：净花费2TP（3−1返还，返还吃 maxTp 封顶）、日常+2强度（1回合）', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.tp = 5;
    playerStore.playerA.maxTp = 10; // 返还走 gainTp，会被 maxTp 封顶——夹具放宽上限以观测返还

    await SkillSystem.useSkill('playerA', skillOf('志摩凛_秘境营地', '主动技能', { cost: 3, cooldown: 3 }));
    expect(playerStore.playerA.tp).toBe(3); // 5 − 3 + 1
    expect(persistentEffects.getStrengthBonus('playerA', ['日常'])).toBe(2);
  });
});

describe('isSkillImplemented（S8a 诚实化判定，S8b/c 后全量真实现）', () => {
  it('事件 handler / 基础设施级 / 费用修饰器 → true；未注册或无 effectId → false', () => {
    expect(isSkillImplemented(skillOf('志摩凛_围炉夜话'))).toBe(true);
    expect(isSkillImplemented(skillOf('AURA_GENRE_EXPERT'))).toBe(true);
    expect(isSkillImplemented(skillOf('战场原黑仪_毒舌反击'))).toBe(true); // S8c 真实现（曾是播报）
    expect(isSkillImplemented(skillOf('CC_不死之身'))).toBe(true); // S8b 复活（曾降级）
    expect(isSkillImplemented(skillOf('惣流_明日香_兰格雷_驾驶员骄傲'))).toBe(true); // 费用修饰器路径
    expect(isSkillImplemented(skillOf('八九寺真宵_迷路小学生'))).toBe(true); // 基础设施级
    expect(isSkillImplemented(skillOf('不存在的技能_占位'))).toBe(false); // 未注册
    expect(isSkillImplemented({ effectId: undefined })).toBe(false); // 无实现映射
  });
});
