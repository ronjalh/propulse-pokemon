---
name: transaction-log
description: Audit trail for every credit/card movement
---

# Transaction Log

## Purpose
If a card changes owner or credits change hands, there's a row explaining why. Enables refunds, dispute resolution, and admin insight.

## Dependencies
- `database-setup`

## Deliverables
- `transaction_log` table:
  - `id`, `at` (timestamptz), `userId`, `kind` (enum: `credits_earn`, `credits_spend`, `card_acquire`, `card_transfer`, `card_consumed`), `amount` (int, nullable), `cardId` (fk, nullable), `relatedBattleId` (fk, nullable), `reason` (text)
- All economy mutations write here inside the same transaction
- Admin view shows recent entries

## Status
- [ ] Not started
