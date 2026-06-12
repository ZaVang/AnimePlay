/**
 * 技能系统的共享类型 —— 纯类型层（S4 迁入）。
 * EffectContext 自带注入的 RNG：handler 内禁止直接 Math.random。
 * S8b/c 扩展事件：turnStart/turnEnd（回合钩子被动）、onSkillUsed（技能响应被动，ctx.skill 为被使用的技能）。
 */
import type { AnimeCard } from '@/types/card';
import type { Skill } from '@/types/skill';
import type { ClashInfo, PlayerId } from '@/types/battle';
import type { RNG } from '../rng';

export type BattleEvent =
  | 'onPlay'
  | 'beforeResolve'
  | 'afterResolve'
  | 'turnStart'
  | 'turnEnd'
  | 'onSkillUsed';
export type CombatRole = 'attacker' | 'defender';

export interface EffectContext {
  event: BattleEvent;
  playerId: PlayerId;
  role: CombatRole;
  /** 注入的随机源（执行器默认给 defaultRng；测试给种子/序列源）。 */
  rng: RNG;
  card?: AnimeCard;
  clash?: ClashInfo;
  /** onSkillUsed 事件：被使用的技能（使用者见 skillUserId）。 */
  skill?: Skill;
  /** onSkillUsed 事件：技能使用者（ctx.playerId 是被动持有者，两者可能不同）。 */
  skillUserId?: PlayerId;
  addStrengthBonus?: (role: CombatRole, amount: number) => void;
}

// AnnounceEntry（播报式假实现的条目类型）已随 S8c 播报机制删除而移除。
