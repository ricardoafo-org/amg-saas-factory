---
id: ADR-007
title: Observability stack — Sentry + Plausible Analytics
status: accepted
date: 2026-04-18
---

## Context

Sprint 5 requires error tracking and analytics. Spain's LOPDGDD and AEPD guidance require that analytics tools collecting personal data go through the cookie consent flow (ADR-003). The ideal stack is privacy-first, GDPR-compliant by default, and adds minimal bundle weight.

## Decision

Use **Sentry** for error tracking and **Plausible Analytics** for page analytics. Plausible is cookieless — it never sets cookies and collects no PII — so it is exempt from the cookie consent banner. Sentry error data is gated behind the `analytics` consent category.

## Rationale

Plausible is EU-hosted (EU-only option), cookieless, GDPR-compliant without consent, lightweight (< 1KB script), and provides the basic metrics a taller owner needs (page views, referrers, top pages). Sentry is the industry standard for Next.js error tracking, has a generous free tier, and has an official Next.js SDK with automatic source maps.

## Plausible setup

- Script tag added to `src/app/layout.tsx` (no consent needed per AEPD)
- Domain: configured in `config.json` per tenant
- Self-hosted option available if data residency becomes a requirement
- No events/goals tracking initially (privacy minimization)

## Sentry setup

- `@sentry/nextjs` SDK via `sentry.client.config.ts` + `sentry.server.config.ts`
- Error boundaries wrap admin dashboard pages
- PII scrubbing: `beforeSend` strips email, phone, names from event data
- Environment-gated: `SENTRY_DSN` env var; missing = no tracking
- Source maps uploaded on `npm run build`

## Alternatives Considered

| Option | Rejected because |
|---|---|
| Google Analytics | Requires cookie consent; AEPD has fined GA users; US data transfer |
| Mixpanel | Requires consent; heavier; overkill for taller analytics |
| Datadog | Enterprise pricing; overkill for single-tenant taller |
| Custom error logging | Reinventing the wheel; no alerting or stack trace grouping |
| Posthog | Self-hosting adds infra complexity; hosted version has GDPR concerns |

## Consequences

- Positive: Plausible needs no cookie consent — zero friction for compliance
- Positive: Sentry free tier (5K errors/month) is sufficient for a single taller
- Positive: Both have official Next.js integrations
- Negative: Sentry is US-hosted (SCCs apply for GDPR transfer) — must mention in privacy policy
- Negative: `SENTRY_DSN` + `PLAUSIBLE_DOMAIN` env vars required per deployment
- Neutral: Sentry source maps uploaded on build — add `SENTRY_AUTH_TOKEN` to CI

## Review trigger

When error rate exceeds Sentry free tier, or when the owner wants conversion funnel analytics (move to Posthog self-hosted at that point).
