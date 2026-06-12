/**
 * 技能效果执行器（S4 重构，S8c 收敛）。
 * 分发：真实现 handler（customHandlers 合并注册表）→ 未注册仅告警。
 * 播报表机制已随 S8c 全量真实现删除——技能要么真生效，要么不存在。
 * 类型（EffectContext 等）已上移 engine/skills/types —— 此处转发以兼容旧 import 路径。
 */
import { defaultRng, type EffectContext } from '@/engine';
import type { Skill } from '@/types/skill';
import { customHandlers } from './customHandlers';
import { costModifiers } from './costModifiers';

export type { EffectContext, BattleEvent, CombatRole } from '@/engine';

/**
 * 不走事件 handler、在基础设施层真实生效的效果：
 *  - AURA_GENRE_EXPERT：engine/battle/strength 结算强度光环；
 *  - 八九寺真宵_迷路小学生：InteractionSystem.viewOpponentHand 消费（被查看时藏 1 张）。
 */
const INFRA_LEVEL_EFFECTS = new Set(['AURA_GENRE_EXPERT', '八九寺真宵_迷路小学生']);

/** S8a 诚实化：该效果是否有真实现（事件 handler / 条件费用修饰器 / 基础设施级；false = 占位）。 */
export function isEffectImplemented(effectId?: string): boolean {
  if (!effectId) return false;
  return effectId in customHandlers || effectId in costModifiers || INFRA_LEVEL_EFFECTS.has(effectId);
}

/**
 * 该效果是否有**事件 handler**（被动管线分发用）。
 * 费用修饰器型 / 基础设施型被动虽「已实装」，但没有事件 handler，
 * 分发给 runEffect 只会刷「handler not found」告警——管线必须用本判定而非 isEffectImplemented。
 */
export function hasEventHandler(effectId?: string): boolean {
  return !!effectId && effectId in customHandlers;
}

/** S8a 诚实化：技能是否真实生效（UI 据此挂「未实装」徽章）。 */
export function isSkillImplemented(skill: Pick<Skill, 'effectId'>): boolean {
  return isEffectImplemented(skill.effectId);
}

/** 调用方可不传 rng（默认 defaultRng）；测试场景传种子/序列源。 */
export type EffectInvocation = Omit<EffectContext, 'rng'> & { rng?: EffectContext['rng'] };

export async function runEffect(effectId: string, invocation: EffectInvocation) {
  const ctx: EffectContext = { rng: defaultRng, ...invocation };

  const handler = customHandlers[effectId];
  if (handler) {
    try {
      await handler(ctx);
    } catch (e) {
      console.error(`Effect handler error: ${effectId}`, e);
    }
    return;
  }

  console.warn(`Effect handler not found: ${effectId}`);
}
