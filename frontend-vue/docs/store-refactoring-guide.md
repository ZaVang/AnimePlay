# Store Refactoring Guide

## Overview

The monolithic `userStore.ts` (1310 lines) has been refactored into **6 focused stores** with an orchestrator pattern.

**Before**: Single 1310-line file handling all user-related state
**After**: 6 modular stores (~150-250 lines each) + 1 orchestrator (~100 lines)

---

## New Store Structure

### 1. **AuthStore** (`stores/modules/authStore.ts`) - 95 lines
**Responsibility**: User authentication, level progression, and logging

```typescript
import { useAuthStore } from '@/stores/modules/authStore';

const authStore = useAuthStore();
authStore.login('username');
authStore.addExp(100);
authStore.addLog('Message', 'success');
```

**State**:
- `currentUser` - Username
- `level` - Player level
- `exp` - Experience points
- `logs` - Activity logs

**Actions**:
- `login(username)` - Login user
- `logout()` - Logout user
- `addExp(amount)` - Add experience (handles level-ups)
- `addLog(message, type)` - Add activity log

---

### 2. **CollectionStore** (`stores/modules/collectionStore.ts`) - 230 lines
**Responsibility**: Card collections, gacha history, pity system

```typescript
import { useCollectionStore } from '@/stores/modules/collectionStore';

const collectionStore = useCollectionStore();
await collectionStore.drawCards('anime', 10);
collectionStore.toggleFavorite(cardId, 'anime');
```

**State**:
- `animeCollection` / `characterCollection` - Owned cards
- `favoriteAnime` / `favoriteCharacters` - Favorite cards
- `animeGachaHistory` / `characterGachaHistory` - Draw history
- `animePityState` / `characterPityState` - Pity counters

**Actions**:
- `drawCards(type, count)` - Perform gacha
- `toggleFavorite(id, type)` - Toggle favorite status
- `getAnimeCardCount(id)` / `getCharacterCardCount(id)` - Get card counts

---

### 3. **DeckStore** (`stores/modules/deckStore.ts`) - 65 lines
**Responsibility**: Deck management

```typescript
import { useDeckStore } from '@/stores/modules/deckStore';

const deckStore = useDeckStore();
await deckStore.saveDeck(deck);
await deckStore.deleteDeck('DeckName');
```

**State**:
- `savedDecks` - Saved deck configurations

**Actions**:
- `saveDeck(deck)` - Save deck
- `deleteDeck(name)` - Delete deck

---

### 4. **EconomyStore** (`stores/modules/economyStore.ts`) - 275 lines
**Responsibility**: Currency, tickets, shop, dismantling

```typescript
import { useEconomyStore } from '@/stores/modules/economyStore';

const economyStore = useEconomyStore();
economyStore.purchaseShopItem(item);
economyStore.dismantleCard(cardId, 'anime');
economyStore.addRewards({ animeTickets: 5, knowledge: 100 });
```

**State**:
- `animeGachaTickets` / `characterGachaTickets` - Gacha tickets
- `knowledgePoints` - Shop currency
- `dailyPurchases` - Daily purchase limits

**Actions**:
- `purchaseShopItem(item)` - Buy from shop
- `dismantleCard(id, type)` - Dismantle single card
- `dismantleAllDuplicates(type)` - Dismantle all duplicates
- `addRewards(rewards)` - Add tickets/knowledge (for level-ups)
- `spendTickets(type, count)` - Spend tickets

---

### 5. **ViewingStore** (`stores/modules/viewingStore.ts`) - 165 lines
**Responsibility**: Anime viewing queue and progress tracking

```typescript
import { useViewingStore } from '@/stores/modules/viewingStore';

const viewingStore = useViewingStore();
viewingStore.addToViewingQueue(animeId, 0);
viewingStore.collectFromViewingQueue(0);
```

**State**:
- `viewingQueue` - Active viewing slots
- `watchedAnime` - Completed anime IDs
- `viewingStats` - Viewing statistics (time, genres, streaks)

**Actions**:
- `addToViewingQueue(id, slot)` - Start watching
- `collectFromViewingQueue(slot)` - Collect rewards

---

### 6. **NurtureStore** (`stores/modules/nurtureStore.ts`) - 480 lines
**Responsibility**: Character development, squads, tower

```typescript
import { useNurtureStore } from '@/stores/modules/nurtureStore';

const nurtureStore = useNurtureStore();
nurtureStore.increaseAffection(characterId, 10);
nurtureStore.enhanceBattleStat(characterId, 'atk', 5);
nurtureStore.updateSquadMember(squadId, position, characterId);
```

**State**:
- `characterNurtureData` - Character progression
- `presetSquads` - Saved squad formations
- `towerProgress` - Tower climbing progress

