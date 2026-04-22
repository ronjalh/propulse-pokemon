---
name: database-setup
description: Neon Postgres + Drizzle ORM with typed schema and migrations
---

# Database Setup

## Purpose
Wire up Neon as the production Postgres provider and Drizzle ORM as the type-safe query layer. All DB reads/writes must go through Drizzle — no raw SQL in route handlers.

## Dependencies
- `project-scaffold`

## Deliverables
- `src/lib/db/client.ts` exporting `db` (Neon HTTP or pooled client)
- `src/lib/db/schema.ts` with initial tables (users, accounts, sessions — Auth.js tables come later)
- `drizzle.config.ts` at project root
- `drizzle/` folder for migrations
- `DATABASE_URL` in `.env.example` and `.env.local`
- Migration workflow documented in `CLAUDE.md` Commands section
- `npx drizzle-kit generate` runs cleanly on initial schema

## Implementation notes
- Use `@neondatabase/serverless` with `drizzle-orm/neon-http` for request-scoped queries in route handlers.
- For scripts (seed, migrations), prefer pooled connection.

## Status
- [x] `src/lib/db/client.ts` and `schema.ts` written (5 tables: users, accounts, sessions, verification_tokens, persons + 3 enums: discipline, pokemon_type, rarity) — 2026-04-22
- [x] `drizzle.config.ts` at root with dotenv loading from `.env.local`
- [x] npm scripts: `db:generate`, `db:migrate`, `db:push`, `db:studio`, `seed:roster`
- [x] Initial migration generated (`drizzle/0000_pretty_secret_warriors.sql`) and applied to Neon
- [x] Verified via `scripts/verify-db.ts`
