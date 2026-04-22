---
name: realtime-transport
description: Pusher Channels integration for live battle events
---

# Realtime Transport

## Purpose
Abstract Pusher behind a thin wrapper so battle code speaks in domain events, not WebSocket frames. Lets us swap to Supabase Realtime later without rewriting callers.

## Dependencies
- `project-scaffold`

## Deliverables
- `src/lib/realtime/server.ts` — server-side Pusher client, `publishBattleEvent(battleId, event)`
- `src/lib/realtime/client.ts` — React hook `useBattleChannel(battleId, onEvent)`
- Event schema in `src/lib/realtime/events.ts` — discriminated union:
  - `team-locked`, `turn-start`, `move-played`, `switch-played`, `battle-ended`, `player-disconnected`, `player-reconnected`
- Private-channel auth endpoint `src/app/api/pusher/auth/route.ts` verifying the user is a participant

## Status
- [ ] Not started
