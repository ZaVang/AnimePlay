import { describe, expect, it } from 'vitest';
import {
  DEFAULT_READINESS_THRESHOLDS,
  assessSquadReadiness,
  recommendedPowerForFloor,
} from './thresholds';

describe('SC-T5 tower readiness thresholds', () => {
  it('recommendedPowerForFloor 默认 = floorPower（1.0 系数），系数可注入且非负', () => {
    expect(recommendedPowerForFloor(1200)).toBe(1200);
    expect(recommendedPowerForFloor(1000, 1.2)).toBe(1200);
    expect(recommendedPowerForFloor(1001, 1)).toBe(1001);
    // 向上取整（避免推荐值虚低）
    expect(recommendedPowerForFloor(1000, 0.905)).toBe(905);
    // 负楼层战力钳到 0
    expect(recommendedPowerForFloor(-50)).toBe(0);
  });

  it('三档划分：ready ≥0.9 / risky 0.7~0.9 / underpowered <0.7', () => {
    const floor = 1000;
    expect(assessSquadReadiness(1200, floor).level).toBe('ready');
    expect(assessSquadReadiness(1000, floor).level).toBe('ready'); // ratio 1.0
    expect(assessSquadReadiness(800, floor).level).toBe('risky'); // ratio 0.8
    expect(assessSquadReadiness(500, floor).level).toBe('underpowered'); // ratio 0.5
  });

  it('边界值：恰好 0.9 → ready、恰好 0.7 → risky、略低于 0.7 → underpowered', () => {
    const floor = 1000;
    expect(assessSquadReadiness(900, floor).level).toBe('ready'); // == readyRatio
    expect(assessSquadReadiness(899, floor).level).toBe('risky'); // 0.899 < 0.9
    expect(assessSquadReadiness(700, floor).level).toBe('risky'); // == riskyRatio
    expect(assessSquadReadiness(699, floor).level).toBe('underpowered'); // 0.699 < 0.7
  });

  it('delta = playerPower − recommendedPower（负=不足）', () => {
    const a = assessSquadReadiness(480, 1200);
    expect(a.recommendedPower).toBe(1200);
    expect(a.delta).toBe(-720);
    const b = assessSquadReadiness(1500, 1200);
    expect(b.delta).toBe(300);
    expect(b.level).toBe('ready');
  });

  it('floorPower ≤ 0 视作 ready（ratio 为 Infinity，不误报劣势）', () => {
    const a = assessSquadReadiness(0, 0);
    expect(a.ratio).toBe(Number.POSITIVE_INFINITY);
    expect(a.level).toBe('ready');
    expect(a.recommendedPower).toBe(0);
  });

  it('自定义阈值/系数可注入（不依赖默认常量）', () => {
    const strict = { readyRatio: 1.2, riskyRatio: 1.0 };
    expect(assessSquadReadiness(1100, 1000, strict).level).toBe('risky'); // ratio 1.1 < 1.2
    expect(assessSquadReadiness(1300, 1000, strict).level).toBe('ready');
    // 推荐系数 1.2：推荐 = 1200
    const a = assessSquadReadiness(1000, 1000, DEFAULT_READINESS_THRESHOLDS, 1.2);
    expect(a.recommendedPower).toBe(1200);
    expect(a.delta).toBe(-200);
    expect(a.level).toBe('ready'); // level 仍按 ratio(1.0) 判档，不受推荐系数影响
  });

  it('playerPower 原样回传，floorPower 负值钳到 0', () => {
    const a = assessSquadReadiness(500, -100);
    expect(a.playerPower).toBe(500);
    expect(a.floorPower).toBe(0);
  });
});
