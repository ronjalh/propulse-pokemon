---
name: card-component
description: Predefined Tailwind card UI with type gradient, stats, and moves
---

# Card Component

## Purpose
The visual card — used in collection views, pack-opening, battle, trade previews. One component, multiple size variants.

## Dependencies
- `design-system`, `card-instance`, `type-chart`

## Deliverables
- `src/components/card/PropulseCard.tsx` accepting `{ card, person, size: 'sm' | 'md' | 'lg' }`
- Gradient derived from primary type (+ secondary if dual)
- Shiny "Feminist" variant: alternate border, holo shimmer, "Feminist" prefix on name
- Shows: image (Next Image pointing to DigitalOcean URL), name, title, discipline badge, HP bar, 4 moves, rarity indicator
- Storybook-like example page at `src/app/(dev)/card-preview/page.tsx` (optional, dev-only)

## Status
- [ ] Not started
