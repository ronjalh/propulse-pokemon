---
name: pvp-challenge-link
description: Challenge-link PvP flow — create battle, share URL, opponent joins
---

# PvP Challenge Link

## Purpose
A user creates a battle room, gets a shareable URL, posts it in Slack/Discord. The opponent opens it, picks a team + wager, and the battle starts.

## Dependencies
- `battle-wagering`, `realtime-transport`, `battle-session-state`

## Deliverables
- `POST /api/battles` — creates a pending battle, returns `{ id, joinUrl }`
- `src/app/(game)/battle/[id]/page.tsx` — polymorphic based on state: lobby → team-lock → active → result
- Lobby shows opponent's name once they join
- Both players must lock team+wager before the battle transitions to `active`
- Challenge expires after 30 minutes of inactivity in lobby

## Status
- [ ] Not started
