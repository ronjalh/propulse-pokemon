---
name: battle-ui
description: Battle screen with HP bars, move menu, switch menu, event log
---

# Battle UI

## Purpose
The live battle screen. Two active cards facing off, HP bars animate, move menu at the bottom, event log on the side, turn timer in the corner.

## Dependencies
- `battle-engine`, `realtime-transport`, `card-component`

## Deliverables
- `src/app/(game)/battle/[id]/page.tsx`
- Sub-components: `HpBar`, `MoveMenu`, `SwitchMenu`, `BattleEventLog`, `TurnTimer`
- Zustand store for local battle state (mirror of server state, updated via Pusher)
- Animations: move usage, damage number popups, faint (card greys out), switch-in
- Accessibility: keyboard navigation for move selection

## Status
- [ ] Not started
