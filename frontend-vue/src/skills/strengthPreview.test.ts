/**
 * 强度预览测试：previewSideStrength 与 battleFlow.sideStrength 同口径（卡面+光环+持续效果），
 * 但必须 NON-consuming——不得消费义体强化（aura suppression）等一次性标记。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { previewSideStrength } from './strengthPreview';
import { persistentEffects, statusEffects, clearBattleSkillState } from './systems';
import { usePlayerStore } from '@/stores/battle';
import type { AnimeCard, CharacterCard } from '@/types/card';

const card = (id: number, tags: string[], points: number): AnimeCard =>
  ({ id, name: `卡${id}`, points, synergy_tags: tags }) as unknown as AnimeCard;

beforeEach(() => {
  setActivePinia(createPinia());
  clearBattleSkillState();
});

describe('previewSideStrength', () => {
  it('无加成：total = 卡面点数', () => {
    expect(previewSideStrength('playerA', card(1, ['科幻'], 5))).toEqual({ base: 5, bonus: 0, total: 5 });
  });

  it('持续效果加成计入 bonus/total', () => {
    persistentEffects.addCardTypeStrengthBonus('playerA', '科幻', 2, 1);
    expect(previewSideStrength('playerA', card(1, ['科幻'], 5))).toEqual({ base: 5, bonus: 2, total: 7 });
  });

  it('不匹配类型不加成', () => {
    persistentEffects.addCardTypeStrengthBonus('playerA', '科幻', 2, 1);
    expect(previewSideStrength('playerA', card(1, ['日常'], 5)).total).toBe(5);
  });

  it('被动光环（AURA_GENRE_EXPERT 日常+1）计入；义体压制不计且预览不消费标记', () => {
    const ps = usePlayerStore();
    ps.playerA.characters = [
      { id: 1, name: 'C', rarity: 'UR', skills: [{ id: 'AURA_GENRE_EXPERT', name: '类型专家', type: '被动光环' }] },
    ] as unknown as CharacterCard[];
    const daily = card(2, ['日常'], 3);
    expect(previewSideStrength('playerA', daily).total).toBe(4); // +1 光环

    statusEffects.suppressAuraFor('playerA');
    expect(previewSideStrength('playerA', daily).total).toBe(3); // 压制：光环不计
    expect(statusEffects.hasAuraSuppression('playerA')).toBe(true); // 关键：预览没把一次性标记消费掉
  });

  it('无卡返回全 0', () => {
    expect(previewSideStrength('playerA', null)).toEqual({ base: 0, bonus: 0, total: 0 });
  });
});
