---
id: ADR-003
title: Cookie consent architecture — LSSI-CE + AEPD 2023 guidance
status: accepted
date: 2026-04-18
---

## Context

Spain's LSSI-CE (Ley de Servicios de la Sociedad de la Información) requires explicit opt-in for non-essential cookies. AEPD 2023 guidance requires "Rechazar todo" to be as prominent as "Aceptar todo" — no dark patterns. GDPR (as applied via LOPDGDD) requires granular category consent (analytics, marketing). The site currently runs no analytics but will add Plausible (Sprint 5) and Sentry (Sprint 5).

## Decision

Implement a banner component with three categories (necessary/analytics/marketing), store consent in a `cookie_consents` PocketBase collection (for AEPD audit trail), and block all non-essential scripts until consent is given. Use `localStorage` as the client-side consent signal for UX (no cookie banner flash on revisit).

## Rationale

Storing consent server-side (PocketBase) satisfies AEPD audit requirements. Using `localStorage` client-side avoids the irony of setting a cookie before consent. Plausible is cookieless so analytics category is future-proofed; marking it optional now is accurate and compliant.

## Consent categories

| Category | Default | Scripts gated |
|---|---|---|
| Necessary | Always on | PocketBase session, chatbot |
| Analytics | Off | Plausible Analytics (Sprint 5) |
| Marketing | Off | (none currently; future WhatsApp pixel etc.) |

## UX pattern (AEPD 2023 compliant)

- Banner appears bottom of screen on first visit
- Three equal-prominence buttons: "Aceptar todo" / "Solo necesarias" / "Gestionar"
- "Gestionar" opens granular panel with toggle per category
- "Rechazar todo" available in both main banner and granular panel
- Banner dismissed = consent stored (even rejection is logged for audit)

## Alternatives Considered

| Option | Rejected because |
|---|---|
| Cookie for consent signal | Bootstrapping problem — setting cookie before consent |
| Third-party CMP (Cookiebot, OneTrust) | External dependency, GDPR data transfer risk, cost, overkill for taller |
| No server-side log | AEPD may request audit trail in investigation; PB record is free |

## Consequences

- Positive: Full LSSI-CE + AEPD 2023 compliance
- Positive: No flash of consent banner on revisit (localStorage check)
- Positive: Audit trail for AEPD investigations
- Negative: Adds `cookie_consents` collection (minor schema growth)
- Negative: Must re-gate scripts each time a new third-party is added
- Neutral: `localStorage` cleared on browser data clear → banner reappears (correct behavior)

## Review trigger

When adding any new third-party script or when AEPD issues updated guidance.
