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

## 4. Acceptance Criteria
1. No "Muddy grays" or generic rounded corners remain in the targeted sections.
2. High-contrast typography is readable and premium.
3. The Gacha pull logic remains functional but is visually transformed into a "Golden Signal" reveal.
