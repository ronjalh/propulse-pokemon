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
- [ ] Not started
