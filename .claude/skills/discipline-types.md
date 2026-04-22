---
name: discipline-types
description: Discipline-to-Pokémon-type mapping with dual-type sub-disciplines
---

# Discipline Types

## Purpose
Deterministic mapping from (discipline, sub-discipline) to a Pokémon type pair. Core of the type system.

## Dependencies
- `project-scaffold`

## Deliverables
- `src/lib/data/type-mapping.ts` with:
  - `POKEMON_TYPES` const array
  - `DISCIPLINE_BASE` record (9 entries)
  - `SUB_DISCIPLINE_OVERRIDES` record (~11 dual-type entries)
  - `resolveTypes(discipline, subDiscipline?)` function
  - `TYPE_EFFECTIVENESS` matrix (18x18)
  - `typeMultiplier(attack, defenders)` function
- Unit tests for `typeMultiplier` covering: single-type, dual-type, immunities, double-weakness

## Status
- [x] Initial file written with mapping + effectiveness matrix — 2026-04-22
- [ ] Unit tests
