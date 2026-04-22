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
- [ ] Not started — awaiting Ronja's review pass on first draft
