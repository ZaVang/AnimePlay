/**
 * 装备稀有度配色（S13-C2）。完整字面映射，**禁运行时拼 `bg-${rarity}`**（C1 barColor 教训：
 * 拼出的类无静态字面、Tailwind JIT 不生成、渲染缺色）。徽章渐变/文字色复用 gameConfig.rarityConfig，
 * 这里只补一份「按 rarity 直接索引」的稳定入口，避免组件各自去 gameConfig 里钻三层。
 *
 * 稀有度识别色是颜色铁律的固定例外（与皮肤语义令牌并存）；徽章上的白字属压片白字例外。
 */
import { GAME_CONFIG } from './gameConfig';
import type { Rarity } from '@/types/card';

interface RarityStyle {
  /** 文字色类（如 text-red-600），完整字面。 */
  text: string;
  /** 徽章实底渐变类（如 from-amber-400 to-red-500），完整字面。 */
  gradient: string;
}

// 从 gameConfig 角色稀有度表派生（含 color/c 完整字面），构建一次。
const CONF = GAME_CONFIG.characterSystem.rarityConfig as Record<
  string,
  { color: string; c: string }
>;

export const RARITY_STYLE: Record<Rarity, RarityStyle> = {
  N: { text: CONF.N.color, gradient: CONF.N.c },
  R: { text: CONF.R.color, gradient: CONF.R.c },
  SR: { text: CONF.SR.color, gradient: CONF.SR.c },
  SSR: { text: CONF.SSR.color, gradient: CONF.SSR.c },
  HR: { text: CONF.HR.color, gradient: CONF.HR.c },
  UR: { text: CONF.UR.color, gradient: CONF.UR.c },
};

/** 取某稀有度的完整字面配色（找不到回落 N）。 */
export function rarityStyle(rarity: Rarity): RarityStyle {
  return RARITY_STYLE[rarity] ?? RARITY_STYLE.N;
}
