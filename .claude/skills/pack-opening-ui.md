---
name: pack-opening-ui
description: Animated unboxing sequence with card reveals
---

# Pack Opening UI

## Purpose
The dopamine hit. Tear the pack, reveal cards one-by-one with rarity-appropriate flair, let the user tap each card to flip it.

## Dependencies
- `pack-system`, `card-component`, `design-system`

## Deliverables
- `src/app/(game)/packs/[type]/open/page.tsx`
- Tear animation, then 5 face-down cards
- Tap-to-flip with spring animation per card (Framer Motion)
- Shiny cards get a distinct reveal (confetti, longer delay, different sound)
- Skip button bulk-reveals remaining cards

## Status
- [x] `src/app/packs/page.tsx` — pack chooser with credit check
- [x] `src/app/packs/result/page.tsx` + `PackReveal.tsx` — staggered spring reveal via Framer Motion, shiny banner — 2026-04-22
- [ ] Tap-to-flip per card (v2 polish)
