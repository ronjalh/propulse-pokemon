---
name: move-catalog
description: Hardcoded catalog of ~128–176 moves with Propulse/rocket flavor
---

# Move Catalog

## Purpose
Populate the `moves` table with the full hand-written move set. Ronja reviews flavor before it ships.

## Dependencies
- `move-model`

## Target
- **~12 moves per type × 9 rocket-thematic types** = 108 type-flavored moves
- **~20 universal TMs** = 128 total (target)
- Can grow to 176 if sub-discipline moves are added

## Examples (draft — iterate)
- Fire: "Hot Fire Test", "Combustion Chamber", "Ignition Sequence", "Throttle Up", "Afterburn"
- Steel: "Inconel Plating", "Tarva Takeoff", "Bulkhead Smash"
- Dark: "Pair Programming", "Legacy Codebase", "Git Blame"
- Ghost: "Telemetry Void", "Null Pointer", "Phantom Thread"
- Fairy: "LinkedIn Post", "Sponsor Pitch", "Press Release"
- Dragon (mentor-only): "Wisdom of the Ancients", "Alumni Aura"

## Deliverables
- `src/lib/data/moves.ts` exporting a typed array of all moves
- Seed script integrates moves into the seed flow

## Status
- [x] Draft v1 written: `src/lib/data/moves.ts` — 128 moves total (12 per type × 9 rocket-thematic types + 20 universal TMs folded into Normal) — 2026-04-22
- [x] `scripts/seed-moves.ts` + `npm run seed:moves` (idempotent upsert keyed on move id)
- [ ] **Awaiting Ronja's review** on names, flavor, accuracy/power numbers before seeding to Neon
- [ ] After review: run `npm run seed:moves` and tick this line

## Known effect slugs the engine currently honors
- Status moves: `poison | burn | paralysis | sleep | freeze | confusion`
- Damage moves: `<status>_chance_<N>`
Other slugs (`raise_atk_self`, `protect`, `heal_50`, `recoil_25`, `recharge`, `double_next_power`, `force_switch`, `lower_def_target`, etc.) are recorded in the DB but no-op in the engine today — reserved for future effect-handler skills.
