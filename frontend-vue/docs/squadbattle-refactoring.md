# SquadBattleView Refactoring Plan

## Overview

Refactor `SquadBattleView.vue` (986 lines) into modular composables and components.

**Goal**: Main view < 200 lines

---

## Architecture

### **Before** (Monolithic)
```
SquadBattleView.vue (986 lines)
├── State management (60 lines)
├── Persistence logic (47 lines)
├── Squad management (82 lines)
├── Battle logic (259 lines)
├── Utility functions (134 lines)
└── Template (404 lines)
```

### **After** (Modular)
```
SquadBattleView.vue (~150 lines)
├── useBattleState.ts (85 lines)
├── useSquadManager.ts (72 lines)
├── useBattlePersistence.ts (65 lines)
├── useTowerBattle.ts (135 lines)
├── SquadCard.vue (~80 lines)
├── BattleArena.vue (~120 lines)
└── BattleResult.vue (~60 lines)
```

---

## Composables

### 1. **useBattleState.ts** ✅ Created (85 lines)
**Responsibility**: Core battle state management

```typescript
import { useBattleState } from '@/composables/useBattleState';

const {
  currentPhase,
  playerSquad,
  enemySquad,
  battleLog,
  isInBattle,
  resetBattle,
  getFrontMember,
  getHPPercentage
} = useBattleState();
```

**Exports**:
- State refs: `currentPhase`, `playerSquad`, `enemySquad`, `battleLog`, etc.
- Computed: `isInBattle`
- Actions: `resetBattle`, `returnToTowerMode`, `getFrontMember`, `getHPPercentage`

---

### 2. **useSquadManager.ts** ✅ Created (72 lines)
**Responsibility**: Squad operations and character management

```typescript
import { useSquadManager } from '@/composables/useSquadManager';

const {
  getSquadCharacters,
  getSquadPower,
  getSquadMemberCount,
  createSquadMember
} = useSquadManager();

const power = getSquadPower(squadId);
const member = createSquadMember(character, 0);
```

**Exports**:
- `getSquadCharacters(id)` - Get squad member cards
- `getSquadPower(id)` - Calculate total power
- `getSquadMemberCount(id)` - Count active members
- `getUsedCharacterIds(id, excludePos)` - Get occupied character IDs
- `createSquadMember(character, pos)` - Create battle member

---

### 3. **useBattlePersistence.ts** ✅ Created (65 lines)
**Responsibility**: SessionStorage persistence

```typescript
import { useBattlePersistence } from '@/composables/useBattlePersistence';

const { saveState, loadState, clearState } = useBattlePersistence(
  currentPhase,
  towerEnemyData
);

onMounted(() => loadState());
onBeforeUnmount(() => saveState());
```

**Exports**:
- `saveState()` - Save to sessionStorage
- `loadState()` - Load from sessionStorage
- `clearState()` - Clear sessionStorage

---

### 4. **useTowerBattle.ts** ✅ Created (135 lines)
**Responsibility**: Battle initiation and combat logic

```typescript
import { useTowerBattle } from '@/composables/useTowerBattle';

const {
  currentTowerFloor,
  startTowerBattle,
  startBattle,
  calculateRoundDamage,
  refreshTowerEnemies
} = useTowerBattle(
  playerSquad,
  enemySquad,
  currentPhase,
  // ... other reactive refs
);

startTowerBattle(squadId);
```

**Exports**:
- Computed: `currentTowerFloor`
- `startTowerBattle(squadId)` - Start tower challenge
- `startBattle(squadId)` - Start regular battle
- `calculateRoundDamage(attacker, defender)` - Combat calculation
- `refreshTowerEnemies()` - Regenerate enemies

---

## Components (TODO)

### 5. **SquadCard.vue** (~80 lines)
**Responsibility**: Display single squad with edit functionality

```vue
<template>
  <div class="squad-card">
    <h3>{{ squad.name }}</h3>
    <div class="members">
      <CharacterSlot
        v-for="i in 4"
        :key="i"
        :character="members[i-1]"
        :position="i-1"
        @select="openCharacterSelect"
        @remove="removeCharacter"
      />
    </div>
    <div class="stats">
      <p>战力: {{ squadPower }}</p>
      <p>成员: {{ memberCount }}/4</p>
    </div>
    <button @click="$emit('startBattle')">开始挑战</button>
  </div>
</template>
```

**Props**:
- `squadId: number`
- `squad: PresetSquad`

**Emits**:
- `startBattle`
- `editMember(position)`

---

### 6. **BattleArena.vue** (~120 lines)
**Responsibility**: Battle visualization and controls

```vue
<template>
  <div class="battle-arena">
    <SquadDisplay :squad="playerSquad" position="left" />
    <div class="battle-controls">
      <p>回合 {{ currentTurn }}</p>
      <button @click="executeRound">下一回合</button>
      <button @click="autoFinishBattle">一键结算</button>
    </div>
    <SquadDisplay :squad="enemySquad" position="right" />
    <BattleLog :logs="battleLog" />
  </div>
</template>
```

