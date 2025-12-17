/**
 * 依赖注入的组合式函数
 * 提供类型安全的注入和使用方式
 */
import { inject } from 'vue'
import { 
  BATTLE_INTERACTION_SYSTEM, 
  BATTLE_PERSISTENT_SYSTEM, 
  BATTLE_DIALOGUE_SYSTEM 
} from './injection-keys'
import type { InteractionSystem } from '@/core/systems/InteractionSystem'
import type { PersistentEffectSystem } from '@/core/systems/PersistentEffectSystem'
import type { DialogueSystem } from '@/core/systems/DialogueSystem'

/**
 * 获取战斗交互系统
 */
export function useBattleInteraction(): InteractionSystem {
  const system = inject(BATTLE_INTERACTION_SYSTEM)
  if (!system) {
    throw new Error('BattleInteractionSystem not provided. Make sure to provide it in the battle context.')
  }
  return system
}

/**
 * 获取持久效果系统
 */
export function usePersistentEffects(): PersistentEffectSystem {
  const system = inject(BATTLE_PERSISTENT_SYSTEM)
  if (!system) {
    throw new Error('PersistentEffectSystem not provided. Make sure to provide it in the battle context.')
  }
  return system
}

/**
 * 获取对话系统
 */
export function useDialogue(): DialogueSystem {
  const system = inject(BATTLE_DIALOGUE_SYSTEM)
  if (!system) {
    throw new Error('DialogueSystem not provided. Make sure to provide it in the battle context.')
  }
  return system
}

/**
 * 获取所有战斗系统（便于批量使用）
 */
export function useBattleSystems() {
  return {
    interaction: useBattleInteraction(),
    persistent: usePersistentEffects(),
    dialogue: useDialogue()
  }
}