/**
 * 依赖注入系统的主入口
 * 提供便于使用的导出和工具函数
 */

export { BATTLE_INTERACTION_SYSTEM, BATTLE_PERSISTENT_SYSTEM, BATTLE_DIALOGUE_SYSTEM } from './injection-keys';
export { useBattleInteraction, usePersistentEffects, useDialogue, useBattleSystems } from './composables';
export { InteractionSystem } from '@/core/systems/InteractionSystem';
export { PersistentEffectSystem } from '@/core/systems/PersistentEffectSystem';
export { DialogueSystem } from '@/core/systems/DialogueSystem';