**Props**:
- `playerSquad: SquadMember[]`
- `enemySquad: SquadMember[]`
- `battleLog: string[]`
- `currentTurn: number`

**Emits**:
- `executeRound`
- `autoFinish`

---

### 7. **BattleResult.vue** (~60 lines)
**Responsibility**: Show battle results and rewards

```vue
<template>
  <div class="battle-result">
    <h2 v-if="result === 'victory'">🎉 胜利！</h2>
    <h2 v-else>💔 失败</h2>
    <div class="rewards">
      <p>经验: +{{ exp }}</p>
      <p>知识点: +{{ knowledge }}</p>
    </div>
    <button @click="$emit('restart')">再次挑战</button>
    <button @click="$emit('return')">返回</button>
  </div>
</template>
```

**Props**:
- `result: 'victory' | 'defeat'`
- `rewards: { exp: number; knowledge: number }`

**Emits**:
- `restart`
- `return`

---

## Refactored SquadBattleView.vue (~150 lines)

```vue
<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { useBattleState } from '@/composables/useBattleState';
import { useSquadManager } from '@/composables/useSquadManager';
import { useBattlePersistence } from '@/composables/useBattlePersistence';
import { useTowerBattle } from '@/composables/useTowerBattle';
import SquadCard from '@/components/battle/SquadCard.vue';
import BattleArena from '@/components/battle/BattleArena.vue';
import BattleResult from '@/components/battle/BattleResult.vue';
import { useUserStore } from '@/stores/userStore';

const userStore = useUserStore();

// Composables
const battleState = useBattleState();
const squadManager = useSquadManager();
const towerBattle = useTowerBattle(
  battleState.playerSquad,
  battleState.enemySquad,
  battleState.currentPhase,
  battleState.battleLog,
  battleState.currentTurn,
  battleState.isPlayerTurn,
  battleState.battleResult,
  battleState.selectedSquadForBattle,
  battleState.currentBattleMode,
  battleState.towerEnemyData,
  squadManager.createSquadMember
);
const persistence = useBattlePersistence(
  battleState.currentPhase,
  battleState.towerEnemyData
);

// Lifecycle
onMounted(() => persistence.loadState());
onBeforeUnmount(() => persistence.saveState());

// Handlers
function handleStartBattle(squadId: number) {
  towerBattle.startTowerBattle(squadId);
  persistence.saveState();
}

function handleRestart() {
  battleState.returnToTowerMode();
  persistence.saveState();
}
</script>

<template>
  <div class="squad-battle-view">
    <h1>挑战塔 - 第{{ towerBattle.currentTowerFloor }}层</h1>

    <!-- Tower Mode -->
    <div v-if="battleState.currentPhase === 'towerMode'">
      <SquadCard
        v-for="squad in userStore.presetSquads"
        :key="squad.id"
        :squad-id="squad.id"
        :squad="squad"
        @start-battle="handleStartBattle"
      />
      <button @click="towerBattle.refreshTowerEnemies">
        刷新敌人
      </button>
    </div>

    <!-- Battle Phase -->
    <BattleArena
      v-else-if="battleState.currentPhase === 'battle'"
      :player-squad="battleState.playerSquad"
      :enemy-squad="battleState.enemySquad"
      :battle-log="battleState.battleLog"
      :current-turn="battleState.currentTurn"
      @execute-round="executeRound"
      @auto-finish="autoFinishBattle"
    />

    <!-- Result Phase -->
    <BattleResult
      v-else-if="battleState.currentPhase === 'result'"
      :result="battleState.battleResult"
      :rewards="computedRewards"
      @restart="handleRestart"
      @return="battleState.returnToTowerMode"
    />
  </div>
</template>
```

---

## Migration Steps

1. ✅ Create composables (useBattleState, useSquadManager, useBattlePersistence, useTowerBattle)
2. ⏳ Create component: `SquadCard.vue`
3. ⏳ Create component: `BattleArena.vue`
4. ⏳ Create component: `BattleResult.vue`
5. ⏳ Refactor main `SquadBattleView.vue` to use composables and components
6. ⏳ Test all battle flows (tower, regular, victory, defeat)
7. ⏳ Remove old code after migration complete

---

## Benefits

**Maintainability**:
- Each composable has single responsibility
- Battle logic isolated from UI
- Easy to test individual pieces

**Reusability**:
- Composables can be used in other battle views
- Components reusable for different battle modes

**Performance**:
- Smaller components = smaller reactive graphs
- Better Vue change detection

**Line Count**:
- Main view: ~150 lines (84% reduction)
- Composables: ~357 lines total
- Components: ~260 lines total
- **Total**: ~767 lines (22% reduction + better organization)

---

**Status**: ✅ Composables created, components pending
**Next**: Create component files and refactor main view
