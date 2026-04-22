---
name: design-system
description: Type-color palette, gradients, shadcn theming, Framer Motion defaults
---

# Design System

## Purpose
Define the visual language for cards and UI: a color per Pokémon type, gradient + border tokens for cards, shadcn theme, and shared motion primitives.

## Dependencies
- `project-scaffold`

## Deliverables
- `src/lib/design/type-colors.ts` — `{ Fire: '#F08030', Water: '#6890F0', ... }`
- Tailwind v4 `@theme` directives for type colors (or CSS vars in `globals.css`)
- `src/lib/design/motion.ts` — shared transition/ease presets for Framer Motion
- Documented usage pattern (import + apply) in this skill

## Status
- [ ] Not started
