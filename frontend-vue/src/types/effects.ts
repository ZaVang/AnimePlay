import type { AnimeCard, CharacterCard } from './card';
import type { ClashInfo } from './battle';

// 战斗事件类型
export type BattleEvent = 'onPlay' | 'beforeResolve' | 'afterResolve' | 'onGameStart' | 'onTurnStart' | 'onTurnEnd';

// 战斗角色
export type CombatRole = 'attacker' | 'defender' | 'supporter';

// 玩家ID类型
export type PlayerId = 'playerA' | 'playerB';

import type { SkillAPI } from './skill-api';

// 效果上下文接口
export interface EffectContext {
  event: BattleEvent;
  playerId: PlayerId;
  role: CombatRole;
  card?: AnimeCard;
  character?: CharacterCard;
  clash?: ClashInfo;
  api: SkillAPI;
  // 修改：简化为单参数版本，在 beforeResolve 事件中提供
  addStrengthBonus?: (amount: number) => void;
}

// 效果处理器类型
export type EffectHandler = (ctx: EffectContext) => void | Promise<void>;

// 效果注册表类型
export type EffectRegistry = Record<string, EffectHandler>;

// 卡牌效果定义
export interface CardEffect {
  trigger: BattleEvent;
  effectId: string;
  params?: Record<string, unknown>;
}

// 状态效果类型
export interface StatusEffect {
  id: string;
  type: 'temporary' | 'permanent';
  duration?: number;
  effect: string;
}

// 技能参数类型（替换原来的 Record<string, any>）
export interface SkillParams {
  [key: string]: string | number | boolean | string[] | number[];
}