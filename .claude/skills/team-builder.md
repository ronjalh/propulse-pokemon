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
- [ ] Not started
