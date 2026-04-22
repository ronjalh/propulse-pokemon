---
name: pwa-installable
description: PWA manifest + service worker so the app installs on phones
---

# PWA Installable

## Purpose
Let users add the app to their phone's home screen. Offline-shell for already-loaded views is a nice-to-have.

## Dependencies
- `project-scaffold`, `design-system`

## Deliverables
- `public/manifest.webmanifest` with app name, theme color (Propulse red), icons (192px, 512px, maskable)
- Icons generated from a Propulse rocket / card-back asset
- `src/app/layout.tsx` links the manifest and sets theme-color meta
- Service worker via `next-pwa` OR Next 16's built-in PWA support — check bundled docs before choosing

## Status
- [ ] Not started (stretch / v2)
