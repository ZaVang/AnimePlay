/**
 * 交互式技能测试（S8c）：以 AI 自动路径（playerB + 注入 rng）与无 UI 回退路径
 * 锁定状态变更；弹窗交互本身走活体手测。重点：主数据防污染（改卡必须克隆）。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { runEffect } from '@/skills/effects';
import { persistentEffects, clearBattleSkillState } from '@/skills/systems';
import { playerCardCost } from '@/skills/effects/costModifiers';
import { usePlayerStore } from '@/stores/battle';
import { createSequenceRng } from '@/engine';
import type { AnimeCard } from '@/types/card';

const card = (id: number, tags: string[] = ['日常'], points = 3, cost = 2): AnimeCard =>
  ({ id, name: `卡${id}`, cost, points, synergy_tags: tags }) as unknown as AnimeCard;

beforeEach(() => {
  setActivePinia(createPinia());
  clearBattleSkillState();
});

describe('交互技（AI 自动路径 / 无 UI 回退）', () => {
  it('信息操作：AI 把随机选中的牌移到牌库顶（数组尾）', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerB.deck = [card(1), card(2), card(3), card(4), card(5)]; // 顶=5
    // top3 = [5,4,3]（顶在前）；rng 0.5*3=1 → 选 4
    await runEffect('长门有希_信息操作', { event: 'onPlay', playerId: 'playerB', role: 'attacker', rng: createSequenceRng([0.5]) });
    expect(playerStore.playerB.deck.map(c => c.id)).toEqual([1, 2, 3, 5, 4]); // 4 置顶
  });

  it('GEASS契约：双方各换一张，换来的牌点名-2费', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerB.hand = [card(10)];
    playerStore.playerA.hand = [card(20, ['科幻'], 4, 3)];
    await runEffect('CC_GEASS契约', { event: 'onPlay', playerId: 'playerB', role: 'attacker', rng: createSequenceRng([0, 0]) });

    expect(playerStore.playerB.hand.map(c => c.id)).toEqual([20]);
    expect(playerStore.playerA.hand.map(c => c.id)).toEqual([10]);
    // 换来的 20 号牌 -2 费：3 → 1
    expect(playerCardCost('playerB', playerStore.playerB.hand[0])).toBe(1);
    // 不影响其它牌
    expect(playerCardCost('playerB', card(99, ['科幻'], 4, 3))).toBe(3);
  });

  it('宝石魔术：AI 强化点数最高的牌（点名 next-match）', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerB.hand = [card(1, ['日常'], 2), card(2, ['科幻'], 6), card(3, ['战斗'], 4)];
    await runEffect('远坂凛_宝石魔术', { event: 'onPlay', playerId: 'playerB', role: 'attacker' });
    expect(persistentEffects.getStrengthBonus('playerB', ['科幻'], 2)).toBe(2); // 卡2 点名生效
    expect(persistentEffects.getStrengthBonus('playerB', ['日常'], 1)).toBe(0); // 其它卡无
  });

  it('GEASS命令：对手被强制类型', async () => {
    await runEffect('鲁路修_兰佩路基_GEASS命令', { event: 'onPlay', playerId: 'playerB', role: 'attacker', rng: createSequenceRng([0.1]) });
    const r = persistentEffects.getRestriction('playerA', 'forced_card_type') as { type?: string };
    expect(r?.type).toBe('日常'); // 0.1*8=0 → GENRES[0]
  });

  it('宅女知识：对手前2张含日常 → 抽1；不含 → 不抽', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerB.hand = [card(1, ['日常']), card(2, ['科幻'])];
    playerStore.playerA.hand = [];
    playerStore.playerA.deck = [card(11), card(12)];
    await runEffect('泉此方_宅女知识', { event: 'onPlay', playerId: 'playerA', role: 'attacker' });
    expect(playerStore.playerA.hand).toHaveLength(1);

    playerStore.playerB.hand = [card(3, ['科幻']), card(4, ['战斗'])];
    await runEffect('泉此方_宅女知识', { event: 'onPlay', playerId: 'playerA', role: 'attacker' });
    expect(playerStore.playerA.hand).toHaveLength(1); // 没多抽
  });

  it('完美主义：克隆替换 points=5，原主数据对象不被污染', async () => {
    const playerStore = usePlayerStore();
    const master = card(7, ['校园'], 2); // 模拟主数据引用
    playerStore.playerB.hand = [master];
    await runEffect('羽川翼_完美主义', { event: 'onPlay', playerId: 'playerB', role: 'attacker' });
    expect(playerStore.playerB.hand[0].points).toBe(5);
    expect(master.points).toBe(2); // ★ 原对象未被改
  });

  it('魔法收集：复制对手第一张奇幻卡（对方手牌不减少）', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.hand = [card(1, ['科幻']), card(2, ['奇幻'], 5)];
    playerStore.playerB.hand = [];
    await runEffect('芙莉莲_魔法收集', { event: 'onPlay', playerId: 'playerB', role: 'attacker' });
    expect(playerStore.playerB.hand.map(c => c.id)).toEqual([2]);
    expect(playerStore.playerA.hand).toHaveLength(2);
  });

  it('时间警告：对手下张卡 +2 费（负减免透传）', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.hand = [card(1, ['日常'], 3, 2)];
    await runEffect('阿万音铃羽_时间警告', { event: 'onPlay', playerId: 'playerB', role: 'attacker' });
    expect(playerCardCost('playerA', playerStore.playerA.hand[0])).toBe(4); // 2 + 2
  });

  it('射击精准：点名+2费；存在感操作保护校园卡不可被指定', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.hand = [card(1, ['校园'], 3, 2), card(2, ['科幻'], 3, 2)];
    // 对手（playerA）开了存在感操作
    await runEffect('樱岛麻衣_存在感操作', { event: 'onPlay', playerId: 'playerA', role: 'attacker' });
    // AI（playerB）射击精准：可指定池只剩卡2
    await runEffect('柊镜_射击精准', { event: 'onPlay', playerId: 'playerB', role: 'attacker', rng: createSequenceRng([0.99]) });
    expect(playerCardCost('playerA', playerStore.playerA.hand[0])).toBe(2); // 校园卡没事
    expect(playerCardCost('playerA', playerStore.playerA.hand[1])).toBe(4); // 科幻卡 +2
  });

  it('原画创作：克隆替换主类型，原对象不污染', async () => {
    const playerStore = usePlayerStore();
    const master = card(9, ['科幻', 'TV'], 3);
    playerStore.playerB.hand = [master];
    // rng: 选卡 0 → 卡9；选类型 0.5*8=4 → 校园
    await runEffect('安原绘麻_原画创作', { event: 'onPlay', playerId: 'playerB', role: 'attacker', rng: createSequenceRng([0, 0.5]) });
    expect(playerStore.playerB.hand[0].synergy_tags?.[0]).toBe('校园');
    expect(playerStore.playerB.hand[0].synergy_tags).toContain('TV'); // 次标签保留
    expect(master.synergy_tags?.[0]).toBe('科幻'); // ★ 原对象未被改
  });

  it('命运探测：顶5选2（AI 按点数）入手，其余按原序放牌库底', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerB.hand = [];
    // 牌库底→顶：1,2,3,4,5,6,7（顶=7）；顶5 = [7,6,5,4,3]
    playerStore.playerB.deck = [card(1, ['日常'], 1), card(2, ['日常'], 1), card(3, ['日常'], 3), card(4, ['日常'], 9), card(5, ['日常'], 2), card(6, ['日常'], 8), card(7, ['日常'], 1)];
    await runEffect('冈部伦太郎_命运探测', { event: 'onPlay', playerId: 'playerB', role: 'attacker' });
    // AI 选点数最高的 4(9点) 与 6(8点)
    expect(playerStore.playerB.hand.map(c => c.id).sort()).toEqual([4, 6]);
    // 剩余 7,5,3 放到牌库底，1,2 在其上
    expect(playerStore.playerB.deck.map(c => c.id)).toEqual([3, 5, 7, 1, 2]);
    expect(playerStore.playerB.deck).toHaveLength(5);
  });
});
