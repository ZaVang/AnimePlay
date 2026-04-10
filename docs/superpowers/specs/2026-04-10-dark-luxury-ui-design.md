# Design Spec: Dark Luxury - The Orchestrated Narrative Terminal

**Date**: 2026-04-10
**Author**: Antigravity (Superpowers Mode)
**Status**: Draft for Approval

## 1. Vision
Transform the AnimePlay UI from a "muddy industrial mockup" into a "premium narrative terminal." The design should feel like a high-end, secret intelligence device used for analyzing anime data. Every interaction should feel intentional, precise, and luxurious.

## 2. Visual Architecture

### A. Color Palette
| Name | Hex | Usage |
| :--- | :--- | :--- |
| **Base Abyss** | `#08080C` | Body background |
| **Panel Glass** | `#12121A` | Component containers (with blur) |
| **Surface High**| `#1C1C28` | Cards, Elevated buttons |
| **Signal White** | `#F0F0F0` | High-contrast headers |
| **Subtle Gray** | `#8E92B2` | Secondary text, inactive states |
| **Circuit Gold** | `#D4A574` | Primary accent, UR rarity, "Approved" state |
| **Signal Cyan** | `#48C5F4` | Secondary accent, Info, Player A theme |
| **Hazard Rose** | `#E57373` | Error, Enemy theme, Negative bias |

### B. Typography
- **Primary Header**: `Unbounded` (Geometric Tech)
- **Interface Text**: `Geist Sans` (Premium Minimal)
- **Technical Data**: `JetBrains Mono` (High-end Monospace)

### C. Styling Rules
- **Corner Radius**: 12px panel-level, 8px element-level. No 0px sharp cuts.
- **Glassmorphism**: `backdrop-filter: blur(24px)` for all major overlays.
- **Borders**: 1px crisp borders using `rgba(255, 255, 255, 0.08)`.
- **Motion**: `cubic-bezier(0.16, 1, 0.3, 1)` for all reveals (The Quantic Reveal).

## 3. Component Solutions

### GachaView (Personnel Recruitment)
- **Elimination of "Old Mobile Game" look**: Remove white backgrounds and indigo/pink defaults.
- **Atmospheric Background**: Use a subtle gradient mesh that responds to mouse movement.
- **Recruit Button**: Large, centered gold-bordered button with internal pulse.

### BattleView (Tactical Inference)
- **Data Slate Layout**: Reorganize the center area to feel like a datapad.
- **Topic Bias Bar**: Vertical segmented progress bar with "fluorescent" filling effect.
- **Clash Zone**: Holographic projection style with translucent card slots.

### NurtureView (Optimization)
- **Profile Layout**: High-end magazine-style typography (Editorial Luxury).
- **Stat Graphs**: Minimalist line-art radars instead of chunky bars.

## 4. Implementation Checklist
- [ ] Add `@font-face` or Google Font links to `index.html`.
- [ ] Overwrite `tailwind.config.js` with the new color system.
- [ ] Update `main.css` to include the global "Quantic Reveal" and "Glass Substrate" classes.
- [ ] Rewrite `GachaView` to use the new "Abyss" color scheme.
