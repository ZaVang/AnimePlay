# Design Spec: Phase 5 - Sensory Narrative Convergence

**Date**: 2026-04-13
**Topic**: Sensory Surge (Lore + GLSL + Audio)
**Status**: DRAFT

## 1. Objective
Transform the AnimePlay interface from a functional "Dark Luxury" UI into an immersive, living "Tactical Command Terminal" by integrating procedural narrative fragments, event-driven GLSL visual effects, and a high-tech synthetic soundscape.

## 2. Core Pillars

### 2.1 Dynamic Narrative (Lore Layer)
- **Concept**: Option A (Static Fragments). Hand-crafted lore snippets anchored to specific characters and actions.
- **Implementation**:
    - Add a `lore_fragments` object to `CharacterCard` type and the `cardStore`.
    - **Interactive Reveal**: Lore is not displayed by default. It is revealed via a "Decoding" animation (Geist Mono font, random characters shuffling into readable text) on hover or interaction.
    - **Placement**: Subtle metadata zones in `CharacterProfile.vue` and `SquadCard.vue`.

### 2.2 Advanced GLSL Visuals (Visual Layer)
- **Concept**: Option 1 (Interactive/Reactive). High-impact visual feedback on user actions.
- **Implementation**:
    - **The "Surge" Effect**: On successful training or squad deployment, trigger a localized RGB shift, digital glitch, and scanline disruption around the active component.
    - **Layer 8 Finish**: Custom CSS-based/SVG GLSL-like filters applied during state transitions.
    - **Substrate Glow**: Neon pulsing shadows that intensify during interaction.

### 2.3 Tactical Audio Protocol (Auditory Layer)
- **Concept**: Option 2 (High-Tech Synthetic). Precision digital soundscape.
- **Implementation**:
    - **`useTacticalAudio` Activation**: Replace logic stubs with real Web Audio API synthesizers or high-fidelity binary assets.
    - **Feedback Palette**:
        - *Hover*: Ultra-low frequency "Hum" or short digital "Tick".
        - *Click*: High-tech "Blip" (Short, 440Hz+ sine/square mix).
        - *Success*: "Glassy Chime" (Compound frequency with resonance decay).
        - *Ambient*: A very quiet (0.05 vol) electronic "system noise" when in briefing/lab views.

## 3. Architecture & Components
- **`LoreEngine.vue` (New)**: A headless component or composable for handling the decoding animations.
- **`TacticalAudioStore` (New)**: Central state for volume control, asset loading, and mute logic.
- **`GlobalFXOverlay.vue` (New)**: A high-level component for handling screen-wide GLSL events (e.g., massive glitches).

## 4. User Experience (UX)
- **Non-Intrusive**: Lore and sound must feel like "Reward" for interaction, not clutter.
- **Latency**: GLSL/Audio triggers must be instantaneous (sub-50ms) to ensure tactical feedback.
- **Accessibility**: Provide a "Sensory Settings" menu in `SettingsModal.vue` to toggle Lore intensity, GLSL flashes, and Audio volume.

## 5. Success Criteria
- [ ] Users can discover at least 3 unique lore fragments per hero.
- [ ] Every "Initiate" button press results in a synchronized Visual + Audio "Surge".
- [ ] The app passes performance audit with all effects active (60FPS maintained).
