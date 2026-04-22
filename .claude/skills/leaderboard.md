---
name: leaderboard
description: Top wins, top collectors, most shinies owned
---

# Leaderboard

## Purpose
Bragging rights. Three boards: most battle wins, largest collection, most shinies owned. Cached because it's read-heavy.

## Dependencies
- `battle-history`, `card-instance`

## Deliverables
- `src/app/(game)/leaderboard/page.tsx` with tabs for each board
- Cached via Next 16 `cacheLife`/`cacheTag` (tagged `leaderboard-wins`, `leaderboard-collection`, `leaderboard-shinies`)
- `updateTag` called on relevant actions (battle end, card pulled)
- Top 20 shown, user's own rank pinned at the bottom

## Status
- [ ] Not started
