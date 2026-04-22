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
- [ ] Not started
