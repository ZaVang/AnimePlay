/**
 * 技能域的共享系统实例（S4 建立）。
 * 追踪器类是纯的（engine/skills），这里持有「本局」实例并桥接战斗日志；
 * 将来服务端按对局各建实例时，复用的同一套类。
 */
import { StatusEffectTracker, PersistentEffectTracker } from '@/engine';
import { useHistoryStore } from '@/stores/battle';

/** 一次性状态标记（如「下一张卡视为任意类型」）。 */
export const statusEffects = new StatusEffectTracker();

/** 跨回合持续效果；日志桥接到战斗日志 store。 */
export const persistentEffects = new PersistentEffectTracker(message => {
  useHistoryStore().addLog(message, 'info');
});

/** 对局结束/退出时清理两套状态（BattleView 卸载时调用）。 */
export function clearBattleSkillState() {
  statusEffects.clearAll();
  persistentEffects.clearAll();
}
