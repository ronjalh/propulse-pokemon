---
name: battle-session-state
description: Server-authoritative battle state in Upstash Redis with turn timer
---

# Battle Session State

## Purpose
Live battle state lives in Redis (fast, shared across serverless invocations). Each battle id has a key with the full state. Turn timer expiry auto-forfeits.

## Dependencies
- `battle-engine`, `realtime-transport`

## Deliverables
- `src/lib/battle/session.ts`:
  - `getState(battleId)` / `setState(battleId, state)` / `cas(battleId, expected, next)`
  - `scheduleTurnTimeout(battleId, playerId, deadline)` via Upstash QStash or Redis TTL + cron sweep
- Anti-cheat: all state transitions happen in route handlers that validate intent → call engine → compare-and-set in Redis → publish event
- Reconnect window: 60s grace period tracked on state, broadcast `player-disconnected` but don't forfeit yet

## Invariants
- Client NEVER writes state directly. Client only sends intents ("move 2", "switch 3").
- Battle persists to Postgres on end — Redis is ephemeral.

## Status
- [x] `src/lib/battle/session.ts` — `getState`, `setState`, `cas` (Lua-script atomic compare-and-set on `version` field), `createBattle`, `submitIntent`, `enforceTurnTimeout`, `isBattleParticipant` — 2026-04-22
- [x] `VersionedState = BattleState & { version, deadlineMs }` — the engine state is wrapped with an optimistic-concurrency version counter so two workers can't both resolve the same turn
- [x] Per-turn intent inbox at `battle:<id>:intent:<turn>:<playerId>` — when both players' intents are present, resolution fires; if the CAS loses the race, the loser just exits quietly
- [x] `/api/battle/[id]/intent` POST route — auth + zod-validated intent + `submitIntent` call
- [x] `/api/battle/sweep-timeouts` POST route (Bearer `CRON_SECRET`) — scans `battle:*` keys and runs `enforceTurnTimeout` on each; wire to Vercel Cron every 15s (or Upstash QStash) for auto-forfeit on expired turns
- [x] Participant lookup wired into realtime-transport via `src/lib/realtime/register-participants.ts` (imported from the Pusher auth route) — private-channel subscriptions now pass the ACL check

## Env required at runtime
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — session store
- `CRON_SECRET` — guards the sweep route

## Not yet
- [ ] Postgres persistence on `battle-ended` event (owned by `battle-history` skill)
- [ ] Reconnect grace period — broadcasting `player-disconnected` and tracking the 60s window
- [ ] `battle-ui` to consume `turn-resolved` events
