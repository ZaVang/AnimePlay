import { describe, it, expect } from 'vitest';
import { layoutSide, STAGE, type StageLayoutInput } from './stageLayout';

const u = (id: string, positionOrder: number): StageLayoutInput => ({ id, positionOrder });

describe('stage layout — single-baseline number-axis positioning', () => {
  it('所有单位共享同一条水平基线（top 恒为 BASE_Y）', () => {
    const team = [u('f', 0), u('m', 1), u('b', 2), u('b2', 2)];
    for (const p of layoutSide(team, 'player')) expect(p.top).toBe(STAGE.BASE_Y);
    for (const p of layoutSide(team, 'enemy')) expect(p.top).toBe(STAGE.BASE_Y);
  });

  it('己方全在负半侧(<50-σ)，敌方全在正半侧(>50+σ)，中间留 2σ 空白', () => {
    const team = [u('a', 0), u('b', 1), u('c', 2)];
    for (const p of layoutSide(team, 'player')) expect(p.left).toBeLessThanOrEqual(50 - STAGE.GAP_SIGMA);
    for (const p of layoutSide(team, 'enemy')) expect(p.left).toBeGreaterThanOrEqual(50 + STAGE.GAP_SIGMA);
  });

  it('己方：positionOrder 越大（越靠后）left 越小（越靠外/靠左）', () => {
    const placed = layoutSide([u('front', 0), u('mid', 1), u('back', 2)], 'player');
    const byId = Object.fromEntries(placed.map(p => [p.unit.id, p.left]));
    expect(byId.front).toBeGreaterThan(byId.mid);
    expect(byId.mid).toBeGreaterThan(byId.back);
  });

  it('敌方：positionOrder 越大（越靠后）left 越大（越靠外/靠右）', () => {
    const placed = layoutSide([u('front', 0), u('mid', 1), u('back', 2)], 'enemy');
    const byId = Object.fromEntries(placed.map(p => [p.unit.id, p.left]));
    expect(byId.front).toBeLessThan(byId.mid);
    expect(byId.mid).toBeLessThan(byId.back);
  });

  it('front（最贴中线）z 最大 → front 压 back', () => {
    const placed = layoutSide([u('front', 0), u('mid', 1), u('back', 2)], 'player');
    const byId = Object.fromEntries(placed.map(p => [p.unit.id, p.z]));
    expect(byId.front).toBeGreaterThan(byId.mid);
    expect(byId.mid).toBeGreaterThan(byId.back);
  });

  it('同 positionOrder 多人紧凑铺开：left 依次外移、z 依次递减（允许重叠）', () => {
    const placed = layoutSide([u('a', 0), u('b', 0), u('c', 0)], 'player');
    // 稳定：a 最贴中线、c 最靠外。
    const [a, b, c] = placed;
    expect(a.left).toBeGreaterThan(b.left);
    expect(b.left).toBeGreaterThan(c.left);
    expect(a.z).toBeGreaterThan(b.z);
    expect(b.z).toBeGreaterThan(c.z);
    // 紧凑步长可小于单位宽——相邻间距 = STEP。
    expect(Math.abs(a.left - b.left)).toBeCloseTo(STAGE.STEP);
  });

  it('稳定排序：跨 positionOrder 混排时仍前排在内、同排保持输入次序', () => {
    const placed = layoutSide([u('b1', 2), u('f1', 0), u('b2', 2), u('f2', 0)], 'player');
    // 期望 rank 次序：f1, f2, b1, b2。
    expect(placed.map(p => p.unit.id)).toEqual(['f1', 'f2', 'b1', 'b2']);
  });

  it('所有坐标落在画面内 [0,100]', () => {
    const placed = layoutSide([u('a', 2), u('b', 2), u('c', 2), u('d', 2), u('e', 2)], 'player');
    for (const p of placed) {
      expect(p.left).toBeGreaterThanOrEqual(0);
      expect(p.left).toBeLessThanOrEqual(100);
      expect(p.top).toBeGreaterThanOrEqual(0);
      expect(p.top).toBeLessThanOrEqual(100);
    }
  });
});
