---
name: card-instance
description: Card-instance DB model — each pulled card has its own seeded stats, shiny flag, and owner
---

# Card Instance

## Purpose
A `card` row is one pulled copy of a Person. Stats are seeded deterministically from the card's own id so stats never change, but two cards of the same Person can differ.

## Dependencies
- `person-model`, `stats-generator`, `shiny-feminist`

## Deliverables
- `cards` table in schema:
  - `id` (uuid, pk) — the seed
  - `personId` (fk → persons)
  - `ownerId` (fk → users, nullable for trade in-flight)
  - `isShiny` (boolean)
  - `ivs` (jsonb: six stats, 1–31)
  - `moves` (jsonb array of 4 move ids)
  - `pulledAt` (timestamptz)
  - `nature` (enum, optional polish)
- Migration generated
- Helper: `computeFinalStats(card, person)` — applies IVs + base stats + shiny multiplier

## Invariants
- Stats are derived, not stored. Only IVs persist. This guarantees future balancing tweaks affect existing cards.

## Status
- [ ] Not started
