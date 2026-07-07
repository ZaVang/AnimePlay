// PCR 战斗舞台的「单基线数轴式站位」布局（纯函数，可测）。
// 全屏归一到 [0,100]% 的 x 轴，中线 50%：己方全在负半侧（x<50）、敌方全在正半侧（x>50）。
// **所有单位共享同一条水平基线**——top 恒为常量 BASE_Y，无竖直错位/分散。
// 沿 x 按 positionOrder 从中线向外铺：front(0) 最贴中线、back(2) 最靠外。
// 步长 STEP 紧凑（可小于单位宽）→ 某排人多时挤成一坨、允许重叠（「三个前排挤一起」）。
// z 序：越贴中线（front）z 越大 → front 压 back。

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
  /** 层叠顺序（越贴中线=越靠前 → z 越大，front 压 back）。 */
  z: number;
}

export const STAGE = {
  GAP_SIGMA: 7,   // 中间留白半宽（%）——中线到最内侧单位的距离。
  BASE_Y: 50,     // 所有单位共享的水平基线（%，竖直恒定）。
  STEP: 8,        // 沿 x 每递进一名单位的紧凑步长（%，可小于单位宽 → 允许重叠）。
  Z_BASE: 100,    // z 基准；越贴中线 z 越大（front 压 back）。
} as const;

/**
 * 计算一侧全部单位的舞台坐标（己方 side='player' 负半侧 / 敌方 side='enemy' 正半侧）。
 * 单位按 positionOrder 升序（前排在前）稳定排序后，从中线向外紧凑铺开；
 * 同 positionOrder 保持输入相对次序（稳定）。所有单位 top 恒为 BASE_Y（同一基线）。
 */
export function layoutSide<T extends StageLayoutInput>(units: readonly T[], side: 'player' | 'enemy'): PlacedUnit<T>[] {
  const sign = side === 'player' ? -1 : 1; // 己方向左（负）、敌方向右（正）。
  // 稳定排序：先 positionOrder（钳到 0..2），再原始次序。
  const ordered = units
    .map((unit, i) => ({ unit, i, order: Math.min(2, Math.max(0, unit.positionOrder)) }))
    .sort((a, b) => (a.order - b.order) || (a.i - b.i));

  return ordered.map(({ unit }, rank) => {
    // rank=0 最贴中线（front），rank 越大越靠外。
    const dist = STAGE.GAP_SIGMA + rank * STAGE.STEP;
    const left = 50 + sign * dist;
    // 越贴中线 z 越大 → front 压 back。
    return { unit, left, top: STAGE.BASE_Y, z: STAGE.Z_BASE - rank };
  });
}
