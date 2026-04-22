---
name: auth-magic-link
description: Passwordless email login via Auth.js v5 + Resend
---

# Auth Magic Link

## Purpose
Users sign in by entering their `@propulsentnu.no` email. Auth.js sends a magic link via Resend; clicking it creates a session.

## Dependencies
- `database-setup`

## Deliverables
- `src/lib/auth/config.ts` — NextAuth v5 config with Resend provider + Drizzle adapter
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth route handler
- Sign-in page at `src/app/(auth)/signin/page.tsx` with email input
- Email template (Resend HTML) matching Propulse vibe
- Session available via `auth()` in Server Components and `useSession()` in client

## Implementation notes
- Auth.js v5 uses the `auth()` function exported from the config file.
- `AUTH_SECRET` must be set (use `openssl rand -base64 32`).

## Status
- [ ] Not started
