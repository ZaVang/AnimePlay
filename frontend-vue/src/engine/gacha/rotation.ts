/**
 * UP 池每日轮换规则 —— 纯函数。
 * 选择是日期决定性的（不是随机）：同一天全服同一 UP 组合。
 * 缓存、gameDataStore 读取与商店目录留在 utils/gachaRotation.ts 适配层。
 */

export interface RotationDate {
  /** Date#getDate() 的值（1-31）。 */
  day: number;
  /** Date#getMonth() 的值（0-11）。 */
  month: number;
}

export function toRotationDate(date: Date): RotationDate {
  return { day: date.getDate(), month: date.getMonth() };
}

/** UR 用 day+month，HR 用 day*2+month*3（错开周期避免组合重复）。 */
export function upPoolIndices(date: RotationDate, urCount: number, hrCount: number): { urIndex: number; hrIndex: number } {
  return {
    urIndex: (date.day + date.month) % urCount,
    hrIndex: (date.day * 2 + date.month * 3) % hrCount,
  };
}

/** 从候选卡列表中选出当日 UP 组合；任一池为空返回 null（由调用方决定兜底）。 */
export function pickUpPool<T extends { id: number }>(
  urCards: readonly T[],
  hrCards: readonly T[],
  date: RotationDate,
): { urId: number; hrId: number } | null {
  if (urCards.length === 0 || hrCards.length === 0) return null;
  const { urIndex, hrIndex } = upPoolIndices(date, urCards.length, hrCards.length);
  return { urId: urCards[urIndex].id, hrId: hrCards[hrIndex].id };
}

/** 距下次轮换（次日 0 点）的剩余时间。 */
export function timeUntilNextRotation(now: Date): { hours: number; minutes: number } {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const timeDiff = tomorrow.getTime() - now.getTime();
  return {
    hours: Math.floor(timeDiff / (1000 * 60 * 60)),
    minutes: Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60)),
  };
}
