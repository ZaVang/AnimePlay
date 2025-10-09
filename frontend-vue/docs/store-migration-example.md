# Store Migration Example - SquadBattleView

本文档展示如何将组件从旧的 userStore 迁移到新的模块化 stores。

## 迁移步骤示例

### 之前 (使用 userStore)

```typescript
import { useUserStore } from '@/stores/userStore';

const userStore = useUserStore();

// 使用方法
userStore.isLoggedIn
userStore.addLog('消息', 'info')
userStore.addExp(100)
userStore.getNurtureData(characterId)
userStore.presetSquads
userStore.updateSquadMember(squadId, position, characterId)
userStore.towerProgress
userStore.completeFloor(floor)
```

### 之后 (使用模块化 stores)

#### 方案 1: 使用 Orchestrator (推荐用于新组件)

```typescript
import { useUserStoreV2 } from '@/stores/userStoreV2';

const userStore = useUserStoreV2();

// 使用方法 - 通过子 store 访问
userStore.auth.isLoggedIn
userStore.auth.addLog('消息', 'info')
userStore.auth.addExp(100)
userStore.nurture.getNurtureData(characterId)
userStore.nurture.presetSquads
userStore.nurture.updateSquadMember(squadId, position, characterId)
userStore.nurture.towerProgress
userStore.nurture.completeFloor(floor)
userStore.economy.knowledgePoints
```

#### 方案 2: 直接导入模块 (推荐用于性能优化)

```typescript
import { useAuthStore } from '@/stores/modules/authStore';
import { useNurtureStore } from '@/stores/modules/nurtureStore';
import { useEconomyStore } from '@/stores/modules/economyStore';

const authStore = useAuthStore();
const nurtureStore = useNurtureStore();
const economyStore = useEconomyStore();

// 使用方法 - 直接访问
authStore.isLoggedIn
authStore.addLog('消息', 'info')
authStore.addExp(100)
nurtureStore.getNurtureData(characterId)
nurtureStore.presetSquads
nurtureStore.updateSquadMember(squadId, position, characterId)
nurtureStore.towerProgress
nurtureStore.completeFloor(floor)
economyStore.knowledgePoints
```

## 完整迁移示例

### 迁移 useTowerBattle.ts

**之前**:
```typescript
import { useUserStore } from '@/stores/userStore';

export function useTowerBattle(...) {
  const userStore = useUserStore();

  function startTowerBattle(squadId: number) {
    if (!userStore.isLoggedIn) {
      userStore.addLog('请先登录！', 'warning');
      return;
    }

    const members = userStore.getSquadMembers(squadId);
    // ...
  }

  function endBattle() {
    userStore.addExp(totalExp);
    userStore.playerState.knowledgePoints += knowledgeReward;
    userStore.addCharacterExp(characterId, exp);
    userStore.completeFloor(floor);
  }
}
```

**之后 (方案 1)**:
```typescript
import { useUserStoreV2 } from '@/stores/userStoreV2';

export function useTowerBattle(...) {
  const userStore = useUserStoreV2();

  function startTowerBattle(squadId: number) {
    if (!userStore.auth.isLoggedIn) {
      userStore.auth.addLog('请先登录！', 'warning');
      return;
    }

    const members = userStore.nurture.getSquadMembers(squadId);
    // ...
  }

  function endBattle() {
    userStore.auth.addExp(totalExp);
    userStore.economy.knowledgePoints += knowledgeReward;
    userStore.nurture.addCharacterExp(characterId, exp);
    userStore.nurture.completeFloor(floor);
  }
}
```

**之后 (方案 2 - 更高性能)**:
```typescript
import { useAuthStore } from '@/stores/modules/authStore';
import { useNurtureStore } from '@/stores/modules/nurtureStore';
import { useEconomyStore } from '@/stores/modules/economyStore';

export function useTowerBattle(...) {
  const authStore = useAuthStore();
  const nurtureStore = useNurtureStore();
  const economyStore = useEconomyStore();

  function startTowerBattle(squadId: number) {
    if (!authStore.isLoggedIn) {
      authStore.addLog('请先登录！', 'warning');
      return;
    }

    const members = nurtureStore.getSquadMembers(squadId);
    // ...
  }

  function endBattle() {
    authStore.addExp(totalExp);
    economyStore.knowledgePoints += knowledgeReward;
    nurtureStore.addCharacterExp(characterId, exp);
    nurtureStore.completeFloor(floor);
  }
}
```

## 优势对比

### Orchestrator (userStoreV2)
✅ 一次性导入，统一管理
✅ 易于理解的层次结构
✅ 适合大型组件
⚠️ 需要通过 `.auth`, `.nurture` 等访问

### 直接模块导入
✅ 更好的 tree-shaking
✅ 更小的响应式图
✅ 更好的类型推断
⚠️ 需要导入多个 stores

## 推荐策略

- **新组件**: 使用 Orchestrator (userStoreV2)
- **性能关键组件**: 使用直接模块导入
- **大型重构**: 逐步迁移,先用 Orchestrator,后优化为直接导入
