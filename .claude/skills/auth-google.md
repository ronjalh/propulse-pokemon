---
name: auth-google
description: Google OAuth via Auth.js v5, restricted to @propulsentnu.no Workspace accounts
---

# Auth — Google OAuth

## Purpose
Users sign in with their Propulse Google Workspace account. No magic links, no email sandboxing.

## Dependencies
- `database-setup`

## Why not Resend/magic-link?
Chose OAuth over magic link: Propulse is a Google Workspace org, all members already have a Google identity. OAuth is one click, no DNS setup for outbound mail, no Resend free-tier sandbox limits. Magic link is still available via Auth.js if we ever need a fallback.

## Deliverables
- `src/auth.ts` — NextAuth v5 config with `Google` provider + Drizzle adapter
  - `authorization.params.hd = "propulsentnu.no"` → Google filters the account picker to Workspace members only
  - `authorization.params.prompt = "select_account"` → user always sees chooser (avoids accidentally using a personal Gmail)
- `src/app/api/auth/[...nextauth]/route.ts` — handler re-exports
- `src/app/signin/page.tsx` — single "Continue with Google" button via Server Action
- `src/app/signin/error/page.tsx` — friendly copy for `AccessDenied` and `Verification`
- `src/types/auth.d.ts` — session augmented with `id`, `isAdmin`, `credits`

## Env vars
- `AUTH_SECRET` — 32-byte random
- `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` — from Google Cloud Console OAuth client
- `AUTH_URL` — base URL for callbacks (Vercel auto-sets this)

## Google Cloud Console steps
1. https://console.cloud.google.com → new project `propulse-pokemon`
2. OAuth consent screen → External → app name, support email, scopes `openid email profile`, add testers
3. Credentials → OAuth client ID → Web application
4. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` (+ prod URL later)

## Status
- [x] src/auth.ts configured with Google provider + hd param — 2026-04-22
- [x] Sign-in page with Google button
- [x] Error page
- [x] Session types augmented
- [ ] Tested end-to-end with real Propulse Google account
