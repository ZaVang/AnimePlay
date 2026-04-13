# Phase 5: Sensory Narrative Implementation Plan

**Goal:** Integrate procedural lore decoding, reactive GLSL "Surge" effects, and a high-tech synthetic audio protocol.

**Architecture:**
- **Store Layer**: `fxStore.ts` (Pinia) will centralize sound synthesis and visual effect triggers.
- **Component Layer**: `LoreDecoder.vue` will handle text shuffling. `TacticalButton.vue` will be the primary emitter of "Surge" events.
- **Service Layer**: Web Audio API implementation for zero-dependency sound synthesis.

**Tech Stack:** Vue 3, Pinia, Web Audio API, Vannila CSS (for GLSL-like filters).

---

### Task 1: Data Strategy & State
**Files:**
- Modify: `src/types/card.ts` (CharacterCard extension)
- Modify: `src/types/store.ts` (CharacterNurtureData extension)
- Modify: `src/stores/gameDataStore.ts` (Lore injection)
- Modify: `src/stores/modules/nurtureStore.ts` (Unlock logic)

- [ ] **Step 1: Update CharacterCard interface**
- [ ] **Step 2: Update CharacterNurtureData interface**
- [ ] **Step 3: Add sample lore fragments to core character cards** (Zero-One, Alpha-01, etc.)
- [ ] **Step 4: Implement unlock action in NurtureStore**

### Task 2: Digital Audio Synthesis (Web Audio API)
**Files:**
- Create: `src/core/audio/Synthesizer.ts`
- Create: `src/stores/modules/fxStore.ts`

- [ ] **Step 1: Implement `Synthesizer` class** (Sine/Square oscilators with envelope control)
- [ ] **Step 2: Create `fxStore` to manage audio context and volume**
- [ ] **Step 3: Implement sound presets** (Tick, Blip, Success, Warning)
- [ ] **Step 4: Update `useTacticalAudio.ts` to consume `fxStore`**

### Task 3: Sensory Narrative UI (Decoding & Surge)
**Files:**
- Create: `src/components/ui/LoreDecoder.vue`
- Modify: `src/components/ui/TacticalButton.vue`
- Modify: `src/components/nurture/CharacterProfile.vue`

- [ ] **Step 1: Create `LoreDecoder.vue`** (Text shuffling animation component)
- [ ] **Step 2: Add `pulse-surge` GLSL-like animation to `index.css`**
- [ ] **Step 3: Modify `TacticalButton.vue` to emit `fxStore` triggers**
- [ ] **Step 4: Integrate Lore decoding into `CharacterProfile.vue`**

### Task 4: Global Settings & Verification
**Files:**
- Modify: `src/views/SettingsModal.vue`
- [ ] **Step 1: Add volume sliders and toggle for Sensory FX**
- [ ] **Step 2: Integration test** (Clicking buttons results in Sound + Visual Surge)
- [ ] **Step 3: Performance Audit** (Ensuring 60FPS)
- [ ] **Step 4: Final build check**
