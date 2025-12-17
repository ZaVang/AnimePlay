# 依赖注入迁移指南

## 概述

本项目已**完全完成**从单例模式到 Vue 3 的 provide/inject 依赖注入模式的迁移，提供了：
- ✅ **更好的测试支持** - 可轻松 mock 服务
- ✅ **更好的内存管理** - 与组件生命周期绑定
- ✅ **类型安全** - 完整的 TypeScript 支持
- ✅ **更好的组件隔离** - 每个组件树可以有独立实例

**迁移完成日期**: 2025-10-11

## 已完成的系统重构

### 1. InteractionSystem
```typescript
// 旧方式（已废弃）
const system = InteractionSystem.getInstance()

// 新方式
import { useBattleInteraction } from '@/core/di/composables'
const system = useBattleInteraction()
```

### 2. PersistentEffectSystem
```typescript
// 旧方式（已废弃）
const system = PersistentEffectSystem.getInstance()

// 新方式
import { usePersistentEffects } from '@/core/di/composables'
const system = usePersistentEffects()
```

### 3. DialogueSystem
```typescript
// 旧方式（已废弃）
const system = DialogueSystem.getInstance()

// 新方式
import { useDialogue } from '@/core/di/composables'
const system = useDialogue()
```

## 在组件中使用

### 提供依赖（在根组件或特定区域）

```vue
<script setup lang="ts">
import { provide, onBeforeUnmount } from 'vue'
import { 
  InteractionSystem, 
  PersistentEffectSystem, 
  DialogueSystem,
  BATTLE_INTERACTION_SYSTEM,
  BATTLE_PERSISTENT_SYSTEM,
  BATTLE_DIALOGUE_SYSTEM
} from '@/core/di'

// 创建系统实例
const interactionSystem = new InteractionSystem()
const persistentSystem = new PersistentEffectSystem()
const dialogueSystem = new DialogueSystem()

// 提供给子组件
provide(BATTLE_INTERACTION_SYSTEM, interactionSystem)
provide(BATTLE_PERSISTENT_SYSTEM, persistentSystem)
provide(BATTLE_DIALOGUE_SYSTEM, dialogueSystem)

// 组件销毁时清理
onBeforeUnmount(() => {
  interactionSystem.cleanup()
  persistentSystem.cleanup()
  dialogueSystem.cleanup()
})
</script>
```

### 注入和使用（在子组件中）

```vue
<script setup lang="ts">
import { useBattleSystems } from '@/core/di/composables'

// 获取所有系统
const { interaction, persistent, dialogue } = useBattleSystems()

// 或单独获取
import { useBattleInteraction, usePersistentEffects } from '@/core/di/composables'
const interactionSystem = useBattleInteraction()
const persistentSystem = usePersistentEffects()

// 使用系统
async function viewOpponentHand() {
  await interactionSystem.viewOpponentHand('playerB', { count: 3, source: 'hand' })
}
</script>
```

## 技能效果中的使用

```typescript
// src/skills/effects/index.ts

// 创建效果上下文工厂
export function createEffectContext() {
  const interactionSystem = useBattleInteraction()
  const persistentSystem = usePersistentEffects()
  
  return { interactionSystem, persistentSystem }
}

// 在效果中使用
export async function effect_001() {
  const { interactionSystem, persistentSystem } = createEffectContext()
  
  // 使用系统...
  await interactionSystem.selectCards(/* ... */)
  persistentSystem.addTemporaryBonus(/* ... */)
}
```

## 测试支持

新的依赖注入系统使测试变得更容易：

```typescript
// 测试中可以轻松 mock 服务
const mockInteractionSystem = {
  viewOpponentHand: vi.fn(),
  selectCards: vi.fn()
}

provide(BATTLE_INTERACTION_SYSTEM, mockInteractionSystem)
```

## 迁移状态

✅ **已完成** (2025-10-11):
- InteractionSystem 重构
- PersistentEffectSystem 重构
- DialogueSystem 重构
- BattleView.vue 更新为 provide 模式
- BattleDialogueManager.vue 更新为 inject 模式
- HandDisplay.vue 使用 useDialogue composable
- AIController.ts 使用 systemRegistry
- 依赖注入基础设施（injection keys, composables）
- BattleController 完全重构为工厂函数模式
- **完全移除旧的单例代码和向后兼容导出**
- **技能效果系统验证（无单例调用）**

🎉 **迁移完成总结**:
- ✅ 所有 `getInstance()` 调用已移除
- ✅ BattleController 向后兼容代码已移除
- ✅ 所有组件正确使用 provide/inject 或 composables
- ✅ 类型检查通过（无新增错误）
- ✅ 20+ 处依赖注入使用点

## 最佳实践

1. **作用域管理**: 在合适的组件层级提供依赖
2. **生命周期绑定**: 确保在组件销毁时清理资源
3. **类型安全**: 使用提供的 TypeScript 类型和组合式函数
4. **错误处理**: 依赖注入的组合式函数会在找不到依赖时抛出清晰的错误信息

## 性能优化

- 系统实例现在与组件生命周期绑定，避免内存泄漏
- 每个组件树可以有独立的系统实例，提高隔离性
- 测试环境可以使用轻量级的 mock 实现