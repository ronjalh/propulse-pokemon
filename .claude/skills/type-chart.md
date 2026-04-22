---
name: type-chart
description: Super-effective / not-very-effective / immunity matrix
---

# Type Chart

## Purpose
Source of truth for how types interact. Drives damage calculation in battle.

## Dependencies
- `discipline-types`

## Deliverables
- `TYPE_EFFECTIVENESS` in `src/lib/data/type-mapping.ts` (already present)
- `typeMultiplier(attackType, defenderTypes)` returns `0 | 0.25 | 0.5 | 1 | 2 | 4`
- Visual type-chart page at `src/app/(game)/type-chart/page.tsx` for players to reference

## Status
- [x] Matrix written 2026-04-22
- [ ] Visual chart page
