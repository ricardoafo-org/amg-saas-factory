# FEAT-008 — Cookie Consent Banner (LSSI-CE + AEPD 2023)

## Intent

Add a cookie consent banner to the public-facing site. Required by Spain's LSSI-CE. AEPD 2023 guidance mandates "Rechazar todo" is equally prominent as "Aceptar todo". Consent stored in PocketBase for audit trail. Scripts blocked until consent is given.

## Acceptance Criteria

1. [ ] Banner appears at bottom of page on first visit (no cookie set yet in localStorage)
2. [ ] Banner has three equal-prominence actions: "Aceptar todo" / "Solo necesarias" / "Gestionar preferencias"
3. [ ] "Gestionar preferencias" opens a modal with per-category toggles (Analytics, Marketing)
4. [ ] "Rechazar todo" available in both banner and modal
5. [ ] Consent stored in `cookie_consents` PocketBase collection (tenant_id, session_id, analytics, marketing, ip, user_agent)
6. [ ] Consent persisted in `localStorage` key `amg_cookie_consent` — banner not shown again until localStorage is cleared
7. [ ] No analytics/third-party scripts load before consent (Plausible gated on `analytics` consent)
8. [ ] `/politica-de-cookies` link present in banner
9. [ ] Mobile-responsive: banner fits 375px, no overflow
10. [ ] `npm run type-check` → zero exit

## Constraints

- **AEPD 2023**: Reject button must be same size/prominence as Accept
- **LSSI-CE**: Non-essential cookies require prior informed consent
- **No dark patterns**: no pre-ticked boxes in granular view, no nudge colors
- **Performance**: banner renders client-side only (no SSR flash), uses CSS animation not framer-motion
- **Tenant**: consent logged with `tenant_id` from config

## Out of Scope

- Consent revision UI (user clicks "cambiar preferencias" in footer — deferred)
- A/B testing the banner copy
- IAB TCF compliance (not required for a single-tenant taller)

## Test Cases

| Scenario | Input | Expected |
|---|---|---|
| First visit | No localStorage key | Banner shown |
| Accept all | Click "Aceptar todo" | analytics=true, marketing=true logged; banner dismissed |
| Reject all | Click "Solo necesarias" | analytics=false, marketing=false logged; banner dismissed |
| Gestionar | Toggle analytics on, marketing off | Only analytics=true logged |
| Return visit | localStorage key present | Banner NOT shown |
| Mobile 375px | Narrow viewport | Banner fits, all buttons visible |

## Files to Touch

- `pb_migrations/` — new migration for `cookie_consents` collection
- `scripts/db-setup.js` — add `cookie_consents` collection definition
- `src/core/components/CookieBanner.tsx` — new component (client)
- `src/actions/consent.ts` — new `logCookieConsent()` server action
- `src/app/layout.tsx` — mount `<CookieBanner />`
- `src/app/politica-de-cookies/page.tsx` — new static page
