/**
 * 养成好感语义色映射（S13-C1 瘦身：只保留好感档色，删心情/属性/互动硬色簇）。
 *
 * 纯常量 / 纯函数，零 Vue / Pinia / DOM / IO（依赖只向下，可被任意组件 import）。
 * 全部输出皮肤语义类（accent/highlight/success/warning/danger/info/ink-2…），随皮肤协调切换。
 *
 * 档位与 config/nurture.ts 的 BOND_MILESTONES（100/250/500/1000/2000/4000）对齐：
 * 好感越高色越「暖/强」。区分度靠 icon(emoji) 保留。
 */

/** 好感档（affection → 语义色 / 软底 / icon）。 */
export interface BondTier {
  /** 文字语义类（text-*）。 */
  color: string;
  /** 软底语义类（如 bg-accent/20）；进度条取实底时去掉 /20 修饰。 */
  bgColor: string;
  /** 区分用 emoji。 */
  icon: string;
}

/**
 * 由好感度求好感档（共享语义色）。称号取自 config/nurture.ts bondTitleFor，此处只管色与 icon。
 * 语义映射：≥4000 accent / ≥2000 danger / ≥1000 highlight / ≥500 info / ≥250 success / ≥100 warning / else ink-2。
 */
export function bondTier(affection: number): BondTier {
  if (affection >= 4000) return { color: 'text-accent', bgColor: 'bg-accent/20', icon: '⭐' };
  if (affection >= 2000) return { color: 'text-danger', bgColor: 'bg-danger/20', icon: '🌟' };
  if (affection >= 1000) return { color: 'text-highlight', bgColor: 'bg-highlight/20', icon: '💜' };
  if (affection >= 500) return { color: 'text-info', bgColor: 'bg-info/20', icon: '💙' };
  if (affection >= 250) return { color: 'text-success', bgColor: 'bg-success/20', icon: '💚' };
  if (affection >= 100) return { color: 'text-warning', bgColor: 'bg-warning/20', icon: '💛' };
  return { color: 'text-ink-2', bgColor: 'bg-ink-3/20', icon: '🤝' };
}
