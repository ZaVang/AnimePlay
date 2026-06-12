/**
 * 技能系统的共享类型 —— 纯类型层（S4 迁入）。
 * EffectContext 自带注入的 RNG：handler 内禁止直接 Math.random。
 */
import type { AnimeCard } from '@/types/card';
import type { ClashInfo, PlayerId } from '@/types/battle';
import type { RNG } from '../rng';

export type BattleEvent = 'onPlay' | 'beforeResolve' | 'afterResolve';
export type CombatRole = 'attacker' | 'defender';

export interface EffectContext {
  event: BattleEvent;
  playerId: PlayerId;
  role: CombatRole;
  /** 注入的随机源（执行器默认给 defaultRng；测试给种子/序列源）。 */
  rng: RNG;
  card?: AnimeCard;
  clash?: ClashInfo;
  addStrengthBonus?: (role: CombatRole, amount: number) => void;
}

/**
 * 播报条目：尚未真实现的技能只产生战斗日志/提示（S8 将逐批替换为真实现）。
 * 文案里的 `{name}` 由执行器替换为玩家名。空对象 = 静默占位（原实现只有 console.log）。
 */
export interface AnnounceEntry {
  log?: string;
  logType?: 'event' | 'clash' | 'damage' | 'info';
  notify?: string;
  notifyType?: 'info' | 'warning';
}
