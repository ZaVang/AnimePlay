# Store 迁移总结报告

## 已完成的迁移 ✅

### 1. 核心战斗文件 (6个)
- ✅ **BattleView.vue** - 仅类型导入,无需迁移实例
- ✅ **HandDisplay.vue** - 使用 collectionStore
- ✅ **TurnManager.ts** - 使用 authStore
- ✅ **GachaHistory.vue** - 使用 collectionStore
- ✅ **CardDetailModal.vue** - 使用 collectionStore + economyStore
- ✅ **AddToQueueModal.vue** - 使用 collectionStore + viewingStore

### 2. Composables (3个)
- ✅ **useInteractionEffects.ts** - 使用 authStore + economyStore + nurtureStore
- ✅ **useInteractionData.ts** - 使用 economyStore
- ✅ **useCharacterTraining.ts** - 无需 store,仅提供数据结构

### 3. 系统组件 (2个)
- ✅ **PlayerStatus.vue** - 使用 authStore + economyStore + deckStore
- ✅ **ActivityLog.vue** - 使用 authStore

## 剩余待迁移文件 (20个)

### 应用核心
1. ⏳ **src/App.vue**

### 战斗相关组件 (3个)
2. ⏳ **src/components/battle/ui/DeckSelector.vue**
3. ⏳ **src/components/battle/character/CharacterLineup.vue**
4. ⏳ **src/components/battle/CharacterSelectModal.vue**

### 收藏统计组件 (3个)
5. ⏳ **src/components/ViewingStats.vue**
6. ⏳ **src/components/CollectionStats.vue**
7. ⏳ **src/components/CollectionPreview.vue**

### 卡组管理组件 (2个)
8. ⏳ **src/components/decks/DeckEditor.vue**
9. ⏳ **src/components/decks/DeckList.vue**

### 角色培养组件 (9个)
10. ⏳ **src/components/nurture/interactions/DeepInteractions.vue**
11. ⏳ **src/components/nurture/interactions/QuickInteractions.vue**
12. ⏳ **src/components/nurture/CharacterProfile.vue**
13. ⏳ **src/components/nurture/CharacterSelector.vue**
14. ⏳ **src/components/nurture/actions/BattleTraining.vue**
15. ⏳ **src/components/nurture/actions/ResourceDisplay.vue**
16. ⏳ **src/components/nurture/actions/TrainingSystem.vue**
17. ⏳ **src/components/nurture/actions/SpecialActivities.vue**
18. ⏳ **src/components/nurture/DialogueSystem.vue**

### 观看队列组件 (1个)
19. ⏳ **src/components/WatchQueue.vue**

### Stores (1个)
20. ⏳ **src/stores/gachaStore.ts**

## 迁移映射规则

根据 `docs/store-migration-status.md` 中的映射表:

### authStore (`@/stores/modules/authStore`)
```typescript
// 导入
import { useAuthStore } from '@/stores/modules/authStore';
const authStore = useAuthStore();

// 属性映射
userStore.isLoggedIn → authStore.isLoggedIn
userStore.currentUser → authStore.currentUser
userStore.level → authStore.level
userStore.exp → authStore.exp
userStore.logs → authStore.logs
userStore.playerState.level → authStore.level
userStore.playerState.exp → authStore.exp

// 方法映射
userStore.login() → authStore.login()
userStore.logout() → authStore.logout()
userStore.addLog() → authStore.addLog()
userStore.addExp() → authStore.addExp()
```

### collectionStore (`@/stores/modules/collectionStore`)
```typescript
// 导入
import { useCollectionStore } from '@/stores/modules/collectionStore';
const collectionStore = useCollectionStore();

// 属性映射
userStore.animeCollection → collectionStore.animeCollection
userStore.characterCollection → collectionStore.characterCollection
userStore.favoriteAnime → collectionStore.favoriteAnime
userStore.favoriteCharacters → collectionStore.favoriteCharacters
userStore.animeGachaHistory → collectionStore.animeGachaHistory
userStore.characterGachaHistory → collectionStore.characterGachaHistory

// 方法映射
userStore.drawCards() → collectionStore.drawCards()
userStore.toggleFavorite() → collectionStore.toggleFavorite()
userStore.isFavorite() → collectionStore.isFavorite()
userStore.getAnimeCardCount() → collectionStore.getAnimeCardCount()
userStore.getCharacterCardCount() → collectionStore.getCharacterCardCount()
```

### deckStore (`@/stores/modules/deckStore`)
```typescript
// 导入
import { useDeckStore } from '@/stores/modules/deckStore';
const deckStore = useDeckStore();

// 属性映射
userStore.savedDecks → deckStore.savedDecks

// 方法映射
userStore.saveDeck() → deckStore.saveDeck()
userStore.deleteDeck() → deckStore.deleteDeck()
```

### economyStore (`@/stores/modules/economyStore`)
```typescript
// 导入
import { useEconomyStore } from '@/stores/modules/economyStore';
const economyStore = useEconomyStore();

// 属性映射
userStore.animeGachaTickets → economyStore.animeGachaTickets
userStore.characterGachaTickets → economyStore.characterGachaTickets
userStore.knowledgePoints → economyStore.knowledgePoints
userStore.playerState.knowledgePoints → economyStore.knowledgePoints
userStore.playerState.animeGachaTickets → economyStore.animeGachaTickets
userStore.playerState.characterGachaTickets → economyStore.characterGachaTickets

// 方法映射
userStore.spendTickets() → economyStore.spendTickets()
userStore.purchaseShopItem() → economyStore.purchaseShopItem()
userStore.dismantleCard() → economyStore.dismantleCard()
userStore.purchaseFromShop() → economyStore.purchaseFromShop()
userStore.dismantleAllDuplicates() → economyStore.dismantleAllDuplicates()
userStore.getTodayPurchaseCount() → economyStore.getTodayPurchaseCount()
userStore.canPurchaseItem() → economyStore.canPurchaseItem()
```

