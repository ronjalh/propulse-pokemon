---
name: stats-generator
description: Seeded IV generator (1–31 per stat) from card id
---

# Stats Generator

## Purpose
Given a card's uuid, produce deterministic IVs for all six stats. Same uuid always yields same IVs.

## Dependencies
- `project-scaffold`

## Deliverables
- `src/lib/cards/stats.ts` exporting:
  - `generateIVs(cardId: string): { hp, attack, defense, spAttack, spDefense, speed }` — values 1–31
  - `rollShiny(cardId: string): boolean` — ~1/64 base rate, uses a different namespace than IVs
- Use a fast deterministic hash (FNV-1a or similar) seeded with cardId + stat-name
- Property test: 10k random uuids produce IVs with mean ≈ 16 and uniform distribution

## Status
- [ ] Not started
