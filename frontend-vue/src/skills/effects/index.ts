/**
 * 技能效果执行器（S4 重构）。
 * 分发顺序：真实现/交互式 handler（customHandlers.ts）→ 播报表（engine/skills/announcements.ts）。
 * 播报表条目统一渲染：`{name}` 替换为玩家名；未注册的 effectId 仅告警。
 * 类型（EffectContext 等）已上移 engine/skills/types —— 此处转发以兼容旧 import 路径。
 */
import { usePlayerStore, useGameStore, useHistoryStore } from '@/stores/battle';
import { ANNOUNCEMENTS, defaultRng, type EffectContext } from '@/engine';
import { customHandlers } from './customHandlers';

export type { EffectContext, BattleEvent, CombatRole } from '@/engine';

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

  const announce = ANNOUNCEMENTS[effectId];
  if (announce) {
    const playerStore = usePlayerStore();
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    if (announce.log) {
      useHistoryStore().addLog(announce.log.replaceAll('{name}', name), announce.logType ?? 'info');
    }
    if (announce.notify) {
      useGameStore().addNotification(announce.notify, announce.notifyType ?? 'info');
    }
    return;
  }

  console.warn(`Effect handler not found: ${effectId}`);
}
