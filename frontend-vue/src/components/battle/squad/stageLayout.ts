// PCR 战斗舞台的「数轴式站位」布局（纯函数，可测）。
// 全屏归一到 [0,100]% 的 x 轴，中线 50%：己方在 < 50-σ 的负半侧，敌方在 > 50+σ 的正半侧，中间留白 = 2σ。
// 每侧再等分 3 个区域（前/中/后排），前排贴中线、后排靠外。每区默认容 ZONE_CAP 人，超出溢出到相邻区域。

export interface StageLayoutInput {
  id: string;
  /** 站位排序权重：0=前排 / 1=中排 / 2=后排。 */
  positionOrder: number;
}

export interface PlacedUnit<T> {
  unit: T;
  /** 归一化坐标（%）。 */
  left: number;
  top: number;
  /** 层叠顺序（屏幕越靠下越靠前 → z 越大）。 */
  z: number;
}

export const STAGE = {
  GAP_SIGMA: 7,    // 中间留白半宽（%）——「画面参数」。
  SIDE_MARGIN: 4,  // 外侧边距（%）。
  ZONE_CAP: 3,     // 每个区域默认占位数；超出溢出到相邻区域。
  V_CENTER: 50,    // 竖直中心（%）。
  V_STEP: 13,      // 同区多人竖直错位步长（%）。
  X_DIAG: 2.4,     // 同区「前后错位」的横向斜量（屏幕下方=更靠前=更贴中线）。
} as const;

const ZONE_W = (50 - STAGE.GAP_SIGMA - STAGE.SIDE_MARGIN) / 3; // 单区宽度（%）。

/**
 * 带容量的溢出分配：优先本排；本排满则退到最近的相邻排。
 * 顺序 = 本排 → +1 → −1 → +2 → −2（前/后排先退中排，中排先退后排再前排）。
 * 返回 zones[0..2]，每个是该区域内的单位列表。
 */
export function assignZones<T extends StageLayoutInput>(units: readonly T[]): T[][] {
  const byTier: Record<number, T[]> = { 0: [], 1: [], 2: [] };
  for (const u of units) byTier[Math.min(2, Math.max(0, u.positionOrder))].push(u);
  const zones: T[][] = [[], [], []];
  for (const home of [0, 1, 2]) {
    for (const u of byTier[home]) {
      const candidates = [home, home + 1, home - 1, home + 2, home - 2].filter(z => z >= 0 && z <= 2);
      zones[candidates.find(z => zones[z].length < STAGE.ZONE_CAP) ?? home].push(u);
    }
  }
  return zones;
}

/** 计算一侧全部单位的舞台坐标（己方 side='player' 负半侧 / 敌方 side='enemy' 正半侧）。 */
export function layoutSide<T extends StageLayoutInput>(units: readonly T[], side: 'player' | 'enemy'): PlacedUnit<T>[] {
  const zones = assignZones(units);
  const placed: PlacedUnit<T>[] = [];
  for (let z = 0; z < 3; z++) {
    const list = zones[z];
    const dist = STAGE.GAP_SIGMA + (z + 0.5) * ZONE_W;              // 该区中心距中线（前排 z=0 最近）。
    const cx = side === 'player' ? 50 - dist : 50 + dist;           // 己方负侧 / 敌方正侧。
    for (let i = 0; i < list.length; i++) {
      const yOff = list.length === 1 ? 0 : i - (list.length - 1) / 2; // -.. 0 ..+
      const top = STAGE.V_CENTER + yOff * STAGE.V_STEP;
      const diag = yOff * STAGE.X_DIAG * (side === 'player' ? 1 : -1); // 下方(yOff>0)略贴中线=更前。
      placed.push({ unit: list[i], left: cx + diag, top, z: Math.round(top * 10) });
    }
  }
  return placed;
}
