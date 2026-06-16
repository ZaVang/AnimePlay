/**
 * 图鉴定向解锁定价表（evolution-2 / E2-T1）。
 * 「想要哪张卡点哪张」的知识点出口——对标 Marvel Snap Token Shop：
 * 是「心仪卡的长期保底出口」，不是抽卡替代品。
 *
 * 平衡原则（Planner 定，勿擅自调低）：
 *  - UR 远贵、阶梯递增；
 *  - 每档明显高于「分解回收」价（回收 N10/R25/SSR50/SR100/UR200，见 gameConfig.rarityConfig.dismantleValue），
 *    使定向解锁是「长期攒钱拿心仪卡」而非「花钱跳过抽卡」。
 * 定价不进存档；解锁靠 collection.addCard 入库（已持久化），无需新 schema 字段。
 */
import type { Rarity } from '@/types/card';

/** 各稀有度定向解锁价（知识点）。N 卡默认获赠路径多，给一个低价兜底档。 */
export const CODEX_UNLOCK_PRICES: Record<Rarity, number> = {
  N: 50,
  R: 200,
  SR: 600,
  SSR: 2000,
  HR: 5000,
  UR: 12000,
};

/** 取某稀有度的定向解锁价。 */
export function getCodexUnlockPrice(rarity: Rarity): number {
  return CODEX_UNLOCK_PRICES[rarity];
}
