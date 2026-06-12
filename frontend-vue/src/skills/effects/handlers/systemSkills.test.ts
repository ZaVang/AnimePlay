/**
 * 系统类主动技测试（S8c）：禁技/强制/敌对削弱/额外回合/护盾的写入侧 +
 * 追踪器护盾闸（敌对写入被 effect_shield 拦截）。
 * battleFlow 消费端（extra_turn 推进/play_limit 拒绝/强度修正）走活体手测。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { runEffect } from '@/skills/effects';
import { SkillSystem } from '@/skills/runtime';
import { persistentEffects, clearBattleSkillState } from '@/skills/systems';
import { usePlayerStore } from '@/stores/battle';
import { createSequenceRng } from '@/engine';
import type { Skill } from '@/types/skill';
import type { CharacterCard } from '@/types/card';

const skillOf = (id: string, extra: Partial<Skill> = {}): Skill =>
  ({ id, name: id, type: '主动技能', description: '', effectId: id, cost: 0, ...extra }) as Skill;

beforeEach(() => {
  setActivePinia(createPinia());
  clearBattleSkillState();
});

describe('系统技写入侧', () => {
  it('毒舌反击：对手背上 harsh_penalty(-3)', async () => {
    await runEffect('战场原黑仪_毒舌反击', { event: 'onPlay', playerId: 'playerA', role: 'attacker' });
    expect(persistentEffects.getRestriction('playerB', 'harsh_penalty')).toEqual({ amount: 3 });
    expect(persistentEffects.hasRestriction('playerA', 'harsh_penalty')).toBe(false);
  });

  it('绝对沉默：对手全体技能禁用，canUseSkill 拒绝', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerB.tp = 9;
    await runEffect('绫波丽_绝对沉默', { event: 'onPlay', playerId: 'playerA', role: 'attacker' });
    expect(SkillSystem.canUseSkill('playerB', skillOf('任意技能'))).toBe(false);
    expect(SkillSystem.canUseSkill('playerA', skillOf('任意技能'))).toBe(true);
  });

  it('存在感消失：恋爱减费 + hand_hidden', async () => {
    await runEffect('加藤惠_存在感消失', { event: 'onPlay', playerId: 'playerA', role: 'attacker' });
    expect(persistentEffects.getCostReduction('playerA', ['恋爱'])).toBe(1);
    expect(persistentEffects.hasRestriction('playerA', 'hand_hidden')).toBe(true);
  });

  it('天然魅力：对手被强制友好安利', async () => {
    await runEffect('八奈见杏菜_天然魅力', { event: 'onPlay', playerId: 'playerA', role: 'attacker' });
    expect(persistentEffects.getForcedAction('playerB')).toBe('friendly_only');
  });

  it('蛇神缠绕：对手吃 -2 一次性强度，出牌后消耗', async () => {
    await runEffect('千石抚子_蛇神缠绕', { event: 'onPlay', playerId: 'playerA', role: 'attacker' });
    expect(persistentEffects.getStrengthBonus('playerB', ['科幻'])).toBe(-2);
    persistentEffects.consumeOneShotBonuses('playerB', 'strength', ['科幻']);
    expect(persistentEffects.getStrengthBonus('playerB', ['科幻'])).toBe(0);
  });

  it('电子战：种子随机禁一个对手主动技 + 己方科幻+2', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerB.characters = [
      { id: 1, name: 'x', rarity: 'UR', skills: [skillOf('技A'), skillOf('技B'), { ...skillOf('被动'), type: '被动光环' }] } as unknown as CharacterCard,
    ];
    playerStore.playerB.activeCharacterIndex = 0;
    playerStore.playerB.tp = 9;

    await runEffect('草薙素子_电子战', { event: 'onPlay', playerId: 'playerA', role: 'attacker', rng: createSequenceRng([0.9]) });
    // 0.9 * 2 个主动候选 = 下标 1 → 技B 被禁
    expect(SkillSystem.canUseSkill('playerB', skillOf('技B'))).toBe(false);
    expect(SkillSystem.canUseSkill('playerB', skillOf('技A'))).toBe(true);
    expect(persistentEffects.getStrengthBonus('playerA', ['科幻'])).toBe(2);
  });

  it('时间停止：extra_turn 限制就位（endTurn 消费）', async () => {
    await runEffect('晓美焰_时间停止', { event: 'onPlay', playerId: 'playerA', role: 'attacker' });
    expect(persistentEffects.hasRestriction('playerA', 'extra_turn')).toBe(true);
  });
});

describe('效果护盾闸（AT力场语义）', () => {
  it('敌对限制与负向加成被拦，正向加成不受影响', async () => {
    persistentEffects.addRestriction('playerB', 'effect_shield', {}, 1);

    // 敌对限制：毒舌反击/天然魅力 落空
    await runEffect('战场原黑仪_毒舌反击', { event: 'onPlay', playerId: 'playerA', role: 'attacker' });
    await runEffect('八奈见杏菜_天然魅力', { event: 'onPlay', playerId: 'playerA', role: 'attacker' });
    expect(persistentEffects.hasRestriction('playerB', 'harsh_penalty')).toBe(false);
    expect(persistentEffects.getForcedAction('playerB')).toBeUndefined();

    // 负向加成：蛇神缠绕 落空
    await runEffect('千石抚子_蛇神缠绕', { event: 'onPlay', playerId: 'playerA', role: 'attacker' });
    expect(persistentEffects.getStrengthBonus('playerB', ['日常'])).toBe(0);

    // 自己给自己的正向不受影响
    persistentEffects.addCardTypeStrengthBonus('playerB', '科幻', 2, 1);
    expect(persistentEffects.getStrengthBonus('playerB', ['科幻'])).toBe(2);
  });

  it('声望护盾限制可正常写入（非敌对，battleFlow 结算消费）', async () => {
    persistentEffects.addRestriction('playerA', 'reputation_shield', {}, 1);
    expect(persistentEffects.hasRestriction('playerA', 'reputation_shield')).toBe(true);
  });
});
