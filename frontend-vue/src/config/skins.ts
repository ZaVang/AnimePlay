/**
 * 皮肤注册表（S7 建立）。
 * 颜色与装饰的真值在 assets/skins.css 的 [data-skin] 块里；这里只放元数据：
 * 名称/描述/设置页预览色板/解锁方式。preview 色板是 CSS 真值的近似副本，仅用于选择卡片。
 *
 * 解锁经济（预留）：当前全部 free；将来上点数兑换时——
 *  1. 皮肤的 unlock 改为 { type: 'points', cost: N }；
 *  2. 存档加 appearance.ownedSkins（协议升版）；
 *  3. 设置页对未拥有皮肤展示价格并走 profile.spend()。
 */
export type SkinUnlock = { type: 'free' } | { type: 'points'; cost: number };

export interface SkinDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** 设置页预览色板：底色 / 面板 / 强调 / 文字 */
  preview: { app: string; surface: string; accent: string; ink: string };
  unlock: SkinUnlock;
}

export const DEFAULT_SKIN_ID = 'warm';

export const SKINS: SkinDefinition[] = [
  {
    id: 'warm',
    name: '暖阳手账',
    description: '米黄纸面与湖水青，温暖柔和的默认装扮',
    icon: '🌅',
    preview: { app: '#F7F1E5', surface: '#FFFDF8', accent: '#2BA8A2', ink: '#3D3528' },
    unlock: { type: 'free' },
  },
  {
    id: 'sakura',
    name: '樱花和风',
    description: '花瓣粉与紫藤，圆润可爱的春日气息',
    icon: '🌸',
    preview: { app: '#FCF0F5', surface: '#FFFBFD', accent: '#E05C8F', ink: '#4A2B3A' },
    unlock: { type: 'free' },
  },
  {
    id: 'mint',
    name: '薄荷清波',
    description: '青绿与晴空蓝，干净利落的清爽风格',
    icon: '🍃',
    preview: { app: '#EFF7F6', surface: '#FFFFFF', accent: '#149A8D', ink: '#1F3833' },
    unlock: { type: 'free' },
  },
  {
    id: 'midnight',
    name: '午夜剧场',
    description: '深夜幕布与琥珀追光，沉静的观影厅氛围',
    icon: '🌙',
    preview: { app: '#15171E', surface: '#232734', accent: '#E8B458', ink: '#E8EAF2' },
    unlock: { type: 'free' },
  },
  {
    id: 'neon',
    name: '赛博霓虹',
    description: '网格暗夜里的霓虹青与品红，按钮自带光效',
    icon: '⚡',
    preview: { app: '#0B0F1A', surface: '#141B2E', accent: '#00E5C7', ink: '#E6F1FF' },
    unlock: { type: 'free' },
  },
];

export const SKIN_MAP: Record<string, SkinDefinition> = Object.fromEntries(
  SKINS.map(s => [s.id, s]),
);

export function isKnownSkin(id: unknown): id is string {
  return typeof id === 'string' && id in SKIN_MAP;
}

/** 旧主题 id（S7 之前的 6 套配色）→ 新皮肤 id 的就近映射。 */
export const LEGACY_THEME_MAP: Record<string, string> = {
  warm: 'warm',
  sakura: 'sakura',
  flip7: 'mint',
  ocean: 'mint',
  forest: 'mint',
  dark: 'midnight',
};