### viewingStore (`@/stores/modules/viewingStore`)
```typescript
// 导入
import { useViewingStore } from '@/stores/modules/viewingStore';
const viewingStore = useViewingStore();

// 属性映射
userStore.viewingQueue → viewingStore.viewingQueue
userStore.watchedAnime → viewingStore.watchedAnime
userStore.playerState.viewingQueue → viewingStore.viewingQueue
userStore.playerState.watchedAnime → viewingStore.watchedAnime

// 方法映射
userStore.addToViewingQueue() → viewingStore.addToViewingQueue()
userStore.collectFromViewingQueue() → viewingStore.collectFromViewingQueue()
```

### nurtureStore (`@/stores/modules/nurtureStore`)
```typescript
// 导入
import { useNurtureStore } from '@/stores/modules/nurtureStore';
const nurtureStore = useNurtureStore();

// 属性映射
userStore.characterNurtureData → nurtureStore.characterNurtureData
userStore.presetSquads → nurtureStore.presetSquads
userStore.towerProgress → nurtureStore.towerProgress

// 方法映射
userStore.getNurtureData() → nurtureStore.getNurtureData()
userStore.increaseAffection() → nurtureStore.increaseAffection()
userStore.enhanceAttribute() → nurtureStore.enhanceAttribute()
userStore.enhanceBattleStat() → nurtureStore.enhanceBattleStat()
userStore.addCharacterExp() → nurtureStore.addCharacterExp()
userStore.updateSquadMember() → nurtureStore.updateSquadMember()
userStore.updateSquadName() → nurtureStore.updateSquadName()
userStore.getSquadMembers() → nurtureStore.getSquadMembers()
userStore.getCurrentChallengeFloor() → nurtureStore.getCurrentChallengeFloor()
userStore.completeFloor() → nurtureStore.completeFloor()
userStore.hasCompletedFloor() → nurtureStore.hasCompletedFloor()
userStore.interactWithCharacter() → nurtureStore.interactWithCharacter()
userStore.giveGift() → nurtureStore.giveGift()
```

## 迁移步骤

对于每个待迁移文件:

1. **分析依赖**: 检查文件使用了 userStore 的哪些属性和方法
2. **确定需要的 stores**: 根据上面的映射表确定需要导入哪些新 stores
3. **更新导入语句**:
   ```typescript
   // 删除
   import { useUserStore } from '@/stores/userStore';

   // 添加需要的 stores
   import { useAuthStore } from '@/stores/modules/authStore';
   import { useCollectionStore } from '@/stores/modules/collectionStore';
   // ... 其他需要的 stores
   ```
4. **更新 store 实例**:
   ```typescript
   // 删除
   const userStore = useUserStore();

   // 添加
   const authStore = useAuthStore();
   const collectionStore = useCollectionStore();
   // ... 其他需要的 stores
   ```
5. **替换所有引用**: 使用查找替换功能,根据映射表替换所有 `userStore.xxx` 为对应的新 store 调用
6. **特别注意 playerState**: 所有 `userStore.playerState.xxx` 直接映射到对应 store 的属性,无需 playerState 中间层

## 验证迁移

完成每个文件的迁移后:

1. 运行类型检查: `npm run type-check`
2. 运行 linter: `npm run lint`
3. 手动测试相关功能
4. 更新 `docs/store-migration-status.md` 文档

## 注意事项

1. **类型导入**: 如果文件只导入 userStore 的类型(如 `Deck`, `LogEntry`),可以保留从 `@/stores/userStore` 导入类型,只迁移实例使用
2. **多个 stores**: 一个组件可能需要多个新 stores,不要遗漏任何一个
3. **计算属性**: 如果计算属性依赖 userStore,需要同时更新依赖
4. **watch/watchEffect**: 检查所有响应式监听,确保使用正确的 store 引用
5. **playerState 路径**: 特别注意 `userStore.playerState.xxx` 的迁移,直接使用对应 store 的属性

## 已迁移文件的统计

- ✅ 核心战斗文件: 6/6 (100%)
- ✅ Composables: 3/3 (100%)
- ✅ 系统组件: 2/2 (100%)
- ⏳ 待迁移文件: 0/20 (0%)

**总进度**: 11/31 文件完成 (35.5%)

## 下一步行动

建议按以下顺序完成剩余文件的迁移:

1. **高优先级** (核心功能):
   - App.vue
   - DeckSelector.vue, DeckEditor.vue, DeckList.vue
   - gachaStore.ts

2. **中优先级** (战斗和角色):
   - CharacterLineup.vue, CharacterSelectModal.vue
   - CharacterProfile.vue, CharacterSelector.vue

3. **低优先级** (统计和展示):
   - ViewingStats.vue, CollectionStats.vue, CollectionPreview.vue
   - WatchQueue.vue

4. **培养系统** (复杂但可独立):
   - 所有 nurture/interactions 和 nurture/actions 组件

完成所有迁移后,可以考虑移除旧的 `userStore.ts` 或将其标记为废弃。
