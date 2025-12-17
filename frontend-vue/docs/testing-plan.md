# 单元测试计划

## 测试现状 (2025-10-11)

### ✅ 已完成的测试
1. **LRUCache** - 17个测试，100%通过 ✅
   - 基本操作（get, set, has, clear）
   - LRU淘汰策略
   - 统计信息tracking
   - 边界情况

2. **useBattleState** - 19个测试，100%通过 ✅
   - 状态初始化
   - 战斗流程管理
   - 小队成员工具函数
   - HP计算

3. **authStore** - 需修复 async 问题 🔄
4. **skill registry** - 需修复 Pinia 初始化 🔄

---

## 📋 测试优先级计划

### 🔥 高优先级（重构相关）

#### 1. 模块化 Stores 测试
**目标**: 验证store重构的正确性

- **collectionStore** ⭐⭐⭐⭐⭐
  - `drawCards()` - 抽卡逻辑
  - `toggleFavorite()` - 收藏切换
  - `animePityState` / `characterPityState` - 保底状态
  - 重复卡牌检测

- **economyStore** ⭐⭐⭐⭐⭐
  - `spendTickets()` - 票券消耗
  - `purchaseShopItem()` - 商店购买
  - `dismantleCard()` - 卡牌分解
  - 知识点计算

- **deckStore** ⭐⭐⭐⭐
  - `saveDeck()` - 保存卡组
  - `deleteDeck()` - 删除卡组
  - 卡组验证

- **viewingStore** ⭐⭐⭐
  - `addToViewingQueue()` - 添加到观看队列
  - `collectFromViewingQueue()` - 收取奖励
  - 时间计算

- **nurtureStore** ⭐⭐⭐
  - `increaseAffection()` - 增加好感度
  - `enhanceAttribute()` - 强化属性
  - `addCharacterExp()` - 添加经验
  - 小队管理

#### 2. 依赖注入系统测试
**目标**: 验证DI架构的正确性

- **createBattleController** ⭐⭐⭐⭐⭐
  - 工厂函数创建
  - DialogueSystem注入
  - `initiateClash()` 逻辑
  - `respondToClash()` 逻辑
  - `passDefense()` 逻辑

- **DI Composables** ⭐⭐⭐⭐
  - `useDialogue()` - 注入测试
  - `useBattleInteraction()` - 注入测试
  - `usePersistentEffects()` - 注入测试
  - 缺少provider时的错误处理

### 🎯 中优先级（核心系统）

#### 3. 战斗系统测试
- **BattleEngine** ⭐⭐⭐⭐
  - `resolveClash()` - 冲突解决
  - 强度计算
  - 风格加成计算

- **StrengthCalculator** ⭐⭐⭐
  - `calculateFinalStrength()` - 最终强度
  - 协同效果加成
  - 临时buff加成

- **TurnManager** ⭐⭐⭐
  - 回合初始化
  - 回合切换
  - 胜利条件检测

#### 4. 技能系统测试
- **SkillSystem** ⭐⭐⭐
  - `onCardPlayed()` - 卡牌打出触发
  - `emitBeforeResolve()` - 解决前触发
  - `emitAfterResolve()` - 解决后触发
  - 冷却时间管理

### 📦 低优先级（辅助功能）

#### 5. 工具函数测试
- **gachaRotation** ⭐⭐
  - `getCurrentUpPool()` - 获取当前UP池
  - 轮换逻辑

- **CostCalculator** ⭐⭐
  - `getCostModification()` - 费用计算
  - 减免效果

---

## 🎨 测试模板

### Store 测试模板
```typescript
import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';
import { useCollectionStore } from '../collectionStore';

describe('CollectionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('drawCards', () => {
    it('should draw cards and update collection', () => {
      const store = useCollectionStore();
      // Test logic...
    });
  });
});
```

### 依赖注入测试模板
```typescript
import { describe, it, expect } from 'vitest';
import { createBattleController } from '../BattleController';
import type { DialogueSystem } from '@/core/systems/DialogueSystem';

describe('createBattleController', () => {
  it('should create controller with injected dialogue system', () => {
    const mockDialogue: DialogueSystem = {
      addDialogue: vi.fn(),
      generateAttackDialogue: vi.fn(),
      // ...
    };

    const controller = createBattleController(mockDialogue);
    expect(controller.dialogueSystem).toBe(mockDialogue);
  });
});
```

---

## 📊 覆盖率目标

| 模块 | 当前 | 目标 | 优先级 |
|------|------|------|--------|
| **stores/modules/** | ~20% | 80%+ | 🔥 高 |
| **core/di/** | 0% | 80%+ | 🔥 高 |
| **core/battle/** | ~10% | 60%+ | 🎯 中 |
| **core/calculation/** | ~5% | 60%+ | 🎯 中 |
| **core/systems/** | ~15% | 60%+ | 🎯 中 |
| **skills/** | ~10% | 50%+ | 📦 低 |
| **总体** | ~15% | **60%+** | - |

---

## 🚀 执行计划

### 第一阶段：修复现有测试 (当前)
- [x] 修复 LRUCache 测试
- [ ] 修复 authStore async 问题
- [ ] 修复 skill registry Pinia 问题

### 第二阶段：重构相关测试 (优先)
1. collectionStore 测试（重点：drawCards, pityState）
2. economyStore 测试（重点：spendTickets, purchaseShopItem）
3. createBattleController 测试（重点：工厂函数，DI）
4. DI composables 测试

### 第三阶段：核心系统测试
1. BattleEngine 测试
2. StrengthCalculator 测试
3. TurnManager 测试

### 第四阶段：达到60%覆盖率
1. 运行覆盖率报告
2. 识别未覆盖的关键路径
3. 补充测试直到达标

---

## 📝 测试命令

```bash
# 运行所有测试
npm run test

# 运行特定文件
npm run test src/stores/modules/__tests__/collectionStore.test.ts

# 运行覆盖率报告
npm run test:coverage

# 运行测试UI
npm run test:ui
```

---

**创建日期**: 2025-10-11
**目标**: 60% 测试覆盖率
**预计完成**: 2025-10-12
