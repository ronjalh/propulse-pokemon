---
name: roster-seed
description: Import the 88 Propulse 2026 members from roster.json into the persons table
---

# Roster Seed

## Purpose
Turn the static `src/lib/data/roster.json` into rows in the `persons` table. Idempotent — running it twice must not duplicate rows.

## Dependencies
- `person-model`, `discipline-types`

## Deliverables
- `scripts/seed-roster.ts` — reads roster JSON, resolves discipline/sub-discipline to type pair via `resolveTypes()`, upserts each member
- Command added to CLAUDE.md: `npx tsx scripts/seed-roster.ts`
- Edge cases handled:
  - Milton Heen and Jakob Ip appear in multiple disciplines in the JSON — pick primary (Board takes precedence)
  - Emails lowercased for matching
  - Missing LinkedIn URLs stored as `null`

## Status
- [x] `scripts/seed-roster.ts` written — 2026-04-22
- [x] `src/lib/data/base-stats.ts` with per-discipline base stats + rarity rules
- [x] Dedupe rule: Mentors (pri 1) > Board (pri 2) > others. Handles Milton Heen, Jakob Ip (→Board), Ola Vanni Flaata (→Mentors)
- [x] 91 flat entries → 88 unique persons upserted into Neon
- [x] Distribution verified: Board 6, Propulsion 11, Mechanical 15, Marketing 7, IT 6, Business 3, Software 12, Electrical 10, Mentors 18
- [x] Spot-checked: Ronja → IT/Dark/rare, Simen Fritsvold → IT/Developer/Dark-Ghost/common, Ola → Mentors/Dragon/legendary
