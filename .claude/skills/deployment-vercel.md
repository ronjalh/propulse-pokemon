---
name: deployment-vercel
description: Vercel deploy pipeline with env vars, preview builds, and domain setup
---

# Vercel Deployment

## Purpose
Get the app running on Vercel with all env vars wired, preview deploys on every PR, and production on main.

## Dependencies
- `project-scaffold`, `database-setup`

## Deliverables
- Vercel project linked to `ronjalh/propulse-pokemon`
- Env vars populated from `.env.example` in Vercel dashboard (Production + Preview)
- Build + deploy succeeds
- Custom domain (if applicable) or `.vercel.app` URL works
- Production branch = `main`

## Implementation notes
- Turbopack is default in Next 16 — no flag needed in scripts.
- If we hit Webpack-only plugin issues, fall back to `next build --webpack` only for prod.

## Status
- [ ] Not started
