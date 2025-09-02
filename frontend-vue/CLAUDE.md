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