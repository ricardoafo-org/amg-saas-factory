# FEAT-006 — Cookie Consent & Privacy Pages

## Intent

Implement LSSI-CE + GDPR compliant cookie consent and add required legal pages. Spain's AEPD (2023 guidance) requires granular opt-in, "Rechazar todo" as prominent as "Aceptar todo", and no non-essential scripts before consent. Currently the site has no cookie banner and no legal pages.

## Acceptance Criteria

1. [ ] Cookie consent banner appears on first visit (bottom of page, not modal blocking content)
2. [ ] Banner has three actions: "Aceptar todo", "Rechazar todo", "Configurar" — all equally prominent
3. [ ] "Configurar" opens a panel with granular toggles: Estrictamente necesarias (locked ON) | Analíticas | Marketing
4. [ ] Consent choice persisted in `localStorage` key `amg_cookie_consent` as JSON `{analytics: bool, marketing: bool, ts: number}`
5. [ ] No analytics or third-party scripts load before consent is given
6. [ ] Banner does not re-appear if consent already given (check `localStorage` on mount)
7. [ ] `/politica-de-privacidad` page exists with full RGPD Article 13 disclosure
8. [ ] `/politica-de-cookies` page exists listing all cookies used, their purpose and duration
9. [ ] Footer links to both pages
10. [ ] WCAG 2.1 AA: banner is keyboard-navigable, focus-trapped when "Configurar" panel is open

## Constraints

- **AEPD 2023**: "Rechazar todo" must be at the same visual hierarchy as "Aceptar todo" — not buried
- **LSSI-CE**: strictly necessary cookies require no consent (session, CSRF) — pre-ticked and locked
- **No analytics yet** (Plausible is Sprint 5) — banner prepares the mechanism; no scripts loaded for now
- **Server-side rendering**: banner is a Client Component (`'use client'`) — check localStorage on mount
- **Mobile**: banner must be usable on 375px, not cover entire screen

## Out of Scope

- Backend consent storage (localStorage only for MVP — PocketBase storage is Sprint 5)
- Plausible Analytics integration (Sprint 5)
- Cookie scan / automatic cookie list generation

## Pages content minimum

`/politica-de-privacidad`:
- Responsible: Talleres AMG (data from `config` collection)
- Purpose + legal basis (RGPD Art. 6.1.b — contract performance)
- Data retention periods
- User rights: access, rectification, erasure, portability (RGPD Art. 15-20)
- DPA complaint right (AEPD: www.aepd.es)

`/politica-de-cookies`:
- What cookies are used (strictly necessary: session)
- Duration and purpose of each
- How to manage / delete cookies
- Link back to consent banner

## Files to Touch

- `src/core/components/CookieBanner.tsx` — new Client Component
- `src/app/layout.tsx` — import CookieBanner
- `src/app/politica-de-privacidad/page.tsx` — new Server Component page
- `src/app/politica-de-cookies/page.tsx` — new Server Component page
- `src/core/components/Footer.tsx` — add links to both pages
- `clients/talleres-amg/config.json` — ensure business legal name and address present
