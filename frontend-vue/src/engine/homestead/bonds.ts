/**
 * 家园入住羁绊 —— 纯函数（S15-T3）。
 *
 * engine 纯净铁律：不 import @/config、@/stores、@/data；只吃调用方喂进的稳定派生源。
 * 设计（PCR/原神共鸣范式）：入住组合命中「同作品 ≥2 人」这类**确定性集合条件** → 给固定档加成，
 * 作为队伍级独立乘子由调用方（config/homestead.computeIdleYield）并入挂机口径，派生免存档。
 *
 * 防退化 3 条（与 plan/SPRINT 对齐）：
 *  ① 只派生自**稳定键** anime（角色 anime_names），不派生自正则 archetype（避免换数据/规则→加成无声消失）；
 *  ② 派生源可选可缺 → 对 undefined/空数组容忍（不命中不加成、不抛错）；
 *  ③ 集合加成**硬上限**（命中即固定档、按「命中的作品条数」线性累加但整体封顶，
 *     不按 C(n,2) 组合数叠加爆炸；0/1 入住不命中、不除零）——守「挂机不盖过主动收入」基线。
 */

/** 每命中一条「同作品 ≥2 人」羁绊给的加成档（温和：+6%）。 */
export const BOND_SAME_ANIME_PCT = 0.06;
/** 触发「同作品」羁绊所需的同作品最少入住人数。 */
export const BOND_SAME_ANIME_MIN_MEMBERS = 2;
/** 集合加成硬上限（多条羁绊线性累加后的整体封顶，防组合爆炸）：+18%（≈3 条封顶）。 */
export const BOND_BONUS_CAP = 0.18;

/** 一条命中的羁绊（供 UI 显形）。 */
export interface BondHit {
  /** 命中的作品名（稳定键）。 */
  anime: string;
  /** 同住该作品的入住人数（≥ BOND_SAME_ANIME_MIN_MEMBERS）。 */
  members: number;
  /** 本条羁绊贡献的加成档（未经整体封顶）。 */
  pct: number;
}

/** 羁绊计算结果：命中清单 + 已封顶的总加成倍率增量。 */
export interface BondResult {
  /** 命中的羁绊清单（按人数降序，人数相同按作品名字典序，确定可测）。 */
  hits: BondHit[];
  /** 队伍级总加成倍率增量（已过 BOND_BONUS_CAP 硬上限，∈[0, cap]）。 */
  bonusPct: number;
}

/**
 * 纯计算：给定每个入住角色的作品名列表 → 命中的集合羁绊 + 已封顶的总加成。
 *
 * @param placedAnimeNames 逐入住角色的 anime_names（可为 undefined / 空数组，容忍缺失）。
 *   顺序无关；同一角色的重复作品名内部去重（一个角色对同作品只贡献 1 次成员计数）。
 * @returns { hits, bonusPct }：hits 供 UI 显形，bonusPct 供 computeIdleYield 并入。
 */
export function computeBondBonus(
  placedAnimeNames: ReadonlyArray<readonly string[] | undefined | null>,
): BondResult {
  // 统计每个作品名被多少个**不同入住角色**共享（一个角色对同作品只计一次）。
  const counts = new Map<string, number>();
  for (const names of placedAnimeNames) {
    if (!Array.isArray(names) || names.length === 0) continue;
    const seenForThisChar = new Set<string>();
    for (const raw of names) {
      if (typeof raw !== 'string') continue;
      const anime = raw.trim();
      if (!anime || seenForThisChar.has(anime)) continue;
      seenForThisChar.add(anime);
      counts.set(anime, (counts.get(anime) ?? 0) + 1);
    }
  }

  const hits: BondHit[] = [];
  for (const [anime, members] of counts) {
    if (members >= BOND_SAME_ANIME_MIN_MEMBERS) {
      hits.push({ anime, members, pct: BOND_SAME_ANIME_PCT });
    }
  }
  // 确定性排序：人数降序，人数相同按作品名字典序（可穷举测试，UI 展示稳定）。
  hits.sort((a, b) => (b.members - a.members) || a.anime.localeCompare(b.anime));

  // 线性累加各命中条的档，整体过硬上限（不按组合数爆炸）。
  const rawSum = hits.reduce((s, h) => s + h.pct, 0);
  const bonusPct = Math.min(BOND_BONUS_CAP, rawSum);

  return { hits, bonusPct };
}
