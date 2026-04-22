---
name: i18n-toggle
description: EN/NO language toggle with next-intl, English default
---

# i18n Toggle

## Purpose
Full UI translation via `next-intl`. English is the default locale; Norwegian (bokmål) is a toggle. Move names stay English regardless (matches Pokémon conventions).

## Dependencies
- `project-scaffold`

## Deliverables
- `src/lib/i18n/config.ts` defining `['en', 'nb']` locales
- `src/lib/i18n/messages/en.json` and `nb.json`
- Locale switcher in root layout (navbar)
- `next.config.ts` integrated with next-intl plugin if required by the chosen pattern
- All user-facing strings routed through `useTranslations()` / `getTranslations()`

## Implementation notes
- Choose between locale-routed (`/en/...`, `/nb/...`) or cookie-based. Cookie-based is simpler for a small app; go that route unless SEO matters.
- Keep move/type names untranslated.

## Status
- [ ] Not started
