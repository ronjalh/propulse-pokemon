---
name: analytics
description: Vercel Analytics + basic event tracking
---

# Analytics

## Purpose
Understand usage: daily actives, battles-per-day, pack-opens-per-user. No personal tracking beyond what Vercel provides by default.

## Dependencies
- `deployment-vercel`

## Deliverables
- `@vercel/analytics` package added
- `<Analytics />` mounted in root layout
- Custom events for key actions via `track()`: `pack_opened`, `battle_started`, `battle_won`, `card_traded`
- Dashboard access documented for Ronja in CLAUDE.md

## Status
- [ ] Not started
