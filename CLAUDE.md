@AGENTS.md

# Propulse Pokemon

Pokémon-style trading-card battle game where the ~88 members of Propulse NTNU's 2026 team (project **Fossekall**) are the cards. Internal side-project (not an official Propulse deliverable).

## Tech stack

- **Next.js 16.2.4** (App Router, Turbopack by default) on **React 19.2**
- **TypeScript 5**, strict mode
- **Tailwind CSS v4** + **shadcn/ui** (neutral base, CSS variables)
- **Drizzle ORM** against **Neon Postgres** (serverless driver)
- **Auth.js v5 (NextAuth beta)** with **Google OAuth** — domain-restricted to `@propulsentnu.no` via Google's `hd` param + signIn callback
- **Pusher Channels** for real-time PvP battles; server-authoritative state in route handlers + **Upstash Redis**
- **next-intl** for EN/NO toggle (English default)
- **Zustand** for client-side game state, **Framer Motion** for pack-opening/battle animations
- **react-hook-form + zod** for forms

## Important Next.js 16 gotchas

- `params` and `searchParams` in `page.tsx`/`layout.tsx`/`route.ts` are **Promises** — always `await` them.
- `cookies()`, `headers()`, `draftMode()` are async.
- Middleware is renamed to `proxy.ts` with a nodejs-only runtime (no edge). Keep this in mind if we add one for Auth.js.
- `revalidateTag(tag)` now needs a second arg: `revalidateTag('cards', 'max')`. Use `updateTag(tag)` inside Server Actions for read-your-writes.
- `images.domains` is removed; use `images.remotePatterns` — already configured for `propulse.ams3.digitaloceanspaces.com`.
- `next lint` is removed; use `npx eslint` directly.

## Domain model

- **Person**: one of the 88 Propulse 2026 members (name, title, image, email, discipline, sub-discipline). Static seed data.
- **Card**: an instance of a Person pulled from a pack. Each card has its own seeded IV-style stats, optional "shiny Feminist" flag, and owner. Multiple cards of the same Person are allowed.
- **Move**: hardcoded pool of ~128–176 moves with name/type/power/accuracy/PP/effect. No runtime Claude API.
- **Battle**: real-time turn-based between two Users. Each side locks in 6 cards + 1 wager (one of the 6) + currency pot. Winner takes both wagers.

## Discipline → Pokémon type mapping

| Discipline | Type | Sub-disc override |
|---|---|---|
| Board | Psychic | — |
| Propulsion | Fire | Thrust Chamber = Fire/Fighting, Feed System = Fire/Water |
| Mechanical | Steel | Recovery = Steel/Flying, Outer Structure = Steel/Flying, Launch Site = Steel/Ground, Inner Structure = Steel/Rock |
| Marketing | Fairy | — |
| IT | Dark | Developer = Dark/Ghost, DevOps = Dark/Steel |
| Business | Normal | — |
| Software | Ghost | Engine = Ghost/Fire, Recovery = Ghost/Flying, Telemetry = Ghost/Psychic |
| Electrical | Electric | — |
| Mentors | Dragon | (legendary tier) |

Source of truth: `src/lib/data/type-mapping.ts`.

## Key invariants (don't break these)

- **No one signs in without a `@propulsentnu.no` email.** The Auth.js `signIn` callback must hard-reject everything else — no guest mode, no exceptions.
- **Card stats are seeded from the Card's own id**, not the Person's id. Two Lucas cards can have different stats. The seed function must be deterministic.
- **Battles are server-authoritative.** Never trust client-side damage/move outcomes. The client sends intent ("play move #2"), the server validates and resolves, Pusher broadcasts the result.
- **Propulse member images are referenced, not rehosted.** URLs come from `propulse.ams3.digitaloceanspaces.com` via the roster JSON. `next.config.ts` whitelists that hostname.
- **UI strings live in `src/lib/i18n/` translation files** (English default, Norwegian toggle). Don't hardcode strings in components.

## Workflow: SDD skills

This project follows Skill-Driven Development. Every scoped capability lives as a skill file in `.claude/skills/`. When picking up work, find the relevant skill, read it, and implement against its acceptance criteria. Update the skill's Status section as you go. New capabilities get new skills — don't cram unrelated work into an existing one.

## Commands

```bash
npm run dev            # Start dev server (Turbopack)
npm run build          # Production build
npm run start          # Serve production build
npx eslint .           # Lint (next lint is gone in 16)
npx drizzle-kit generate  # Generate migration from schema changes
npx drizzle-kit migrate   # Apply pending migrations
npx tsx scripts/seed-roster.ts  # Seed Propulse members from roster.json
```

## Repo

- GitHub: https://github.com/ronjalh/propulse-pokemon (public)
- Local: `C:\Users\Ronja\propulse-pokemon`
- Owner: Ronja Lem Hetland, CIO @ Propulse NTNU 2026
