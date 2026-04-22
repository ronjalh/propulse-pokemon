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
- [x] `transaction_log` table + `transaction_kind` enum added to schema — indexes on `(userId, at)` and `kind`; migration `0004_dizzy_klaw.sql` applied — 2026-04-22
- [x] Used by `src/lib/economy/credits.ts`: every `spend`/`earn` writes a log row; `logCardEvent(...)` writes the card-movement rows
- [x] `openPackAction` now emits a `credits_spend` + one `card_acquire` row per rolled card

## Not yet
- [ ] Admin view to display recent entries (belongs in `admin-panel` skill)
