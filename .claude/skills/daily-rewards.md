---
name: daily-rewards
description: Daily login bonus (50 credits) and free Base Pack once per 24h
---

# Daily Rewards

## Purpose
Retention. Give users a reason to open the app daily.

## Dependencies
- `currency-credits`, `pack-system`

## Deliverables
- `claimed_at` column on user table (or separate `daily_claims` table for history)
- `claimDailyReward(userId)` — checks last claim, credits 50 + marks free-pack-available
- Cron route `src/app/api/cron/daily-reward/route.ts` that resets streaks (Vercel Cron)
- UI banner on dashboard when reward is available

## Status
- [ ] Not started
