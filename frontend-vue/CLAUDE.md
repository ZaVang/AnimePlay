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

# 角色历练系统设计方案

## 🎯 系统概述

基于当前的角色经验值和基础属性系统，设计一个完整的**"角色历练系统"**，让角色的成长更有意义和乐趣。

### 🎮 核心玩法设计

#### 1. **历练副本系统**
- **日常试炼**: 每日刷新的挑战关卡
  - 智力试炼: 答题、解谜类，需要高智力值
  - 魅力试炼: 社交、表演类，需要高魅力值  
  - 体力试炼: 运动、探险类，需要高体力值
  - 综合试炼: 需要平衡发展的混合挑战

#### 2. **属性门槛机制**
- **解锁内容**: 基础属性达到特定值解锁新内容
  - 智力60+: 解锁"学院图书馆"特殊训练
  - 魅力70+: 解锁"校园偶像"活动
  - 体力80+: 解锁"运动社团"训练
  - 综合属性200+: 解锁"全能挑战"

#### 3. **经验值获取优化**
- **多样化经验来源**:
  - 基础训练: 15exp/属性点 (现有)
  - 战斗强化: 25exp/属性点 (现有)  
  - 历练副本: 50-200exp/次 (新增)
  - 属性突破: 500exp/次 (新增)
  - 校园活动: 30-100exp/次 (优化现有)

#### 4. **等级奖励系统**
- **等级里程碑奖励**:
  - 每5级: 解锁新的训练方式或活动
  - 每10级: 获得属性点数加成或特殊能力
  - 每20级: 解锁新的角色立绘或语音
  - 50级+: 解锁角色专属剧情线

### 🏗️ 技术实现方案

#### 1. **数据结构扩展**
```typescript
interface CharacterNurtureData {
  // ... 现有字段保持不变
  
  // 新增历练系统字段
  challeng: {
    dailyTrials: {
      intelligence: { completed: boolean; score: number; date: string };
      charm: { completed: boolean; score: number; date: string };  
      strength: { completed: boolean; score: number; date: string };
      comprehensive: { completed: boolean; score: number; date: string };
    };
    unlockedContent: string[]; // 已解锁的内容ID
    achievedMilestones: number[]; // 已达成的等级里程碑
  };
  
  // 属性突破系统
  attributeBreakthrough: {
    charm: number; // 突破等级 (0-5)
    intelligence: number;
    strength: number;
  };
}
```

#### 2. **新增组件规划**
- **ChallengeCenter.vue**: 历练中心主界面
- **DailyTrials.vue**: 日常试炼界面
- **AttributeBreakthrough.vue**: 属性突破界面
- **MilestoneRewards.vue**: 里程碑奖励展示

#### 3. **现有系统修复**
- 修复经验值计算中的NaN问题
- 优化等级进度显示逻辑
- 增强经验值获取的视觉反馈

### 📱 用户界面设计

#### 1. **历练中心入口**
- 在养成界面添加"历练中心"入口
- 显示每日试炼完成情况和推荐挑战

#### 2. **试炼界面布局**
- 上方: 角色属性和推荐试炼
- 中间: 四类试炼卡片 (智力/魅力/体力/综合)
- 下方: 奖励预览和历史记录

#### 3. **属性突破界面**
- 展示当前属性和突破进度
- 突破材料需求 (知识点 + 特定试炼完成)
- 突破后的效果预览

### 🎖️ 奖励机制设计

#### 1. **即时奖励**
- 经验值: 完成试炼获得大量经验
- 知识点: 根据试炼得分获得知识点
- 专属物品: 特定试炼的纪念品

#### 2. **长期激励**
- 连续完成奖励: 连续X天完成试炼的额外奖励
- 完美通关奖励: 所有试炼达到满分的特殊奖励
- 属性突破奖励: 突破后获得永久加成

### 🔧 实现优先级

#### Phase 1: 修复现有问题 (1-2天)
1. 修复经验值NaN显示问题
2. 确保等级计算逻辑正确
3. 添加经验值获取的视觉反馈

#### Phase 2: 基础历练系统 (3-4天)  
1. 设计并实现历练中心界面
2. 创建四类基础试炼
3. 实现属性门槛解锁机制

#### Phase 3: 深度功能 (5-6天)
1. 实现属性突破系统
2. 添加等级里程碑奖励
3. 完善试炼难度和奖励平衡

#### Phase 4: 体验优化 (2-3天)
1. 添加动画和音效反馈
2. 实现数据统计和成就系统
3. 优化用户引导和教程

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
- [x] **状态管理优化** - 大数据量卡片数组虚拟化 ⭐ **用户体验优化完成**
  - ✅ 创建自定义虚拟化网格组件 `VirtualGrid.vue`
  - ✅ CollectionsView 虚拟化 (阈值调整至：100张卡片，高度：180px)
  - ✅ DeckEditor 虚拟化 (阈值调整至：80张卡片，高度：150px)
  - ✅ 智能阈值检测系统，根据使用场景动态调整
  - ✅ 响应式网格布局支持，适配不同屏幕尺寸
  - ✅ 性能监控和调试工具集成
  - ✅ 兼容性回退机制 (少量数据时使用传统渲染)
  - ✅ **卡片名字遮挡问题修复** - 确保所有卡片内容完全可见
  - ✅ **用户可控制** - 新增虚拟化开关，用户可自由选择启用/禁用
  - ✅ **智能启用** - 大幅提高阈值，减少不必要的虚拟化触发

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
- [x] **动画反馈** - 战斗结果视觉效果 ⭐ **辩论式对话系统完成**
  - ✅ 创建DialogueSystem对话管理系统，支持多种对话类型和动作效果
  - ✅ 实现BattleSpeechBubble气泡对话框，支持打字机效果和角色头像
  - ✅ 添加BattleActionEffect动作特效，包含"异议！"、"反击！"等逆转裁判风格效果
  - ✅ 集成到BattleController，在战斗时自动触发生动的辩论对话
  - ✅ 丰富的对话内容库，包含友好安利、辛辣点评、反驳、赞同等多种场景
  - ✅ 响应式UI设计，支持历史对话显示和实时对话效果
  - ✅ 素材系统准备就绪，支持角色头像和表情切换

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
