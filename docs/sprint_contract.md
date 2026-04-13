# Sprint Contract: Phase 5 - Sensory Narrative Convergence

## 1. Deliverables

### D1: Lore Core Expansion
- **Type Definitions**: Extend `CharacterCard` and `CharacterNurtureData` in `types/card.ts` and `types/store.ts` to include `loreFragments`.
- **Data Seed**: Inject localized lore fragments for at least 3 core characters.
- **Decoding UI**: Implement `LoreDecoder.vue` (headless/composable style) to handle shuffling character animations.

### D2: Surge GLSL System
- **Event Bus**: Implement a `SurgeEvent` trigger system (e.g., in `authStore` or a dedicated `fxStore`).
- **Reactive Overlays**: Integrate RGB Shift and Glitch CSS/SVG filters into `TacticalButton.vue` and `NurtureActions.vue` that trigger on success events.

### D3: Audio Protocol V1
- **`useTacticalAudio.ts` Logic**: Implement a Tone.js or Web Audio API based synthesizer for "Synthetic Blips".
- **Interaction Mapping**: Bind specific frequencies/waveforms to Hover, Click, Success, and Warning events.
- **Global Settings**: Extend `SettingsModal.vue` with individual volume/toggle controls for Sensory FX.

## 2. Technical Standards
- **Performance**: Maintain 60 FPS on all GLSL transitions.
- **Latency**: Audio feedback must respond within < 50ms of user interaction.
- **Refactoring**: Maintain 100% Geist Mono and ATL consistency. purge any leftover industrial artifacts.

## 3. Definition of Done
- [ ] Lore fragments decoded correctly on hover/reveal interaction.
- [ ] GLSL "Surge" visible and synchronized with Audio "Chime" on successful actions.
- [ ] Global toggle in Settings correctly disables/enables all Phase 5 FX.
- [ ] Build passes with `npm run build-only`.
