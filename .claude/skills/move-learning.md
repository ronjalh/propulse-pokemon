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
- [ ] Not started
