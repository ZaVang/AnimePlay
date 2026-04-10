# Sprint Contract: Dark Luxury Foundation & Gacha Lighthouse

## 1. Scope of Work (The "What")
This sprint establishes the system-level design tokens and applies them to the global shell and the Gacha system.

## 2. Technical API & File Changes

### A. Design Tokens (tailwind.config.js)
- Define `theme.extend.colors.abyss` (`#08080C`)
- Define `theme.extend.colors.substrate` (`#12121A`)
- Define `theme.extend.colors.surface` (`#1C1C28`)
- Define `theme.extend.colors.gold` (`#D4A574`)
- Define `theme.extend.fontFamily.display` (`['Unbounded', 'sans-serif']`)
- Define `theme.extend.fontFamily.ui` (`['Geist Sans', 'sans-serif']`)

### B. Global Style (main.css)
- Implement `.glass-substrate` utility: `backdrop-filter: blur(24px)`, `border: 1px solid rgba(255, 255, 255, 0.08)`.
- Implement `.quantic-reveal` animation class.

### C. Feature Migration
- **App.vue**: Refactor the main template and nav cards to use `bg-substrate` and `border-white/5` instead of industrial/900.
- **GachaView.vue**: 
    - Full template overhaul: remove `bg-industrial-900`.
    - Apply `bg-abyss` to the main container.
    - Style the Draw buttons for the "Golden Signal" look.

## 3. Success Criteria (The "Pass/Fail")
- [ ] Tailwind theme colors/fonts are accessible in DevTools.
- [ ] Navigation header looks "Luxury" (Refined, high-contrast white text).
- [ ] Gacha page is entirely Dark Navy/Abyss, no grayscale/muddy panels.
- [ ] App launches without build errors.
