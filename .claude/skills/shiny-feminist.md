---
name: shiny-feminist
description: Shiny "Feminist" variant mechanic — rare, +10% stats, alternate art
---

# Shiny Feminist

## Purpose
Every pulled card rolls a low-probability shiny chance. A shiny is called a "Feminist" card — it gets a title prefix, an alternate border, and +10% to all final stats. No gameplay-breaking power creep — just flex.

## Dependencies
- `stats-generator`, `card-instance`, `card-component`

## Deliverables
- `rollShiny(cardId)` in `src/lib/cards/stats.ts` (base 1/64; higher on Premium packs)
- `isShiny` persisted on the card row
- `computeFinalStats` applies 1.1× if shiny
- Visual treatment in `PropulseCard` (holo gradient, "Feminist" name prefix, glowing border)

## Status
- [ ] Not started
