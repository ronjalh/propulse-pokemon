---
name: pokedex
description: Collection tracking with owned/seen/locked state per Person
---

# Pokédex

## Purpose
Grid view of all 88 Persons. Each shows as owned (full card), seen (battled against but never owned, silhouette + name), or locked (silhouette only). Gotta catch 'em all.

## Dependencies
- `person-model`, `card-instance`

## Deliverables
- `src/app/(game)/pokedex/page.tsx`
- `getUserPokedex(userId)` query returning each Person with state + owned count + shiny-owned count
- Filter by discipline, type, rarity
- Progress bar: `${ownedCount}/88` + `${shinyCount}/88 shinies`
- `/pokedex/[personId]` detail page with lore (title, discipline, base stats, learnset)

## Status
- [ ] Not started
