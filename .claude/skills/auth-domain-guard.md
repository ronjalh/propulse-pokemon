---
name: auth-domain-guard
description: Block all non-@propulsentnu.no email addresses from signing in
---

# Auth Domain Guard

## Purpose
Enforce that only Propulse members can use the app. No guest mode. The check must run before any session is created.

## Dependencies
- `auth-magic-link`

## Deliverables
- `signIn` callback in `src/lib/auth/config.ts` that returns `false` if email does not end with `@propulsentnu.no` (case-insensitive)
- Localized error message on the sign-in page for rejected addresses
- Unit test (if test harness exists) or at minimum manual-verification checklist in this skill

## Invariants
- This is a load-bearing invariant from `CLAUDE.md`. Do not relax it without deliberate scope change.

## Status
- [ ] Not started
