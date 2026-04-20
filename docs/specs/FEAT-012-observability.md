# FEAT-012 — Observability (Sentry + Plausible Analytics)

## Intent

Add error tracking (Sentry) and privacy-compliant analytics (Plausible) per ADR-007. A production car shop booking site must be observable — silent errors lose appointments. Plausible is cookieless so no consent banner changes are needed.

## Acceptance Criteria

1. [ ] Sentry captures all uncaught errors in server actions and client components
2. [ ] Sentry PII scrubber removes email, phone, name from event data before sending
3. [ ] Sentry source maps uploaded on `npm run build` (via `SENTRY_AUTH_TOKEN`)
4. [ ] Plausible Analytics script added to `<head>` via `next/script` (no consent required)
5. [ ] Both integrations are env-gated: missing env vars = silently disabled (no crash)
6. [ ] Sentry error boundary wraps the admin dashboard pages
7. [ ] `SENTRY_DSN`, `PLAUSIBLE_DOMAIN` documented in `.env.example`
8. [ ] `npm run type-check` → zero exit

## Constraints

- **Privacy**: Sentry `beforeSend` MUST strip PII fields before submission
- **Plausible**: no custom events (privacy minimization); only page views
- **No Google Analytics**: AEPD has actively fined GA users; ruled non-compliant
- **Bundle size**: Plausible script is ~1KB; Sentry client ~40KB (acceptable)

## Sentry PII scrubber pattern

```typescript
beforeSend(event) {
  // Strip email, phone, name from request data and user context
  if (event.request?.data) delete event.request.data;
  if (event.user) event.user = { id: event.user.id };
  return event;
}
```

## Out of Scope

- Custom Sentry performance tracing (web vitals are handled by Lighthouse CI)
- Plausible custom goals/funnels
- PocketBase backup to S3/R2 (infra, not in this sprint)
- Uptime monitoring (requires external service)

## Files to Touch

- `package.json` — add `@sentry/nextjs`, `@sentry/node`
- `sentry.client.config.ts` — new file
- `sentry.server.config.ts` — new file
- `next.config.ts` — wrap with `withSentryConfig()`
- `src/app/layout.tsx` — add Plausible `<Script>`
- `.env.example` — add `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `PLAUSIBLE_DOMAIN`
