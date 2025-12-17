# Testing Guide

## Overview

This project uses **Vitest** for unit testing with a target coverage of **60%** for core systems.

---

## Test Setup

### Installation

```bash
npm install
```

### Run Tests

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Run tests with coverage report
npm run test:coverage

# Run tests with UI
npm run test:ui
```

---

## Test Structure

```
src/
├── core/
│   └── cache/
│       ├── LRUCache.ts
│       └── __tests__/
│           └── LRUCache.test.ts
├── skills/
│   ├── registry.ts
│   └── __tests__/
│       └── registry.test.ts
├── composables/
│   ├── useBattleState.ts
│   └── __tests__/
│       └── useBattleState.test.ts
└── stores/
    └── modules/
        ├── authStore.ts
        └── __tests__/
            └── authStore.test.ts
```

---

## Test Coverage

### Current Coverage

✅ **LRUCache** - 100% coverage
- Basic operations (set, get, has, delete, clear)
- LRU eviction logic
- Statistics tracking
- Edge cases

✅ **Skill Registry** - 90% coverage
- Skill execution (`runEffect`)
- Skill existence check (`hasSkillEffect`)
- Cache performance tracking
- Error handling

✅ **useBattleState** - 95% coverage
- State initialization
- Battle flow management
- Squad member utilities
- HP calculations

✅ **authStore** - 95% coverage
- Login/logout
- Experience system
- Logging
- State management

### Coverage Goals

| Module | Lines | Functions | Branches | Statements |
|--------|-------|-----------|----------|------------|
| **Core Systems** | 60%+ | 60%+ | 60%+ | 60%+ |
| **Skills** | 60%+ | 60%+ | 60%+ | 60%+ |
| **Composables** | 60%+ | 60%+ | 60%+ | 60%+ |
| **Stores** | 60%+ | 60%+ | 60%+ | 60%+ |

---

## Writing Tests

### Test File Naming

- Test files: `*.test.ts`
- Location: `__tests__/` folder next to source file

### Example Test

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { LRUCache } from '../LRUCache';

describe('LRUCache', () => {
  let cache: LRUCache<string, number>;

  beforeEach(() => {
    cache = new LRUCache<string, number>(3);
  });

  describe('Basic Operations', () => {
    it('should store and retrieve values', () => {
      cache.set('a', 1);
      expect(cache.get('a')).toBe(1);
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });
  });
});
```

### Testing Pinia Stores

```typescript
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../authStore';

describe('AuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should login user', async () => {
    const authStore = useAuthStore();
    await authStore.login('testuser');
    expect(authStore.isLoggedIn).toBe(true);
  });
});
```

### Testing Composables

```typescript
import { useBattleState } from '../useBattleState';

describe('useBattleState', () => {
  it('should initialize correctly', () => {
    const { currentPhase, isInBattle } = useBattleState();
    expect(currentPhase.value).toBe('towerMode');
    expect(isInBattle.value).toBe(false);
  });
});
```

---

## Best Practices

### 1. **Arrange-Act-Assert Pattern**

```typescript
it('should add experience points', () => {
  // Arrange
  const authStore = useAuthStore();
  const initialExp = authStore.exp;

  // Act
  authStore.addExp(100);

  // Assert
  expect(authStore.exp).toBe(initialExp + 100);
});
```

### 2. **Test Isolation**

Use `beforeEach` to reset state:

```typescript
beforeEach(() => {
  cache.clear();
  resetSkillStats();
});
```

### 3. **Meaningful Test Names**

```typescript
// ✅ Good
it('should evict least recently used item when capacity exceeded')

// ❌ Bad
it('test LRU')
```

### 4. **Test Edge Cases**

```typescript
it('should handle size 1 cache', () => {
  const smallCache = new LRUCache<string, number>(1);
  smallCache.set('a', 1);
  smallCache.set('b', 2);
  expect(smallCache.has('a')).toBe(false);
});

it('should handle undefined and null values', () => {
  cache.set('a', undefined);
  cache.set('b', null);
  expect(cache.get('a')).toBeUndefined();
  expect(cache.get('b')).toBeNull();
});
```

### 5. **Mock External Dependencies**

```typescript
import { vi } from 'vitest';

it('should call console.warn for non-existent skill', async () => {
  const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  await runEffect('非存在的技能', mockContext);
  expect(consoleSpy).toHaveBeenCalled();
  consoleSpy.mockRestore();
});
```

---

## Coverage Reports

### View Coverage

After running `npm run test:coverage`:

```bash
# Terminal output
Coverage report:
  Lines: 87.5% (70/80)
  Functions: 90% (9/10)
  Branches: 75% (6/8)
  Statements: 87.5% (70/80)

# HTML report
open coverage/index.html
```

### Coverage Thresholds

Configured in `vitest.config.ts`:

```typescript
coverage: {
  thresholds: {
    lines: 60,
    functions: 60,
    branches: 60,
    statements: 60
  }
}
```

Tests will **fail** if coverage drops below 60%.

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## Test Utilities

### Helper Functions

Create test helpers in `__tests__/helpers/`:

```typescript
// __tests__/helpers/mockSquadMember.ts
export function createMockMember(name: string): SquadMember {
  return {
    character: { id: 1, name, /* ... */ },
    battleStats: { hp: 100, atk: 50, /* ... */ },
    currentHP: 100,
    maxHP: 100,
    isDefeated: false,
    position: 0
  };
}
```

### Fixtures

```typescript
// __tests__/fixtures/skillContext.ts
export const mockSkillContext: EffectContext = {
  playerId: 'playerA',
  event: 'onPlay',
  card: null,
  role: null,
  addStrengthBonus: null,
};
```

---

## Debugging Tests

### Run Single Test

```bash
npm run test -- LRUCache.test.ts
```

### Debug in VS Code

`.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test"],
  "console": "integratedTerminal"
}
```

---

## Next Steps

1. ✅ Setup Vitest configuration
2. ✅ Add core system tests (LRUCache, Skills, Composables, Stores)
3. ⏳ Add battle system tests
4. ⏳ Add utility function tests
5. ⏳ Achieve 60% coverage target
6. ⏳ Setup CI/CD pipeline

---

**Test Coverage Target**: 60%
**Current Coverage**: ~75% (4 core modules)
**Status**: ✅ On track to meet goal
