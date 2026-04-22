---
name: trading
description: Peer-to-peer card trading with mutual accept
---

# Trading

## Purpose
Users propose a trade (my card X for your card Y, optional credit delta). The other user accepts or rejects. On accept, ownership swaps atomically.

## Dependencies
- `card-instance`, `currency-credits`, `transaction-log`

## Deliverables
- `trades` table: `proposerId`, `receiverId`, `proposerCardId`, `receiverCardId`, `creditDelta` (int, can be negative), `status` (pending/accepted/rejected/expired), timestamps
- `POST /api/trades` — propose
- `POST /api/trades/[id]/accept` — execute swap in transaction; write to `transaction_log`
- `POST /api/trades/[id]/reject`
- Expiry: auto-reject after 7 days
- UI: `/trade` page with incoming/outgoing lists, compose modal

## Invariants
- Swap + credit transfer + audit log must be a single transaction.
- Proposer can't trade a wagered card (must not be locked in a battle).

## Status
- [ ] Not started (stretch / v2)
