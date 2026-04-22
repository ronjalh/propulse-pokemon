---
name: move-model
description: Drizzle schema for the hardcoded move catalog
---

# Move Model

## Purpose
Store all moves as DB rows so they can be queried by type, attached to cards, and edited via admin panel without a redeploy.

## Dependencies
- `database-setup`

## Deliverables
- `moves` table:
  - `id` (text slug, pk) — e.g. `hot_fire_test`
  - `name` (text) — "Hot Fire Test"
  - `type` (enum 18 types)
  - `category` (enum `physical | special | status`)
  - `power` (int, nullable for status)
  - `accuracy` (int 0–100)
  - `pp` (int)
  - `priority` (int, default 0)
  - `effect` (text slug referring to handler registry — e.g. `burn_chance_30`, `raise_atk_self`)
  - `flavor` (text)

## Status
- [ ] Not started
