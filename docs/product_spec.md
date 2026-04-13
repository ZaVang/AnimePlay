# Product Spec: AnimePlay Dark Luxury Refinement

## 1. Project Goal
Elevate the AnimePlay UI/UX to a premium "Dark Luxury" standard. This involves establishing a new design system and applying it progressively, starting with the core style layer and the Gacha system.

## 2. Core Aesthetic Pillars
- **The Abyss Background**: Deep, layered charcoal-navy (#08080C).
- **Golden Circuitry**: Refined gold gradients (#D4A574 -> #F0C987) for primary actions and high-rarity highlights.
- **Glass-Substrate Layout**: Using Backdrop Blur (24px) and 1px border glows to define space.
- **Kinetic Typography**: Using Unbounded (Headers) and Geist Sans (Body) for high-end readability.

## 3. High-Level Architecture
- **Layer 0: Design System**: Tailwind configuration, Google Font injection, and Root CSS variables.
- **Layer 1: Global Identity**: Header, Navigation, and App Shell update to the new theme.
- **Layer 2: Feature Lighthouse**: A complete overhaul of `GachaView` as the benchmark for premium interaction.
- **Layer 3: Refined Feedback**: Micro-interactions, hover states, and "Quantic Reveal" animations.
- **Layer 4: Atomic Refinement**: Extracting reusable UI components (`TacticalButton`, `GlassPanel`, `RarityGradient`) to ensure consistency.
- **Layer 5: Environmental Energy** (Implemented): Particle systems and kinetic grid.
- **Layer 6: View Coverage (Core)** (Implemented): Battle and Collections refactored.
- **Layer 7: Full Spectrum Coverage** (Active): Bringing all remaining sub-pages (Squad, Nurture, Settings) into the ATL standard.
- **Layer 8: Narrative Finishing**: Custom GLSL shaders and interactive micro-lore.

## Phase 3 Goals (The Grand Unification)

1. **Strategic Deployment (Squad Battle)**: Refactor the grid-based squad editor into a "Tactical Briefing" interface.
2. **Bio-Logic Optimization (Nurture)**: Overhaul the leveling/tuning interface with high-fidelity editorial charts.
3. **Service Protocol (Settings)**: Finalize the terminal settings aesthetic.
4. **Global Audit**: Pure ATL consistency check across the entire application shell.

## Phase 4 Goals (The Absolute Polarization) - COMPLETED
- Editorial Analytics (Chart.js integration)
- Strategic Dispatch (Tactical Briefing Center)
- Bio-Logic Lab Refinement (Nurture Actions)
- Atmospheric Sensory Prototype (Audio Stubs & GLSL effects)

## Phase 5 Goals (Sensory Narrative)
- **Dynamic Narrative**: Progressive lore decoding in character profiles.
- **Advanced GLSL**: Interactive "Surge" effects (RGB shift, glitches) on successes.
- **Audio Protocol**: Synthetic blips and glassy chimes via Web Audio API.
- **Sensory Settings**: Toggle and volume controls for all NEW effects.

## 4. Acceptance Criteria
1. No "Muddy grays" or generic rounded corners remain in any major view.
2. The "Atmospheric Grid" is responsive to user interaction.
3. Common UI elements follow a unified Atomic component library.
4. The Gacha pull experience includes refined result modals and particle transitions.
