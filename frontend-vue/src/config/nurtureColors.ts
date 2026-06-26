/**
 * 养成 + 挑战塔共享语义色映射（I5-T1 债轮：硬色连根拔）。
 *
 * 此前养成簇把羁绊档色 / 心情色各写两份硬编码 Tailwind 调色板
 * （`bondLevel` 在 CharacterProfile + CharacterSelector、`moodStatus` 在 CharacterProfile +
 * InteractionPanel），且 named 映射（INTERACTION/ACTIVITY）也用硬色——这些 `text-pink-400` /
 * `bg-purple-600` 类**不随 `data-skin` 切换**，切 midnight（琥珀暗底）/neon（青霓虹暗底）时炸饱和色斑。
 *
 * 这里是**唯一权威**：纯常量 / 纯函数，零 Vue / Pinia / DOM / IO（依赖只向下，可被任意组件 import）。
 * 全部输出皮肤语义类（accent/highlight/success/warning/danger/info/ink-2…），随皮肤协调切换。
 *
 * 取舍声明：6 档羁绊去重后塌成 4-5 个语义色（档与档颜色会重复）——这是从「6 个饱和硬色」到
 * 「5 套皮肤协调色」的必然取舍。区分度靠 icon(emoji) 保留，验收看的是「切暗皮不炸色斑」。
 */

/** 羁绊档（affection 阈值 → 称号 / 语义色 / 语义软底 / icon）。称号取 CharacterProfile 版本。 */
export interface BondTier {
  /** 称号（如「永恒羁绊」）。 */
  level: string;
  /** 文字语义类（text-*）。 */
  color: string;
  /** 软底语义类（如 bg-accent/20），进度条去掉透明修饰取实底。 */
  bgColor: string;
  /** 区分用 emoji。 */
  icon: string;
}

/**
 * 由好感度求羁绊档（共享语义色）。CharacterProfile / CharacterSelector 两处共用。
 * 语义映射：≥1000 accent / ≥800 danger / ≥600 highlight / ≥400 info / ≥200 success / ≥100 warning / else ink-2。
 */
export function bondTier(affection: number): BondTier {
  if (affection >= 1000) return { level: '永恒羁绊', color: 'text-accent', bgColor: 'bg-accent/20', icon: '⭐' };
  if (affection >= 800) return { level: '命定之人', color: 'text-danger', bgColor: 'bg-danger/20', icon: '🌟' };
  if (affection >= 600) return { level: '肝胆相照', color: 'text-highlight', bgColor: 'bg-highlight/20', icon: '💜' };
  if (affection >= 400) return { level: '心照不宣', color: 'text-info', bgColor: 'bg-info/20', icon: '💙' };
  if (affection >= 200) return { level: '志同道合', color: 'text-success', bgColor: 'bg-success/20', icon: '💚' };
  if (affection >= 100) return { level: '萍水相逢', color: 'text-warning', bgColor: 'bg-warning/20', icon: '💛' };
  return { level: '初次相遇', color: 'text-ink-2', bgColor: 'bg-ink-3/20', icon: '🤝' };
}

/** 心情档（mood → 文案 / 语义色 / icon）。CharacterProfile / InteractionPanel 共用。 */
export interface MoodTier {
  text: string;
  color: string;
  icon: string;
}

/**
 * 由心情值求心情档（共享语义色）。
 * 语义映射：≥90 accent / ≥70 success / ≥50 warning / ≥30 warning / else danger。
 */
export function moodTier(mood: number): MoodTier {
  if (mood >= 90) return { text: '非常开心', color: 'text-accent', icon: '😊' };
  if (mood >= 70) return { text: '愉快', color: 'text-success', icon: '😌' };
  if (mood >= 50) return { text: '平常', color: 'text-warning', icon: '😐' };
  if (mood >= 30) return { text: '有些烦躁', color: 'text-warning', icon: '😔' };
  return { text: '心情不好', color: 'text-danger', icon: '😞' };
}

/** 仅取心情语义色（InteractionPanel 底部「目前心情」一行只需色）。 */
export function moodColor(mood: number): string {
  return moodTier(mood).color;
}

/**
 * 养成属性 → 语义文字色（魅力/智力/体力/心情进度条 + 数值）。
 * charm→accent、intelligence→info、strength→success、mood→warning。
 */
export const ATTRIBUTE_TEXT_COLOR: Record<string, string> = {
  charm: 'text-accent',
  intelligence: 'text-info',
  strength: 'text-success',
  mood: 'text-warning',
};

/**
 * 养成属性 → 语义进度条实底色（与 ATTRIBUTE_TEXT_COLOR 同义档的 bg-* 版）。
 */
export const ATTRIBUTE_BAR_COLOR: Record<string, string> = {
  charm: 'bg-accent',
  intelligence: 'bg-info',
  strength: 'bg-success',
};

/**
 * 互动/活动语义皮肤色 key（INTERACTION_COLOR_CLASSES 旧硬色 key → 语义档）。
 * blue→info、pink→accent、green→success、purple→highlight、yellow→warning。
 * 用整字面类名（Tailwind JIT 需完整类名，禁模板字符串拼色）。
 */
export const SEMANTIC_CARD_CLASSES: Record<string, string> = {
  blue:   'bg-info/10 hover:bg-info/20 border-info/30 hover:border-info/50',
  pink:   'bg-accent/10 hover:bg-accent/20 border-accent/30 hover:border-accent/50',
  green:  'bg-success/10 hover:bg-success/20 border-success/30 hover:border-success/50',
  purple: 'bg-highlight/10 hover:bg-highlight/20 border-highlight/30 hover:border-highlight/50',
  yellow: 'bg-warning/10 hover:bg-warning/20 border-warning/30 hover:border-warning/50',
};

/**
 * 特殊活动实心按钮语义皮肤色（ACTIVITY_BTN_CLASSES 旧硬色 → 语义档实底 + on-accent 文字）。
 * 实心按钮上的文字用 text-on-accent（随皮肤的「强调表面文字」令牌），不裸 text-white 压浅底。
 */
export const SEMANTIC_BTN_CLASSES: Record<string, string> = {
  green:  'bg-success hover:opacity-90 text-on-accent',
  purple: 'bg-highlight hover:opacity-90 text-on-accent',
  yellow: 'bg-warning hover:opacity-90 text-on-accent',
};
