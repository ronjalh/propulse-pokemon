---
name: project-scaffold
description: Next.js 16 + TypeScript + Tailwind v4 + App Router bootstrap
---

# Project Scaffold

## Purpose
Establish the foundational Next.js 16 app with TypeScript, Tailwind v4, App Router, and `src/` layout. First skill — everything else builds on it.

## Dependencies
None.

## Deliverables
- `npm run dev` boots without error on port 3000
- App Router structure under `src/app/`
- TypeScript strict mode on
- `next.config.ts` whitelists `propulse.ams3.digitaloceanspaces.com` via `images.remotePatterns`
- shadcn/ui initialized with neutral base and CSS variables

## Status
- [x] Scaffolded via `create-next-app` on 2026-04-22
- [x] shadcn init (base + button, card, dialog, input, label, sonner, tabs, badge, skeleton, dropdown-menu, avatar, separator)
- [x] Image remotePatterns configured for propulse DigitalOcean bucket
