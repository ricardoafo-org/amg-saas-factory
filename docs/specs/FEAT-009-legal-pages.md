# FEAT-009 — Legal Pages (Privacy Policy + Cookies Policy)

## Intent

Add `/politica-de-privacidad` and `/politica-de-cookies` pages required by LOPDGDD and LSSI-CE. Every Spanish commercial website must have these pages linked from the footer and cookie banner. The content is tenant-configurable (business name, contact details, DPA info).

## Acceptance Criteria

1. [ ] `/politica-de-privacidad` page exists with full LOPDGDD-compliant content
2. [ ] `/politica-de-cookies` page exists with LSSI-CE-compliant content
3. [ ] Both pages linked from `Footer.tsx`
4. [ ] Both pages linked from cookie banner
5. [ ] Content uses tenant config values (business name, address, email, registration number)
6. [ ] Pages are Server Components (static render, no client JS needed)
7. [ ] Pages include: responsible party, purpose of processing, legal basis, data recipients, retention period, user rights (access/rectification/erasure/portability/objection), DPA contact (AEPD)
8. [ ] Cookie policy lists all cookies by category (necessary, analytics, marketing)
9. [ ] `robots.txt` does not block these pages

## Privacy Policy required sections (LOPDGDD Art. 13)

1. Responsable del tratamiento (name, address, CIF, contact)
2. Finalidades y base jurídica (appointment management = contract execution; marketing = consent)
3. Destinatarios de los datos (Resend for email, Twilio for SMS, Sentry for errors)
4. Transferencias internacionales (Twilio US, Sentry US — SCCs apply)
5. Plazo de conservación (appointments: 5 years per commercial law; consent_log: 3 years)
6. Derechos del interesado (ARCO+PL rights, AEPD complaint link)
7. Cookies (reference to /politica-de-cookies)

## Constraints

- **Static content**: no dynamic data fetching except tenant config (name, address)
- **Locale**: Spanish only (es-ES)
- **Tenant-configurable**: business name, CIF, address, contact email in config.json
- **No hardcoded legal text**: use config values for entity identifiers

## Out of Scope

- Multi-language versions (deferred)
- PDF download of policy
- Versioning / changelog of policy

## Files to Touch

- `src/app/politica-de-privacidad/page.tsx` — new Server Component
- `src/app/politica-de-cookies/page.tsx` — new Server Component
- `src/core/components/Footer.tsx` — add links to both pages
- `clients/talleres-amg/config.json` — add `legal.cif`, `legal.registrationNumber`, `legal.dpoEmail` fields
