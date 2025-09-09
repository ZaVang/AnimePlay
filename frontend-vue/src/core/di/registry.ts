/**
 * 系统实例注册表 - 临时解决方案
 * 用于向后兼容那些还没有完全迁移到依赖注入的代码
 */
import type { InteractionSystem } from '@/core/systems/InteractionSystem';
import type { PersistentEffectSystem } from '@/core/systems/PersistentEffectSystem';
import type { DialogueSystem } from '@/core/systems/DialogueSystem';

class SystemRegistry {
  private interactionSystem?: InteractionSystem;
  private persistentSystem?: PersistentEffectSystem;
  private dialogueSystem?: DialogueSystem;

  registerSystems(systems: {
    interaction: InteractionSystem;
    persistent: PersistentEffectSystem;
    dialogue: DialogueSystem;
  }) {
    this.interactionSystem = systems.interaction;
    this.persistentSystem = systems.persistent;
    this.dialogueSystem = systems.dialogue;
  }

  getPersistentEffectSystem(): PersistentEffectSystem {
    if (!this.persistentSystem) {
      throw new Error('PersistentEffectSystem not registered. Make sure to call registerSystems() first.');
    }
    return this.persistentSystem;
  }

  getInteractionSystem(): InteractionSystem {
    if (!this.interactionSystem) {
      throw new Error('InteractionSystem not registered. Make sure to call registerSystems() first.');
    }
    return this.interactionSystem;
  }

  getDialogueSystem(): DialogueSystem {
    if (!this.dialogueSystem) {
      throw new Error('DialogueSystem not registered. Make sure to call registerSystems() first.');
    }
    return this.dialogueSystem;
  }

  clear() {
    this.interactionSystem = undefined;
    this.persistentSystem = undefined;
    this.dialogueSystem = undefined;
  }
}

// 导出单例实例（这是临时的向后兼容方案）
export const systemRegistry = new SystemRegistry();