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
- [ ] Not started
