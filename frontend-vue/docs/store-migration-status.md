# Store Migration Status Tracker

本文档追踪从旧 userStore (1310行) 到新模块化 stores 的迁移状态。

**最后更新**: 2025-10-09 18:30

---

## 📊 总体进度

- ✅ **模块化 Stores 创建**: 完成 (7/7)
- 🔄 **组件迁移**: 1/4 (25%)
- 🔄 **Composable 迁移**: 2/3 (67%)
- 📚 **文档**: 完成

---

## 🏗️ 模块化 Stores 状态

| Store | 文件路径 | 行数 | 状态 | 说明 |
|-------|---------|------|------|------|
| ✅ AuthStore | `src/stores/modules/authStore.ts` | 95 | 完成 | 用户认证、等级、经验、日志 |
| ✅ CollectionStore | `src/stores/modules/collectionStore.ts` | 230 | 完成 | 卡牌收藏、抽卡历史、保底系统 |
| ✅ DeckStore | `src/stores/modules/deckStore.ts` | 65 | 完成 | 卡组管理 |
| ✅ EconomyStore | `src/stores/modules/economyStore.ts` | 275 | 完成 | 货币、票券、商店、分解 |
| ✅ ViewingStore | `src/stores/modules/viewingStore.ts` | 165 | 完成 | 番剧观看队列、进度追踪 |
| ✅ NurtureStore | `src/stores/modules/nurtureStore.ts` | 480 | 完成 | 角色培养、小队、爬塔 |
| ✅ UserStoreV2 | `src/stores/userStoreV2.ts` | 145 | 完成 | Orchestrator 协调器 |

---

## 📱 Views 迁移状态

### 已迁移 (1/4)

| 组件 | 文件路径 | 迁移方案 | 完成日期 | 状态 |
|------|---------|---------|---------|------|
| ✅ SquadBattleView | `src/views/SquadBattleView.vue` | 直接模块导入 (authStore, nurtureStore) | 2025-10-09 | **已完成** |

### 待迁移 (3/4)

| 组件 | 文件路径 | 使用的 userStore 方法 | 优先级 | 状态 |
|------|---------|---------------------|--------|------|
| ⏳ NurtureView | `src/views/NurtureView.vue` | `isLoggedIn`, `getNurtureData()`, `increaseAffection()`, `enhanceAttribute()`, `enhanceBattleStat()`, `addCharacterExp()` | 中 | **待迁移** |
| ⏳ GachaView | `src/views/GachaView.vue` | `isLoggedIn`, `drawCards()`, `animeGachaTickets`, `characterGachaTickets`, `spendTickets()` | 中 | **待迁移** |
| ⏳ CollectionsView | `src/views/CollectionsView.vue` | `isLoggedIn`, `animeCollection`, `characterCollection`, `toggleFavorite()`, `favoriteAnime`, `favoriteCharacters` | 中 | **待迁移** |

---

## 🧩 Composables 迁移状态

### 已迁移 (2/3)

| Composable | 文件路径 | 迁移方案 | 完成日期 | 状态 |
|-----------|---------|---------|---------|------|
| ✅ useTowerBattle | `src/composables/useTowerBattle.ts` | 直接模块导入 (authStore, nurtureStore, economyStore) | 2025-10-09 | **已完成** |
| ✅ useSquadManager | `src/composables/useSquadManager.ts` | 直接模块导入 (nurtureStore) | 2025-10-09 | **已完成** |

### 无需迁移 (1/3)

| Composable | 文件路径 | 说明 | 状态 |
|-----------|---------|------|------|
| ✅ useBattlePersistence | `src/composables/useBattlePersistence.ts` | 无 userStore 依赖 | **无需迁移** |

---

## 🗺️ 迁移映射表

### userStore → 模块化 Stores 对照

