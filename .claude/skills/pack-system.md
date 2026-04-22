---
name: pack-system
description: Pack types, credit pricing, pull algorithm with rarity weights
---

# Pack System

## Purpose
Four pack flavors. Each pack pulls 5 cards following rarity weights; at least one Rare+ is guaranteed per pack.

## Dependencies
- `person-model`, `card-instance`, `card-rarity`, `currency-credits`

## Pack types
| Pack | Cost | Rarity weights | Shiny rate |
|---|---|---|---|
| Base | free (once/24h), 100 credits otherwise | 70C/25R/4E/1L | 1/64 |
| Premium | 250 | 50C/35R/12E/3L | 1/32 |
| Discipline (choose 1) | 200 | discipline-locked, same rarity profile as Base | 1/64 |
| Mentor | 500 | Mentors+Board only | 1/32 |

## Deliverables
- `packs` table (optional — or compute per-pull): `type`, `yield_summary`
- `openPack(userId, packType)` — server action that debits credits, rolls 5 cards, creates `cards` rows, returns yields
- Anti-cheat: algorithm deterministic per request (logged) but seed derived server-side

## Status
- [ ] Not started
