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

### Development Notes

**UR Character Skills**: Generated from external design document via `scripts/generateUrSkills.js`. The system supports both legacy `effectId`-based skills and new direct skill ID handlers.

**Complex Interactions Implementation**: The complex interaction system is now fully implemented:
- Hand viewing with filtering and type display (牧濑红莉栖's "时间理论")
- Card selection from hand/deck with quantity controls (洛琪希's "魔法指导")
- Type selection from available card types (赫萝's "商业智慧")
- Persistent effects with automatic duration tracking and cross-turn bonus application
- All interactions are non-blocking and provide smooth user experience

**Type Safety**: Uses strict TypeScript with Vue composition API. Card types defined in `/src/types/` include `AnimeCard`, `CharacterCard`, and `Skill` interfaces.

**Testing Integration**: Complex interactions can be tested using UR character skills in battle. The InteractionManager is automatically set up in BattleView and ready for use.

---

# 番组游戏优化计划

## 🚀 高优先级优化 (进行中)

### 1. 性能优化
- [x] 实现动态抽卡轮换系统
- [x] **gachaRotation 缓存机制** - 避免重复计算日期和卡片索引
  - ✅ 实现多级缓存系统 (UP池缓存、轮换计时器缓存、卡片筛选缓存)
  - ✅ 添加缓存清理机制防止内存泄漏
  - ✅ 提供缓存统计和调试功能
- [x] **完善 TypeScript 类型** - 减少 `as any` 使用，提高类型安全
  - ✅ 创建类型守卫函数 `isAnimeCard` 和 `isCharacterCard`
  - ✅ 修复 gacha 组件中的类型断言问题
  - ✅ 改进 gachaRotation 工具函数的类型定义
- [ ] 状态管理优化 - 大数据量卡片数组虚拟化

### 2. 用户体验优化
- [x] **加载状态** - 抽卡、战斗等异步操作
  - ✅ GachaView: 抽卡按钮加载状态和防重复点击
  - ✅ GachaShop: 购买按钮加载状态和防重复操作
  - ✅ 添加旋转加载动画和状态提示
- [x] **错误处理** - 统一错误处理和用户友好提示
  - ✅ 抽卡券不足检查和友好提示
  - ✅ 知识点不足检查和提示
  - ✅ 错误信息自动消失机制
  - ✅ 可关闭的错误提示界面
- [ ] **动画反馈** - 抽卡、战斗结果视觉效果

## 🎮 游戏功能补充 (计划中)

### 3. 核心系统扩展
- [ ] 数据持久化 - 可靠的保存/读取系统
- [ ] 成就系统 - 里程碑奖励机制
- [ ] 每日任务系统 - 日常玩法内容
- [ ] 教程引导系统

### 4. 社交功能
- [ ] 排行榜系统 - 战斗胜率、收集进度
- [ ] 好友系统 - 互赠、对战功能

## 🛠 技术架构升级 (长期)

### 5. 代码质量
- [ ] 测试覆盖 - 单元测试和集成测试
- [ ] 配置分层 - 模块化 gameConfig
- [ ] 国际化支持 - 多语言系统

### 6. 现代化特性
- [ ] PWA支持 - 离线游戏体验
- [ ] 响应式设计 - 移动端适配
- [ ] 主题系统 - 深色模式等

---
## 执行顺序

**当前阶段：性能优化** ✅ 已完成
1. ✅ gachaRotation 缓存机制
2. ✅ TypeScript 类型完善  
3. ✅ 加载状态和错误处理

**下一阶段：用户体验**
4. 动画反馈系统 - 抽卡特效和视觉反馈
5. 成就系统 - 里程碑奖励
6. 每日任务 - 日常活动内容

**最终阶段：架构升级**
7. 测试系统
8. PWA 功能
9. 国际化支持

---
*优化计划更新时间：2025-09-03*