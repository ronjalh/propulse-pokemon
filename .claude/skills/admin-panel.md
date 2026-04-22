---
name: admin-panel
description: Admin CRUD for moves, user management, balance tweaks
---

# Admin Panel

## Purpose
Ronja (and any other admin) can edit the move catalog, ban users, adjust balance numbers, and inspect transaction history without redeploying.

## Dependencies
- `move-model`, `transaction-log`, `auth-magic-link`

## Deliverables
- `users.isAdmin` boolean (default false; Ronja's email pre-seeded true)
- Route group `src/app/admin/` guarded by `isAdmin` check
- Pages: `/admin/moves` (CRUD), `/admin/users` (list, ban/unban), `/admin/transactions` (read-only)
- All admin actions logged

## Status
- [ ] Not started
