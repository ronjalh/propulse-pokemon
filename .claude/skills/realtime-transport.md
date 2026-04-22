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
- [x] `src/lib/realtime/events.ts` — `BattleEventPayload` discriminated union: the engine's full `BattleEvent` + lifecycle events (`team-locked`, `turn-start`, `turn-resolved`, `player-disconnected`, `player-reconnected`). `battleChannelName(id)` helper, `BATTLE_EVENT_NAME` constant — 2026-04-22
- [x] `src/lib/realtime/server.ts` — `publishBattleEvent(battleId, event)`, cached Pusher client, `authorizePrivateChannel(socketId, channelName)`. Marked `server-only`
- [x] `src/lib/realtime/client.ts` — `useBattleChannel(battleId, onEvent)` hook that auto-subscribes/unsubscribes and binds to the typed channel
- [x] `src/app/api/pusher/auth/route.ts` — POST handler: requires a signed-in session, parses `socket_id` + `channel_name`, validates `private-battle-<id>` shape, calls `isBattleParticipant(battleId, userId)`, returns signed auth token
- [x] `src/lib/realtime/participants.ts` — `registerParticipantChecker(fn)` hook so `battle-session-state` can wire in the real Redis-backed lookup; default deny until then
- [x] Build + typecheck clean. Requires PUSHER_* env vars to connect at runtime (they can be left empty in dev until first battle)
