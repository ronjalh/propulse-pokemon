---
name: battle-engine
description: Pure-function turn resolver — damage calc, type-effectiveness, status, switch
---

# Battle Engine

## Purpose
All combat logic as pure functions. Given battle state + two players' intents, return the next state. No I/O, no DB — testable in isolation.

## Dependencies
- `type-chart`, `move-model`, `card-instance`

## Deliverables
- `src/lib/battle/engine.ts` exporting:
  - `resolveTurn(state, intents): { newState, events[] }`
  - `computeDamage(attacker, defender, move, rng): number` — classic Pokémon formula with type multiplier
  - `applyStatus(target, status)` — poison, burn, paralysis, sleep, confusion
  - `checkWinCondition(state)` — returns winnerId or null
- RNG is seeded per turn (logged) so battles are replay-able
- Unit tests: 30+ cases covering STAB, crits, immunities, speed ties, status priority

## Status
- [ ] Not started
