/**
 * 可注入的随机源（RNG）。
 *
 * 铁律：engine 内的一切随机（抽卡、暴击、塔敌生成…）都必须经由注入的 RNG，
 * 禁止直接调用 Math.random()。原因：
 *  1. 可测试 —— 种子化后测试可以断言「这一抽必出 X」；
 *  2. 服务端权威 —— 将来 PvP 时同一份 engine 在服务端用真随机结算，客户端只做预测；
 *  3. 可回放 —— 记录种子即可复现一场战斗/一次十连。
 */

export interface RNG {
  /** 等价于 Math.random()：返回 [0, 1) 的浮点数 */
  next(): number;
  /** 返回 [0, maxExclusive) 的整数 */
  int(maxExclusive: number): number;
  /** 从数组中等概率取一个元素（空数组返回 undefined） */
  pick<T>(arr: readonly T[]): T | undefined;
  /** 以概率 p（0~1）返回 true */
  chance(p: number): boolean;
  /** 返回打乱后的新数组（Fisher-Yates，不修改原数组） */
  shuffle<T>(arr: readonly T[]): T[];
}

/** 以任意 next() 实现构造完整 RNG 接口 */
export function createRng(next: () => number): RNG {
  return {
    next,
    int(maxExclusive: number): number {
      return Math.floor(next() * maxExclusive);
    },
    pick<T>(arr: readonly T[]): T | undefined {
      if (arr.length === 0) return undefined;
      return arr[Math.floor(next() * arr.length)];
    },
    chance(p: number): boolean {
      return next() < p;
    },
    shuffle<T>(arr: readonly T[]): T[] {
      const result = [...arr];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    },
  };
}

/**
 * mulberry32 —— 极小的种子化 PRNG，确定性、足够均匀，适合游戏与测试。
 * 同一 seed 产生完全相同的序列。
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 种子化 RNG：测试与回放用 */
export function createSeededRng(seed: number): RNG {
  return createRng(mulberry32(seed));
}

/** 固定序列 RNG：测试用，依次返回给定值，耗尽后循环 */
export function createSequenceRng(values: readonly number[]): RNG {
  if (values.length === 0) throw new Error('createSequenceRng 需要至少一个值');
  let i = 0;
  return createRng(() => values[i++ % values.length]);
}

/**
 * 默认 RNG：生产环境的真随机（Math.random）。这是 engine 内唯一允许出现 Math.random 的地方。
 * 注意必须晚绑定（箭头包一层）：若直接传引用，测试里 vi.spyOn(Math, 'random')
 * 替换的是属性而非已捕获的引用，spy 将对 defaultRng 失效。
 */
// eslint-disable-next-line no-restricted-properties
export const defaultRng: RNG = createRng(() => Math.random());
