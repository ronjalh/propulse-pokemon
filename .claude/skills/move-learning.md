---
name: move-learning
description: Per-person move pools and cross-type TMs
---

# Move Learning

## Purpose
Each Person has a pool of moves they "naturally" know (their discipline's moves + some universals). Cards can additionally learn a limited number of TMs — cross-type moves from outside their discipline — at reduced effectiveness.

## Dependencies
- `move-model`, `person-model`

## Deliverables
- `person_learnset` table: `(personId, moveId, isTm, learnedAtLevel)`
- Seed logic that assigns every Person 8–12 base moves from their type + 2–4 TM slots unlocked
- `eligibleMoves(personId)` query used by `team-builder` when setting move-sets
- TM-learned moves deal 0.85× damage (balance lever) — documented here

## Status
- [x] `person_learnset` table added to schema — composite PK `(personId, moveId)`, index on `personId`; migration `0003_lean_omega_red.sql` applied to Neon — 2026-04-22
- [x] `src/lib/moves/learning.ts` — `assignLearnset(person)` (deterministic by personId) and async `eligibleMoves(personId)` query
- [x] `scripts/seed-learnsets.ts` + `npm run seed:learnsets` (idempotent upsert on composite PK). **Requires** `moves` table populated first — run `seed:moves` beforehand
- [x] `TM_DAMAGE_MULTIPLIER = 0.85` wired into `computeDamage` — `MoveSlot.isTm` flag on hydrated BattleCard moves toggles it on; unit test passes
- [x] Distribution rule: primary type = all 12 moves, secondary type = 6 random, + 4 universal TM slots (marked `isTm=true`)

## Not yet seeded
Run `npm run seed:moves && npm run seed:learnsets` once catalog review is approved.
