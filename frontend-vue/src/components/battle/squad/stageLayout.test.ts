import { describe, it, expect } from 'vitest';
import { assignZones, layoutSide, STAGE, type StageLayoutInput } from './stageLayout';

const u = (id: string, positionOrder: number): StageLayoutInput => ({ id, positionOrder });
const lens = (zones: StageLayoutInput[][]) => zones.map(z => z.length);

describe('stage layout — number-axis positioning', () => {
  it('各排在自己的区域（无溢出）', () => {
    const zones = assignZones([u('f', 0), u('m1', 1), u('m2', 1), u('b1', 2), u('b2', 2)]);
    expect(lens(zones)).toEqual([1, 2, 2]);
  });

  it('极端：5 人同一排 → 该区留 3，2 人溢出到相邻区（用户示例）', () => {
    const zones = assignZones([u('a', 2), u('b', 2), u('c', 2), u('d', 2), u('e', 2)]);
    // 后排(2) 满 3，相邻中排(1) 收 2；前排(0) 空。
    expect(lens(zones)).toEqual([0, 2, 3]);
  });

  it('前排 4 人 → 前排 3 + 溢出到中排 1', () => {
    expect(lens(assignZones([u('a', 0), u('b', 0), u('c', 0), u('d', 0)]))).toEqual([3, 1, 0]);
  });

  it('己方全在负半侧(<50-σ)，敌方全在正半侧(>50+σ)，中间留 2σ 空白', () => {
    const team = [u('a', 0), u('b', 1), u('c', 2)];
    for (const p of layoutSide(team, 'player')) expect(p.left).toBeLessThan(50 - STAGE.GAP_SIGMA);
    for (const p of layoutSide(team, 'enemy')) expect(p.left).toBeGreaterThan(50 + STAGE.GAP_SIGMA);
  });

  it('前排贴中线、后排靠外（己方：前排 left 最大=最靠右）', () => {
    const placed = layoutSide([u('front', 0), u('mid', 1), u('back', 2)], 'player');
    const byId = Object.fromEntries(placed.map(p => [p.unit.id, p.left]));
    expect(byId.front).toBeGreaterThan(byId.mid);
    expect(byId.mid).toBeGreaterThan(byId.back);
  });

  it('同区多人在区间内前后错开（top 各不相同，且屏幕越靠下 z 越大）', () => {
    const placed = layoutSide([u('a', 1), u('b', 1), u('c', 1)], 'player');
    const tops = placed.map(p => p.top);
    expect(new Set(tops).size).toBe(3); // 三人 top 互不相同
    const sorted = [...placed].sort((x, y) => x.top - y.top);
    expect(sorted[0].z).toBeLessThan(sorted[2].z); // 靠下(top 大)的 z 更大 → 叠在前面
  });

  it('所有坐标落在画面内 [0,100]', () => {
    const zones = layoutSide([u('a', 2), u('b', 2), u('c', 2), u('d', 2), u('e', 2)], 'player');
    for (const p of zones) {
      expect(p.left).toBeGreaterThanOrEqual(0);
      expect(p.left).toBeLessThanOrEqual(100);
      expect(p.top).toBeGreaterThanOrEqual(0);
      expect(p.top).toBeLessThanOrEqual(100);
    }
  });
});
