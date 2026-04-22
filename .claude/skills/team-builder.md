---
name: team-builder
description: Pick 6 cards + choose each card's 4-move set
---

# Team Builder

## Purpose
Before entering a battle, the user picks 6 cards from their collection and assigns up to 4 moves per card from that Person's eligible learnset.

## Dependencies
- `card-instance`, `move-learning`

## Deliverables
- `src/app/(game)/teams/page.tsx` — CRUD over named teams (user can save multiple)
- `teams` table: `userId, name, cardIds[6], moveSets: { cardId: moveId[4] }`
- Validation: no duplicate cards in a team, all moves in card's eligible learnset, exactly 6 cards
- `src/app/(game)/teams/[id]/page.tsx` for detailed edit
- Preview: team-wide type-coverage heatmap

## Status
- [x] `teams` table added + migration `0005_outstanding_smiling_tiger.sql` applied — 2026-04-22
- [x] `src/lib/teams/{validation,queries,actions}.ts` — validateTeam (6-card check, no dups, ownership, move-in-learnset), ownedCardsForUser, eligibleMovesByCardId batch query, saveTeamAction with server-side re-validation
- [x] `/teams` — list page with create/delete (+ incomplete/ready state)
- [x] `/teams/[id]` — editor with 6 card slots, each with 4 move dropdowns filtered to that card's learnset, disables already-selected cards across slots, disables already-selected moves within a slot
- [x] Live client validation mirrors server rules; save button disabled until valid
- [x] Offensive type-coverage heatmap (all 18 defender types × team's offensive moves, showing best multiplier)

## Wired into homepage?
- [ ] Add `/teams` as a NavLink on `/` (currently not linked — nudge if you want)

## Not yet seeded
This page is useless until `npm run seed:moves && npm run seed:learnsets` has been run.
