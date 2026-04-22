# Skills — Propulse Pokemon

Each file below is a scoped unit of work. When starting a skill, read it, implement against the acceptance criteria, then update the Status checkbox list. Skills are organized by domain.

## Foundation (6)
- `project-scaffold.md` — Next.js 16 + TS + Tailwind bootstrap
- `database-setup.md` — Neon + Drizzle
- `deployment-vercel.md` — Vercel deploy pipeline
- `i18n-toggle.md` — next-intl EN/NO
- `design-system.md` — Type colors, gradients, theming
- `error-handling.md` — Error boundaries, toasts

## Auth (3)
- `auth-google.md` — Google OAuth via Auth.js v5 (pivoted from Resend magic link)
- `auth-domain-guard.md` — Reject non-`@propulsentnu.no`
- `user-profile.md` — Profile page, avatar, settings

## Roster & Cards (6)
- `person-model.md` — 88 members as DB entities
- `roster-seed.md` — Import from roster.json
- `discipline-types.md` — Type mapping logic
- `card-instance.md` — Card model with IV stats + shiny
- `stats-generator.md` — Seeded IV 1-31 generator
- `card-component.md` — UI template per type

## Shiny & Cosmetics (2)
- `shiny-feminist.md` — Shiny variant mechanics
- `card-rarity.md` — Rarity tiers

## Moves (4)
- `move-model.md` — Move DB schema
- `move-catalog.md` — 128-176 hardcoded moves
- `move-learning.md` — Per-person move pools + TMs
- `type-chart.md` — Effectiveness matrix

## Packs & Pokédex (4)
- `pack-system.md` — Pack types, pull odds
- `pack-opening-ui.md` — Unboxing animation
- `pokedex.md` — Collection tracking
- `daily-rewards.md` — Login bonus

## Battle (6)
- `battle-engine.md` — Turn logic, damage calc
- `battle-ui.md` — Battle screen
- `team-builder.md` — 6-card team + movesets
- `battle-wagering.md` — Stake card + currency
- `battle-history.md` — Past battles
- `pvp-challenge-link.md` — Create/share battle

## PvP Infrastructure (2)
- `realtime-transport.md` — Pusher integration
- `battle-session-state.md` — Server-authoritative state

## Economy (2)
- `currency-credits.md` — Propulse Credits
- `transaction-log.md` — Audit trail

## Admin & Ops (3)
- `admin-panel.md` — Manage moves, users
- `leaderboard.md` — Top wins, collectors, shinies
- `analytics.md` — Vercel Analytics

## Stretch (2)
- `trading.md` — P2P card trades
- `pwa-installable.md` — Home-screen install
