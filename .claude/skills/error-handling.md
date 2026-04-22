---
name: error-handling
description: Error boundaries, toast notifications, 404/500 pages
---

# Error Handling

## Purpose
Catch and surface errors consistently. Every route has an `error.tsx`; user-facing failures show a Sonner toast; developers see real stack traces in dev.

## Dependencies
- `project-scaffold`

## Deliverables
- `src/app/error.tsx` — root error boundary with reset
- `src/app/not-found.tsx` — custom 404
- `src/app/global-error.tsx` — last-resort boundary (Next requires it)
- `src/lib/toast.ts` — thin Sonner wrapper exposing `toast.error()`, `toast.success()`
- Toaster mounted in root layout

## Status
- [ ] Not started
