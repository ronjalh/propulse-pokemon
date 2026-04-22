# Propulse Pokemon

A Pokémon-style trading-card battle game where the **~88 members of Propulse NTNU's 2026 team** (project **Fossekall**) are the cards. Side-project, internal fun — not an official Propulse deliverable.

- Sign in with your `@propulsentnu.no` email (magic link) — no other emails allowed
- Open packs, collect cards, battle friends in real-time PvP
- Every card has seeded IVs and a chance to roll **"Feminist"** (shiny variant)
- Wager one of your 6 battle cards + credits; winner takes both

## Stack

Next.js 16 (App Router) · React 19.2 · TypeScript · Tailwind v4 · shadcn/ui · Drizzle ORM · Neon Postgres · Auth.js v5 · Resend · Pusher Channels · Upstash Redis · Framer Motion · next-intl

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in secrets
npx drizzle-kit generate      # once schema is defined
npx drizzle-kit migrate
npx tsx scripts/seed-roster.ts  # seed the 88 Propulse members
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project context

See `CLAUDE.md` for tech decisions, invariants, and the discipline → Pokémon-type mapping. See `.claude/skills/` for the 40-skill implementation plan (SDD).

## Credits

Cards image data sourced from [propulse.no/Team](https://www.propulse.no/Team). Built by the IT department at Propulse NTNU 2026.
