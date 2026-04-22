---
name: person-model
description: Drizzle schema for the 88 Propulse 2026 members as persistent entities
---

# Person Model

## Purpose
Define the `persons` table that holds the static Propulse roster. Persons never change at runtime; they are the cards' templates.

## Dependencies
- `database-setup`

## Deliverables
- `persons` table in `src/lib/db/schema.ts` with columns:
  - `id` (uuid, pk)
  - `name` (text)
  - `title` (text)
  - `email` (text, unique, lowercased)
  - `imageUrl` (text)
  - `linkedInUrl` (text, nullable)
  - `discipline` (enum of 9 values)
  - `subDiscipline` (text, nullable)
  - `primaryType` + `secondaryType` (enum of 18 Pokémon types)
  - `baseStats` (jsonb: `{ hp, attack, defense, spAttack, spDefense, speed }`)
  - `createdAt` (timestamptz)

## Implementation notes
- Base stats are derived from discipline (not seeded from name) — constants per discipline live in `src/lib/data/base-stats.ts`.
- Milton Heen and Jakob Ip appear in multiple disciplines on the Propulse site — decide primary; allow dual rows only if gameplay needs it.

## Status
- [ ] Not started
