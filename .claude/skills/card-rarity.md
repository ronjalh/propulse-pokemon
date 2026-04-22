---
name: card-rarity
description: Rarity tiers (Common/Rare/Epic/Legendary) derived from Person properties
---

# Card Rarity

## Purpose
Not every Propulse member is equally rare. Chiefs are Rare, Board + Mentors are Epic/Legendary, engineers are Common. Rarity affects pack-pull odds and visual flair.

## Dependencies
- `person-model`

## Deliverables
- `rarity` column on `persons` with enum `common | rare | epic | legendary`
- Assignment rule in seed:
  - Board members + Mentors → Epic or Legendary
  - Chief roles + Leads → Rare
  - Everyone else → Common
- Rarity-aware pull weights in `pack-system`
- Rarity border styling in `PropulseCard`

## Status
- [ ] Not started
