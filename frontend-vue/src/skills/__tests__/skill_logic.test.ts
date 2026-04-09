
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runEffect } from '../registry';
import type { EffectContext } from '@/types/effects';
import type { SkillAPI } from '@/types/skill-api';

describe('Skill Logic: Makise Kurisu (Steins;Gate)', () => {
  // Mock API 接口
  const mockApi: Record<keyof SkillAPI, any> = {
    drawCards: vi.fn(),
    changeTp: vi.fn(),
    discardCard: vi.fn(),
    addLog: vi.fn(),
    addNotification: vi.fn(),
    addTemporaryBonus: vi.fn(),
    viewOpponentHand: vi.fn().mockResolvedValue(undefined),
    getOpponentId: vi.fn((id) => (id === 'playerA' ? 'playerB' : 'playerA')),
    getPlayerName: vi.fn(() => 'Kurisu'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // 默认让随机数返回 0，确保概率触发类技能默认触发
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
  });

  describe('牧濑红莉栖_时间理论', () => {
    it('should view opponent hand and add strength bonus', async () => {
      const ctx: EffectContext = {
        playerId: 'playerA',
        event: 'onPlay',
        role: 'attacker',
        api: mockApi as unknown as SkillAPI,
      };

      await runEffect('牧濑红莉栖_时间理论', ctx);

      // 验证查看手牌调用
      expect(mockApi.viewOpponentHand).toHaveBeenCalledWith('playerA', expect.objectContaining({
        count: 3,
        title: expect.stringContaining('时间理论')
      }));

      // 验证科幻类强度加成
      expect(mockApi.addTemporaryBonus).toHaveBeenCalledWith(expect.objectContaining({
        playerId: 'playerA',
        cardType: '科幻',
        amount: 2,
        duration: 1
      }));
    });
  });

  describe('牧濑红莉栖_科学逻辑', () => {
    it('should draw 1 card when playing 科幻 card and probability hits', async () => {
      // Mock 随机数为 0.1 (小于 0.3)
      vi.spyOn(Math, 'random').mockReturnValue(0.1);

      const ctx: EffectContext = {
        playerId: 'playerA',
        event: 'onPlay',
        role: 'attacker',
        card: { synergy_tags: ['科幻'] } as any,
        api: mockApi as unknown as SkillAPI,
      };

      await runEffect('牧濑红莉栖_科学逻辑', ctx);

      // 验证抽牌被调用
      expect(mockApi.drawCards).toHaveBeenCalledWith('playerA', 1);
      // 验证日志记录
      expect(mockApi.addLog).toHaveBeenCalledWith(expect.stringContaining('触发：抽1张牌'), 'info');
    });

    it('should NOT draw card when probability misses', async () => {
      // Mock 随机数为 0.9 (大于 0.3)
      vi.spyOn(Math, 'random').mockReturnValue(0.9);

      const ctx: EffectContext = {
        playerId: 'playerA',
        event: 'onPlay',
        role: 'attacker',
        card: { synergy_tags: ['科幻'] } as any,
        api: mockApi as unknown as SkillAPI,
      };

      await runEffect('牧濑红莉栖_科学逻辑', ctx);

      // 验证抽牌未被调用
      expect(mockApi.drawCards).not.toHaveBeenCalled();
    });

    it('should NOT trigger when card type is NOT 科幻', async () => {
      const ctx: EffectContext = {
        playerId: 'playerA',
        event: 'onPlay',
        role: 'attacker',
        card: { synergy_tags: ['战斗'] } as any,
        api: mockApi as unknown as SkillAPI,
      };

      await runEffect('牧濑红莉栖_科学逻辑', ctx);

      expect(mockApi.drawCards).not.toHaveBeenCalled();
    });
  });
});
