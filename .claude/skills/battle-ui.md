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
- [x] `src/app/battle/new/page.tsx` — team picker + opponent email challenge form + solo mirror-match fallback (dev aid) — 2026-04-23
- [x] `src/app/battle/[id]/page.tsx` — routes by phase: awaiting_opponent → waiting screen (challenger) or JoinBattle form (invitee); live/ended → BattleScreen
- [x] `src/app/battle/[id]/BattleScreen.tsx` — client component with:
  - Opponent + my card panels (HP bar, types, status, faint greyscale)
  - Move menu (4 slots, type/category/PP badges, disabled when no PP)
  - Switch menu (6 slots, disabled on active or fainted)
  - Turn timer counting down to deadlineMs
  - Event log rendering every engine event (move-used, miss, no-effect, switch-in, status-inflicted, status-tick, cant-move, hurt-in-confusion, faint, battle-ended)
  - End screen (Victory/Defeat banner)
- [x] `useBattleChannel` wired; updates state from `turn-resolved.newState`
- [x] Posts to `/api/battle/[id]/intent` on action
- [x] Hydration pipeline: `src/lib/battle/hydrate.ts` converts a saved Team row → BattleSide (loads cards, computes final stats from IVs+BaseStats+shiny, attaches moves with TM flag, sets full HP/PP)
- [x] Create/join actions in `src/lib/battle/actions.ts`: challenge-by-email (pending if opponent not signed up), solo mirror-match for dev testing
- [x] `BattlePhase` added to VersionedState: `awaiting_opponent | live | ended`. `createPendingBattle` + `joinPendingBattle` handle the lifecycle
- [x] Homepage NavLinks updated: Teams + Battle now active

## Known v1 gaps
- [ ] No animations (damage-number popups, move-usage flash, switch slide-in) — intentionally deferred
- [ ] Full state is broadcast in turn-resolved — future hardening: server could strip opponent's hidden data (PP, full team composition)
- [ ] No accessibility keyboard-nav pass yet
- [ ] `team-locked` lifecycle event declared but not emitted — reserved for a future "lock-in preview" screen
