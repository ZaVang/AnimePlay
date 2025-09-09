# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Standards

**Code Organization**:
- Keep files focused and under 200-300 lines
- Separate concerns into different files/modules
- Use clear file/folder hierarchy based on functionality
- Follow existing project structure patterns

**Implementation Approach**:
1. **Plan First**: Understand requirements and explain the implementation strategy
2. **Start Simple**: Build basic framework before adding complexity
3. **Mark TODOs**: Use `TODO` comments and placeholder functions for complex features that need future implementation

**Code Quality**:
- Use meaningful names for files, functions, and variables
- Add clear comments for functions and complex logic
- Mark incomplete features with detailed TODO comments including expected behavior

## Development Commands

**Development**:
- `npm run dev` - Start development server with hot reload
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier

**Build & Deploy**:
- `npm run build` - Type-check and build for production
- `npm run build-only` - Build without type checking
- `npm run preview` - Preview production build

## Project Architecture

This is a Vue 3 + TypeScript anime-themed card battle game using Vite, Pinia for state management, and TailwindCSS for styling.

### Core Game Architecture

**Game Flow**: The application loads master data (anime/character cards, skills) at startup via `gameDataStore.fetchGameData()` before mounting the Vue app.

**State Management** (Pinia stores):
- `gameDataStore` - Master data for anime cards, character cards, and skills
- `userStore` - User authentication, collections, decks, and gacha system
- Battle stores (`gameStore`, `playerStore`, `historyStore`) - Turn-based battle state

**Battle System**:
- **Turn Management**: `TurnManager` handles game initialization, turn flow, and victory conditions
- **Skill System**: Character skills defined in `/src/skills/` with effects in `/src/skills/effects/index.ts`
- **AI System**: AI opponents in `/src/core/ai/` with different strategies and profiles

### Key Directories

**Data Layer**:
- `/src/data/` - Static game data and generated UR character skills
- `/src/config/` - Game configuration (rarities, costs, AI profiles)

**Battle System**:
- `/src/core/battle/` - Core battle logic (TurnManager, etc.)
- `/src/core/ai/` - AI controllers and strategies
- `/src/core/systems/` - Game systems (status effects, etc.)

**Skills System**:
- `/src/skills/` - Skill definitions and effect handlers
- `/src/skills/effects/` - 130+ skill effect implementations

**UI Components**:
- `/src/components/battle/` - Battle-specific UI components
- `/src/components/` - General UI components (cards, modals, etc.)

### Important Technical Details

**Skill Binding**: UR character skills are mapped via `characterSkillsMap` in `/src/data/characterSkillsMap.ts`, which merges generated UR skills with custom mappings.

**Effect System**: Skills trigger effects through `runEffect()` in `/src/skills/effects/index.ts`. Each UR character has 2 skills (128 total) with dedicated effect handlers. All effects support async operations.

**Complex Interaction System**: Advanced skills support complex interactions:
- **InteractionSystem** (`/src/core/systems/InteractionSystem.ts`) - Manages hand viewing, card selection, type selection
- **PersistentEffectSystem** (`/src/core/systems/PersistentEffectSystem.ts`) - Handles cross-turn effects like temporary bonuses
- **InteractionManager** (`/src/components/battle/interaction/InteractionManager.vue`) - UI component that provides modals for user interactions
- All skill effects are async and support Promise-based complex interactions

**Data Loading**: Game requires API endpoints `/api/all_animes` and `/api/all_characters` to fetch master data. Images are served from `/data/images/[type]/[id].jpg`.

**Battle Context**: Effects receive `EffectContext` with battle event type (`onPlay`, `beforeResolve`, `afterResolve`), player ID, and game state access.

**Turn Integration**: Persistent effects are automatically processed at turn start/end via TurnManager integration.
---
# 番组游戏优化计划

## 🚀 高优先级优化 (进行中)

1. 代码结构优化

- 大组件拆分: NurtureActions.vue (867行) 和 InteractionPanel.vue (635行) 过于庞大，建议拆分为多个专职组件
- 类型安全: 发现多个文件中有TODO注释提及类型优化需求，特别是技能系统中的类型定义
- 依赖注入优化: 过多的单例模式 (InteractionSystem.getInstance()) 可考虑使用Vue的provide/inject

2. 性能优化亮点 ⭐

你已经实现了很多优秀的性能优化:
- ✅ 虚拟化组件 (VirtualGrid)
- ✅ 缓存系统 (gachaRotation)
- ✅ 智能阈值控制

建议进一步优化:
- 技能系统缓存: 130+技能效果可以添加结果缓存
- 战斗状态快照: 频繁的状态变更可使用immutable优化
- 资源懒加载: 角色养成的大量图片资源可按需加载

3. 用户体验提升

// 建议添加全局错误边界
// src/utils/errorBoundary.ts
export const setupErrorBoundary = () => {
window.addEventListener('unhandledrejection', handleAsyncError);
window.addEventListener('error', handleSyncError);
}

4. 架构升级建议

状态管理分层:
// 当前: 大而全的store
// 建议: 按功能域拆分
stores/
├── game/          # 游戏核心
├── battle/        # 战斗系统
├── character/     # 角色系统
└── ui/           # UI状态

组件组织:
components/
├── base/          # 基础组件
├── business/      # 业务组件
├── layout/        # 布局组件
└── feature/       # 功能组件

🚀 即时优化项目

高优先级 (1-2天)

1. 内存泄漏检查: 养成系统的定时器清理
2. 错误边界: 全局错误处理机制
3. 加载优化: 首屏加载时间优化

中优先级 (1周)

1. 组件拆分: 大型组件模块化
2. 测试覆盖: 关键业务逻辑单测
3. 类型完善: 减少any使用

低优先级 (长期)

1. 微前端: 如果项目继续扩大可考虑
2. 国际化: i18n支持
3. PWA: 离线体验

📊 技术债务清理

从TODO注释分析发现的技术债:
- 技能系统类型定义需要完善
- AI系统策略算法可优化
- 交互系统的异步处理需要统一
