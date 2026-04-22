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
- [x] `src/lib/battle/engine.ts` — `resolveTurn`, `computeDamage`, `applyStatus`, `checkWinCondition` — 2026-04-22
- [x] `src/lib/battle/types.ts` — `BattleState`, `BattleCard`, `Intent`, `BattleEvent` discriminated unions
- [x] `src/lib/battle/rng.ts` — mulberry32 seeded PRNG; turn seed re-derived deterministically so battles replay from `(battleId, initialSeed)`
- [x] 34 unit tests passing in `engine.test.ts` — covers STAB, crits, immunities, dual-type stacking, burn physical penalty, paralysis speed, switch-first ordering, priority beats speed, end-of-turn burn/poison ticks, status inflict, PP decrement, input immutability, determinism, battle end, **TM 0.85× damage multiplier**

## Known gaps (future skills)
- Status moves use `effect` slug directly; richer effect DSL is deferred
- Healing moves (Recover/Roost) not yet supported
- Multi-hit / flinch / confuse-self damage beyond the 40-BP stub not yet tuned
