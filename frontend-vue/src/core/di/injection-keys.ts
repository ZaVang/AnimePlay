/**
 * 依赖注入的键值定义
 * 提供 TypeScript 类型安全的注入键
 */
import type { InjectionKey } from 'vue'
import type { InteractionSystem } from '@/core/systems/InteractionSystem'
import type { PersistentEffectSystem } from '@/core/systems/PersistentEffectSystem'
import type { DialogueSystem } from '@/core/systems/DialogueSystem'

// 战斗系统相关的注入键
export const BATTLE_INTERACTION_SYSTEM: InjectionKey<InteractionSystem> = Symbol('battle:interaction')
export const BATTLE_PERSISTENT_SYSTEM: InjectionKey<PersistentEffectSystem> = Symbol('battle:persistent')
export const BATTLE_DIALOGUE_SYSTEM: InjectionKey<DialogueSystem> = Symbol('battle:dialogue')

// 可以根据需要添加其他作用域的注入键
// export const NURTURE_INTERACTION_SYSTEM: InjectionKey<InteractionSystem> = Symbol('nurture:interaction')