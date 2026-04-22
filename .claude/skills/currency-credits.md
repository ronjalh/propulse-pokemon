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
- [ ] Not started
