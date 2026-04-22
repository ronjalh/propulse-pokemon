---
name: battle-wagering
description: Wager one of the 6 team cards + a currency pot; winner takes both
---

# Battle Wagering

## Purpose
Raise the stakes. Before a battle locks, each player designates one of their 6 cards as the wager and confirms a shared currency pot. On loss, the wagered card transfers ownership.

## Dependencies
- `currency-credits`, `team-builder`, `transaction-log`

## Deliverables
- Wager step in the challenge-link flow: pick wager card, agree pot size (default 50)
- `battles.wagerCardIdA`, `wagerCardIdB`, `potCredits` columns
- On battle end: transfer loser's wager card to winner, credit the pot to winner, write a row to `transaction_log`
- Shiny wager doubles the pot

## Invariants
- Ownership transfer must be atomic with battle-result write — single transaction.

## Status
- [ ] Not started
