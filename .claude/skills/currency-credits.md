---
name: currency-credits
description: Propulse Credits wallet — earn, spend, audit
---

# Propulse Credits

## Purpose
Single in-game currency. Earn from battles + daily reward; spend on packs.

## Dependencies
- `database-setup`, `user-profile`

## Deliverables
- `users.credits` (int, default 200 at first login)
- `earn(userId, amount, reason)` / `spend(userId, amount, reason)` in `src/lib/economy/credits.ts`
- Every mutation writes a `transaction_log` row
- Negative balance is a programming error — these functions throw on overspend
- Displayed in navbar at all times

## Status
- [x] `users.credits` already had default 200 from `database-setup`
- [x] `src/lib/economy/credits.ts` — `earn({userId, amount, reason})`, `spend({...})` (atomic guarded UPDATE so concurrent spends cannot race below zero), `getBalance(userId)`, `logCardEvent(...)`, `InsufficientCreditsError`
- [x] Every mutation inserts a `transaction_log` row (reason string is required)
- [x] `openPackAction` now goes through `spend()` — no more raw SQL for credits anywhere
- [x] `CreditsBadge` (server component, always fresh from DB) shown on `/` and `/packs` page headers — 2026-04-22

## Not yet
- [ ] Daily login bonus (belongs in `daily-rewards` skill)
- [ ] Battle-win rewards (will land with `battle-wagering`)
