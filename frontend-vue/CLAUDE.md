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

This is a Vue 3 + TypeScript anime-themed card battle game featuring advanced dependency injection, comprehensive state management, and modular system design. Built with Vite, Pinia for state management, and TailwindCSS for styling.

### Core Architecture Patterns

**Application Bootstrap**: The app loads master data at startup via `gameDataStore.fetchGameData()` in `main.ts` before mounting the Vue app. Development mode includes debug tools for skill system analysis.

**Dependency Injection**: Advanced DI system (`/src/core/di/`) provides centralized service registration and composable-based injection for battle systems:
- `InteractionSystem` - Manages complex user interactions (hand viewing, card selection)
- `PersistentEffectSystem` - Handles cross-turn effects and temporary bonuses
- `DialogueSystem` - Manages character dialogue and narrative elements

**State Management Architecture** (Pinia stores):
- `gameDataStore` - Master data (anime/character cards, skills) with card binding logic
- `userStore` - Comprehensive user state (authentication, collections, decks, gacha, character nurturing)
- Battle stores (`gameStore`, `playerStore`, `historyStore`) - Turn-based battle state with snapshot system
- `gachaStore` - Gacha mechanics and probability calculations
- `settings` - User preferences and configuration

### Core Game Systems

**Battle System** (`/src/core/battle/`):
- **TurnManager**: Game initialization, turn flow, victory conditions, and AI integration
- **BattleController**: Orchestrates battle phases and state transitions
- **SkillSystem**: Handles skill execution, cooldowns, and effect triggers

**Calculation Engine** (`/src/core/calculation/`):
- **BattleEngine**: Core combat calculations and clash resolution
- **StrengthCalculator**: Card strength and synergy calculations
- **RewardCalculator**: Experience and progression rewards

**System Registry** (`/src/core/systems/`):
- **StatusEffectSystem**: Manages temporary effects and status conditions
- **ResourceManager**: Handles deck manipulation, card drawing, and TP management
- **BattleStateSnapshot**: State tracking and rollback capabilities
- **SkillCache**: Performance optimization for skill lookups

**AI System** (`/src/core/ai/`):
- **AIController**: AI decision making and turn execution
- **aiProfiles**: Predefined AI personalities and strategies
- Random deck generation and adaptive difficulty

### Skills Architecture

**Skills System** (`/src/skills/`):
- **registry.ts**: Centralized skill effect registration and execution
- **library.ts**: Skill definitions with metadata and triggers
- **utils.ts**: Effect helpers and common patterns
- **characters/**: 64 individual character skill implementations (128 total skills)

**Skill Execution Flow**:
1. Skills registered in `registry.ts` with effect handlers
2. Effects triggered through `runEffect()` with context
3. All effects support async operations and complex interactions
4. Character skills mapped via `characterSkillsMap.ts`

### User Experience Systems

**Character Nurturing** (`/src/components/nurture/`):
- **Character Development**: Level progression, attribute enhancement, affection systems
- **Battle Enhancements**: Percentage-based stat bonuses for combat
- **Interaction System**: Deep character interactions, gift system, dialogue trees

**Collection Management**:
- **Gacha System**: Multi-layered probability with pity mechanics
- **Deck Building**: Advanced deck editor with validation
- **Progress Tracking**: Tower climbing, viewing queue, achievement system

### Data Architecture

**Master Data** (`/src/data/`):
- `characterSkillsMap.ts` - Character to skill binding mappings
- `urCharacterSkills.ts` - Generated UR character skill definitions
- `characterDefaultSkills.ts` - Fallback skills by rarity

**Configuration** (`/src/config/`):
- `gameConfig.ts` - Centralized game balance and system parameters

**Types** (`/src/types/`):
- Comprehensive TypeScript definitions for all game entities
- Effect context and skill definition types
- Battle state and interaction interfaces

### UI Component Architecture

**Battle Interface** (`/src/components/battle/`):
- **Arena Components**: Field visualization, clash zones, topic bias indicators
- **Character System**: Lineup management, action modals, skill interfaces
- **Interaction Management**: Modal system for complex user choices
- **UI Controls**: Turn management, notifications, battle logs

**Game Features** (`/src/components/`):
- **Collection System**: Card displays, favorites, statistics
- **Deck Management**: Advanced deck editor with drag-drop
- **Gacha Interface**: Multi-pull animations, history tracking
- **Character Nurturing**: Training systems, interaction panels

**Utility Systems** (`/src/utils/`):
- Performance monitoring and error boundaries
- AI deck generation and testing utilities
- Image management and type guards

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