**Actions**:
- `getNurtureData(id)` - Get character data
- `increaseAffection(id, amount)` - Increase affection
- `enhanceAttribute(id, attr, amount)` - Enhance attributes
- `enhanceBattleStat(id, stat, amount)` - Enhance battle stats
- `addCharacterExp(id, exp)` - Add character experience
- `updateSquadMember(squadId, pos, charId)` - Update squad
- `completeFloor(floor)` - Complete tower floor

---

## Orchestrator Pattern

### **UserStoreV2** (`stores/userStoreV2.ts`) - 110 lines
**Responsibility**: Coordinate stores, handle save/load

```typescript
import { useUserStoreV2 } from '@/stores/userStoreV2';

const userStore = useUserStoreV2();

// Login/Logout
await userStore.login('username');
await userStore.logout();

// Access sub-stores
userStore.auth.addLog('Message', 'info');
userStore.economy.knowledgePoints;
userStore.collection.drawCards('anime', 10);

// Save/Load
await userStore.saveStateToServer(true);
```

**Architecture**:
- Exposes all 6 sub-stores via properties
- Coordinates save/load operations
- Watches for level-ups to add rewards to economy
- Handles cross-store dependencies

---

## Migration Guide

### Option 1: Gradual Migration (Recommended)

Keep the old `userStore.ts` and gradually migrate components:

```typescript
// Old code
import { useUserStore } from '@/stores/userStore';
const userStore = useUserStore();
userStore.addExp(100);

// New code
import { useAuthStore } from '@/stores/modules/authStore';
const authStore = useAuthStore();
authStore.addExp(100);
```

### Option 2: Use Orchestrator

Use the orchestrator as a drop-in replacement:

```typescript
// Replace
import { useUserStore } from '@/stores/userStore';
const userStore = useUserStore();

// With
import { useUserStoreV2 } from '@/stores/userStoreV2';
const userStore = useUserStoreV2();

// Then access via sub-stores
userStore.auth.addExp(100);
userStore.economy.purchaseShopItem(item);
```

### Option 3: Direct Module Usage

Import only what you need:

```typescript
// Component only needs gacha
import { useCollectionStore } from '@/stores/modules/collectionStore';
import { useEconomyStore } from '@/stores/modules/economyStore';

const collectionStore = useCollectionStore();
const economyStore = useEconomyStore();
```

---

## Migration Mapping

| Old UserStore Method | New Store Location |
|---------------------|-------------------|
| `login()` | `authStore.login()` |
| `logout()` | `authStore.logout()` |
| `addExp()` | `authStore.addExp()` |
| `addLog()` | `authStore.addLog()` |
| `drawCards()` | `collectionStore.drawCards()` |
| `toggleFavorite()` | `collectionStore.toggleFavorite()` |
| `saveDeck()` | `deckStore.saveDeck()` |
| `deleteDeck()` | `deckStore.deleteDeck()` |
| `purchaseShopItem()` | `economyStore.purchaseShopItem()` |
| `dismantleCard()` | `economyStore.dismantleCard()` |
| `addToViewingQueue()` | `viewingStore.addToViewingQueue()` |
| `collectFromViewingQueue()` | `viewingStore.collectFromViewingQueue()` |
| `getNurtureData()` | `nurtureStore.getNurtureData()` |
| `increaseAffection()` | `nurtureStore.increaseAffection()` |
| `enhanceBattleStat()` | `nurtureStore.enhanceBattleStat()` |
| `updateSquadMember()` | `nurtureStore.updateSquadMember()` |

---

## Benefits

### 1. **Maintainability**
- Each store has a single, clear responsibility
- Easier to locate and fix bugs
- Reduced cognitive load

### 2. **Performance**
- Smaller reactive graphs (Vue only re-renders affected components)
- Lazy loading possible (import only needed stores)

### 3. **Testability**
- Each store can be tested in isolation
- Mock dependencies easier

### 4. **Scalability**
- Add new features without bloating existing stores
- Clear boundaries for team collaboration

---

## Testing the Refactored Stores

```typescript
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/modules/authStore';

describe('AuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should add experience and level up', () => {
    const authStore = useAuthStore();
    authStore.addExp(1000);
    expect(authStore.level).toBeGreaterThan(1);
  });
});
```

---

## Next Steps

1. **Test the new stores** in development mode
2. **Update main.ts** if using orchestrator pattern
3. **Migrate components** one at a time
4. **Remove old userStore.ts** once fully migrated
5. **Update documentation** with new patterns

---

**Last Updated**: 2025-10-07
**Status**: ✅ Ready for testing
**Breaking Changes**: None (both old and new can coexist)
