---
name: user-profile
description: User profile page, avatar from Propulse roster, settings
---

# User Profile

## Purpose
Authenticated users get a profile page showing their Propulse member card (if their email matches a roster entry), their stats (wins/losses, collection size, shiny count), and settings (language toggle).

## Dependencies
- `auth-magic-link`, `roster-seed`

## Deliverables
- `src/app/(game)/profile/page.tsx` (or accessible from navbar dropdown)
- Auto-link user's auth email to a Person row where `email` matches
- Display Propulse title + discipline + image
- Wallet balance, battles-played, win rate

## Status
- [ ] Not started