| 旧方法/属性 | 新 Store 位置 | 用途 |
|-----------|-------------|------|
| `isLoggedIn` | `authStore.isLoggedIn` | 登录状态 |
| `currentUser` | `authStore.currentUser` | 当前用户名 |
| `level` | `authStore.level` | 玩家等级 |
| `exp` | `authStore.exp` | 玩家经验 |
| `logs` | `authStore.logs` | 活动日志 |
| `addLog()` | `authStore.addLog()` | 添加日志 |
| `login()` | `authStore.login()` | 登录 |
| `logout()` | `authStore.logout()` | 登出 |
| `addExp()` | `authStore.addExp()` | 添加经验 |
| `animeCollection` | `collectionStore.animeCollection` | 动画卡收藏 |
| `characterCollection` | `collectionStore.characterCollection` | 角色卡收藏 |
| `favoriteAnime` | `collectionStore.favoriteAnime` | 收藏的动画卡 |
| `favoriteCharacters` | `collectionStore.favoriteCharacters` | 收藏的角色卡 |
| `animeGachaHistory` | `collectionStore.animeGachaHistory` | 动画抽卡历史 |
| `characterGachaHistory` | `collectionStore.characterGachaHistory` | 角色抽卡历史 |
| `drawCards()` | `collectionStore.drawCards()` | 抽卡 |
| `toggleFavorite()` | `collectionStore.toggleFavorite()` | 切换收藏 |
| `savedDecks` | `deckStore.savedDecks` | 保存的卡组 |
| `saveDeck()` | `deckStore.saveDeck()` | 保存卡组 |
| `deleteDeck()` | `deckStore.deleteDeck()` | 删除卡组 |
| `animeGachaTickets` | `economyStore.animeGachaTickets` | 动画抽卡券 |
| `characterGachaTickets` | `economyStore.characterGachaTickets` | 角色抽卡券 |
| `knowledgePoints` | `economyStore.knowledgePoints` | 知识点 |
| `playerState.knowledgePoints` | `economyStore.knowledgePoints` | 知识点 (旧路径) |
| `spendTickets()` | `economyStore.spendTickets()` | 消费票券 |
| `purchaseShopItem()` | `economyStore.purchaseShopItem()` | 购买商店物品 |
| `dismantleCard()` | `economyStore.dismantleCard()` | 分解卡牌 |
| `viewingQueue` | `viewingStore.viewingQueue` | 观看队列 |
| `watchedAnime` | `viewingStore.watchedAnime` | 已看完的番剧 |
| `addToViewingQueue()` | `viewingStore.addToViewingQueue()` | 添加到观看队列 |
| `collectFromViewingQueue()` | `viewingStore.collectFromViewingQueue()` | 从队列收取奖励 |
| `characterNurtureData` | `nurtureStore.characterNurtureData` | 角色培养数据 |
| `presetSquads` | `nurtureStore.presetSquads` | 预设小队 |
| `towerProgress` | `nurtureStore.towerProgress` | 爬塔进度 |
| `getNurtureData()` | `nurtureStore.getNurtureData()` | 获取培养数据 |
| `increaseAffection()` | `nurtureStore.increaseAffection()` | 增加好感度 |
| `enhanceAttribute()` | `nurtureStore.enhanceAttribute()` | 强化属性 |
| `enhanceBattleStat()` | `nurtureStore.enhanceBattleStat()` | 强化战斗属性 |
| `addCharacterExp()` | `nurtureStore.addCharacterExp()` | 添加角色经验 |
| `updateSquadMember()` | `nurtureStore.updateSquadMember()` | 更新小队成员 |
| `updateSquadName()` | `nurtureStore.updateSquadName()` | 更新小队名称 |
| `getSquadMembers()` | `nurtureStore.getSquadMembers()` | 获取小队成员 |
| `getCurrentChallengeFloor()` | `nurtureStore.getCurrentChallengeFloor()` | 获取当前爬塔层数 |
| `completeFloor()` | `nurtureStore.completeFloor()` | 完成爬塔层数 |
| `hasCompletedFloor()` | `nurtureStore.hasCompletedFloor()` | 检查是否完成层数 |

---

## 📖 迁移指南

### 方案 1: 使用 Orchestrator (推荐)

```typescript
// 之前
import { useUserStore } from '@/stores/userStore';
const userStore = useUserStore();
userStore.isLoggedIn
userStore.addExp(100)
userStore.getNurtureData(id)

// 之后
import { useUserStoreV2 } from '@/stores/userStoreV2';
const userStore = useUserStoreV2();
userStore.auth.isLoggedIn
userStore.auth.addExp(100)
userStore.nurture.getNurtureData(id)
```

### 方案 2: 直接导入模块 (性能优化)

```typescript
// 之前
import { useUserStore } from '@/stores/userStore';
const userStore = useUserStore();
userStore.isLoggedIn
userStore.addExp(100)

// 之后
import { useAuthStore } from '@/stores/modules/authStore';
import { useNurtureStore } from '@/stores/modules/nurtureStore';

const authStore = useAuthStore();
const nurtureStore = useNurtureStore();

authStore.isLoggedIn
authStore.addExp(100)
nurtureStore.getNurtureData(id)
```

---

## 📝 迁移步骤模板

当你准备迁移某个组件时，按照以下步骤：

### 1. 分析依赖
```bash
# 查看组件使用了哪些 userStore 方法
grep "userStore\." src/views/YourView.vue
```

### 2. 更新导入
```typescript
// 移除旧导入
- import { useUserStore } from '@/stores/userStore';

// 添加新导入 (选择方案 1 或 2)
+ import { useUserStoreV2 } from '@/stores/userStoreV2';
// 或
+ import { useAuthStore } from '@/stores/modules/authStore';
+ import { useNurtureStore } from '@/stores/modules/nurtureStore';
```

### 3. 更新方法调用
参考上面的映射表，将所有 `userStore.xxx` 替换为对应的新路径。

### 4. 测试
运行类型检查和功能测试，确保迁移没有破坏现有功能。

### 5. 更新本文档
将组件从"待迁移"移动到"已迁移"，并更新日期。

---

## 🎯 下一步行动

### 推荐迁移顺序

1. ✅ **SquadBattleView** (最复杂,优先解决) - **已完成**
   - ✅ 包含 composables: useTowerBattle, useSquadManager
   - ✅ 使用了 auth, nurture, economy stores

2. **NurtureView** (中等复杂度) - **下一个目标**
   - 主要使用 nurture, auth stores

3. **GachaView** (中等复杂度)
   - 主要使用 collection, economy, auth stores

4. **CollectionsView** (较简单)
   - 主要使用 collection, auth stores

---

## 📚 参考文档

- **详细迁移示例**: `docs/store-refactoring-guide.md`
- **迁移示例代码**: `docs/store-migration-example.md`
- **Store 架构说明**: 查看各个 store 文件头部注释

---

## ✅ 迁移完成标准

迁移某个组件后,确保:

- [ ] 移除了 `import { useUserStore }`
- [ ] 所有 userStore 方法调用已更新为新路径
- [ ] 类型检查通过 (`npm run type-check`)
- [ ] 功能测试通过 (手动测试所有相关功能)
- [ ] 本文档已更新状态

---

**提示**: 两种 stores 可以并存！你可以逐个迁移,不必一次全部完成。旧的 `userStore.ts` 会继续为未迁移的组件服务。
