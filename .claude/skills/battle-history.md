---
name: battle-history
description: Per-user battle log with replays, stats, and W/L record
---

# Battle History

## Purpose
Users see their past battles — outcome, opponent, wager, and a turn-by-turn replay viewer.

## Dependencies
- `battle-engine`, `battle-session-state`

## Deliverables
- `battles` table persists: state snapshot (final), turn log (jsonb), seed
- `src/app/(game)/battle/history/page.tsx` — paginated list
- `src/app/(game)/battle/[id]/replay/page.tsx` — step-through replay powered by `resolveTurn` re-runs
- Aggregate stats: total battles, W/L, current streak, longest streak

## Status
- [x] `battles` table added (id, p1Id/p2Id, winnerId, rngSeed, initialState, finalState, turnLog jsonb array, turnsPlayed, createdAt, endedAt). Migrations `0006_shocking_maestro.sql` + `0007_acoustic_slipstream.sql` (widened rng_seed to bigint — int4 overflowed) applied — 2026-04-23
- [x] `src/lib/battle/persist.ts` — `persistBattleCreate`, `persistTurn`, `persistBattleEnd`. Session lifecycle hooks wired to call these at create, each turn, and end. `mirror:<id>` / `pending:<email>` pseudo-player-ids are normalized to null for the fk column
- [x] `/battle/history` — list of user's battles with Victory/Defeat/In-progress badge, opponent email, turn count, Replay link
- [x] `/battle/[id]/replay` — step-through viewer: ⏮ / prev / next / ⏭ buttons, shows the active card panels with HP + status at each turn checkpoint, plus the engine events for that turn. End-of-battle shows Victory/Defeat banner
- [x] Homepage NavLinks: "Battle History" added

## Not yet
- [ ] Aggregate W/L stats (total, streak) — belongs in user-profile or here as a stretch
- [ ] Filter/search/pagination once history grows
