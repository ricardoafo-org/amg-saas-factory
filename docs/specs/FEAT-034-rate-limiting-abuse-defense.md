# FEAT-034 — Rate Limiting + Abuse Defense

**Sprint:** 9 — Reliability & Hardening
**Priority:** High (financial exposure)
**Branch:** `feature/FEAT-034-rate-limiting`
**Author:** Claude (orchestrator) · 2026-04-25

## 1. Problem

The app currently has **zero rate limiting** anywhere — server actions, route handlers, edge. Three endpoints can leak real money under abuse:

| Endpoint | Cost vector | Worst case (1k req/h) |
|---|---|---|
| `resolveWithClaude` (`src/actions/nlp.ts`) | Anthropic API tokens, billed per call | ~€20–€80/h depending on context size |
| `saveAppointment` / `saveQuoteRequest` (`src/actions/chatbot.ts`) | Resend email per call (€0.001 each) + PocketBase writes | ~€1/h emails + DB pollution |
| `getAvailableSlots` (`src/actions/slots.ts`) | No money, but trivially scrapable calendar | reputational / business intel leak |

Two non-money concerns also matter:

- Public HTML scraping → handled at the edge layer (Cloudflare/Vercel), not in app code.
- Spam appointments polluting the admin queue and triggering customer-create spam (post FEAT-031, every booking now creates a `customers` row).

## 2. Goals

1. Hard cap per-IP and per-email request rates on the 3 expensive endpoints, returning 429 with a typed error payload.
2. Edge-level WAF + bot-fingerprinting in front of Vercel for the cheap-and-effective baseline.
3. Invisible CAPTCHA on the final booking submit (only the submit, not slot lookup — that would kill chat UX).
4. LOPDGDD-clean: rate-limit keys MUST be hashed IPs, TTL ≤ 24h, never co-stored with PII.
5. Observable: each rate-limit hit logs a structured event (anonymized) so we can tell scrape from legitimate retry.

## 3. Non-goals

- Application-layer DDoS protection (that's edge layer's job, full stop).
- Per-tenant rate limits — single tenant for now, defer until multi-tenant rollout.
- IP allowlists / geo-blocks at the app layer — Cloudflare handles geo.
- Replacing Resend or PocketBase rate limits — we add a layer above, don't touch the providers.

## 4. Architecture

Three layers, cheapest to most expensive:

```
[Internet]
   │
   ▼
[Cloudflare]  ← DNS + WAF + bot fight mode + Turnstile widget host
   │
   ▼
[Vercel Edge]
   │
   ▼
[Next.js Middleware]  ← @upstash/ratelimit, hashed-IP-keyed
   │
   ├─→ Server Actions (saveAppointment, saveQuoteRequest, resolveWithClaude)
   │       └─ per-action rate gate (calls Upstash Redis directly, second check)
   │
   └─→ Route Handlers (getAvailableSlots if exposed via /api)
```

### Why two rate-limit gates (middleware AND per-action)?

Server Actions don't all flow through middleware in Next.js 15 (App Router server actions are POST `/_next/...` URLs that the runtime handles internally). Middleware can rate-limit by URL pattern, but the per-action check is the trustworthy gate. Middleware acts as a coarse first-line defense for the public route handlers; the per-action call is the real enforcement.

## 5. Phases (each shippable independently)

### Phase 1 — Cloudflare front (DNS, no code)

- Move DNS to Cloudflare, point at Vercel with proxying enabled
- Enable: Bot Fight Mode, Browser Integrity Check, Challenge Passage 30 min
- WAF rule: rate-limit `/api/*` and `/_next/data/*` to 100 req/min per IP at edge
- No code change, no PR. DNS work tracked in DevOps doc.

### Phase 2 — Upstash + per-action rate limit

- Add `@upstash/ratelimit` + `@upstash/redis` as dependencies
- Create `src/lib/rate-limit.ts` exporting `rateLimit(key, limit)` helpers per gate:
  - `nlpLimit`: 10 requests / 1h per hashed IP
  - `bookingLimit`: 3 requests / 1h per email (lowercased), 10 / 1h per hashed IP
  - `slotLimit`: 30 / 60s per hashed IP
- Create `src/lib/hash-ip.ts` — SHA-256 of `IP + daily-rotating-pepper`. Pepper stored in env var `RATE_LIMIT_PEPPER`, rotated by ops daily (Phase 5).
- Wire into:
  - `resolveWithClaude` (`src/actions/nlp.ts`) — first lines, before any Claude call
  - `saveAppointment` (`src/actions/chatbot.ts`) — before `consent_log.create` (LOPDGDD: rate limit happens BEFORE consent log; rate-limited request never reaches consent storage)
  - `saveQuoteRequest` — same pattern
  - `getAvailableSlots` (`src/actions/slots.ts`) — first lines
- Return shape on 429:
  ```ts
  { success: false, error: 'RATE_LIMITED', retryAfter: <seconds> }
  ```
- Client-side: chatbot already has fallback messages — extend `ChatEngine.tsx` to surface a friendly Spanish "Demasiadas solicitudes, intentá de nuevo en X minutos" when it sees `RATE_LIMITED`.

### Phase 3 — Cloudflare Turnstile on booking submit

- Sign up Turnstile (free), get site-key + secret-key
- Add `<Turnstile>` widget to the LOPD consent step in `ChatEngine.tsx` (the LAST step before `saveAppointment` fires)
- Server-side: in `saveAppointment`, verify `cf-turnstile-response` token via `https://challenges.cloudflare.com/turnstile/v0/siteverify` BEFORE consent_log
- Order of operations becomes:
  1. Rate limit gate
  2. Turnstile verify
  3. Consent log create
  4. Customer find-or-create
  5. Appointments create
  6. Customer aggregate update
- Don't add Turnstile to `getAvailableSlots` or `resolveWithClaude` — those need to feel snappy. Rate limit + edge defense is enough.

### Phase 4 — Observability

- New PocketBase collection `rate_limit_events` (admin-readable only):
  - `tenant_id`, `event_type` (`nlp` | `booking` | `slot` | `turnstile_fail`), `hashed_ip`, `count_in_window`, `created`
- One row per 429 / Turnstile fail
- Admin UI: `/admin/security` page showing counts per type, last 24h. Defer UI to a later sprint; collection + write path land in this PR.

### Phase 5 — Pepper rotation (ops, no code)

- Vercel cron rotates `RATE_LIMIT_PEPPER` daily
- Old pepper stays valid for 24h overlap to avoid breaking active rate-limit windows
- Tracked separately in DevOps; only the placeholder env var ships in this PR.

## 6. Files touched

| File | Change |
|---|---|
| `src/lib/rate-limit.ts` | NEW · per-gate limiters |
| `src/lib/hash-ip.ts` | NEW · pepper-salted SHA-256 |
| `src/lib/turnstile.ts` | NEW · siteverify wrapper |
| `src/actions/nlp.ts` | gate added at top |
| `src/actions/chatbot.ts` | gate + Turnstile verify before consent log |
| `src/actions/slots.ts` | gate added at top |
| `src/core/chatbot/ChatEngine.tsx` | render Turnstile widget on LOPD step + 429 message |
| `src/middleware.ts` | NEW or extended · coarse `/api/*` limit |
| `pb_migrations/2026XXXX_create_rate_limit_events.js` | NEW · collection schema |
| `src/types/pb.ts` | extend with `RateLimitEvent` type |
| `.env.example` | add `UPSTASH_REDIS_*`, `RATE_LIMIT_PEPPER`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` |
| `src/lib/__tests__/rate-limit.test.ts` | NEW · unit tests with mocked Upstash |
| `src/actions/__tests__/chatbot.rate-limit.test.ts` | NEW · gate triggers before consent_log |
| `e2e/rate-limit.spec.ts` | NEW · E2E that bursts 11 NLP calls, expects 429 on the 11th |

## 7. Testing

### Unit
- `rateLimit` returns `{ ok: false, retryAfter }` after limit exceeded
- `hashIp` produces stable hash within 24h, different across pepper rotation
- Turnstile siteverify mock: success → continue; failure → throw

### Integration
- Burst 11 NLP requests with same IP → 11th returns `RATE_LIMITED`
- `saveAppointment` with rate limit hit: NO consent_log row written, NO customer touched, NO appointment created
- Different hashed IPs do NOT share counters

### E2E (Playwright)
- Loop 11 chat NLP submissions in one session, assert error message renders on 11th
- Booking submit without Turnstile token → server-side error, no DB writes

### Load test (manual, pre-merge)
- Apache Bench `ab -n 200 -c 20` against `/_next/.../resolveWithClaude` from one IP → expect first 10 succeed, rest 429
- Multi-IP simulation via Cloudflare Workers script (separate ops doc)

## 8. LOPDGDD compliance

- **Rate-limit storage**: hashed IP only, 24h TTL, no email/phone/name colocated. Confirmed in `rate_limit_events` schema — `hashed_ip` field, no PII fields.
- **Order of operations** unchanged invariant: consent_log STILL the first PII-bearing write. Rate limit and Turnstile verify happen BEFORE consent log — rejected requests never write any user data.
- **Turnstile**: GDPR-compliant per Cloudflare's DPA. No additional cookie banner change needed (Turnstile is essential security, falls under "necessary" cookies).
- **Pepper rotation**: prevents long-term IP correlation even if Redis is breached. Required by AEPD guidance on pseudonymization.

## 9. Configuration

New env vars:

```
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
RATE_LIMIT_PEPPER=<rotated daily>
TURNSTILE_SITE_KEY=<public, OK in client bundle>
TURNSTILE_SECRET_KEY=<server only>
```

All added to `.env.example` per the durable rule (never `.env`, only `.env.example` synced with code).

## 10. Quality gates

1. `npm run type-check` — zero
2. `npm test` — full suite green, new tests passing
3. `compliance-reviewer` — zero violations
4. `validator` chain — PASS on hashed-IP-only and order-of-operations
5. `security-auditor` — explicit pass on rate-limit + Turnstile wiring
6. PR opened atomically with `gh pr create --reviewer ricardoafo --label type:feat --label area:security --milestone "Sprint 9 — Reliability & Hardening"`

## 11. Rollout

- Phase 1 (Cloudflare DNS): merge instantly, no app code
- Phase 2 (Upstash + per-action): ship to tst first, monitor 48h, then pro
- Phase 3 (Turnstile): feature-flag-gated via PB config (`turnstile_enabled` per tenant), so we can flip off if booking conversion drops
- Phase 4 (observability): ships with Phase 2
- Phase 5 (pepper rotation): ops setup after Phase 2 is stable

## 12. Out-of-scope follow-ups

- Per-tenant rate limit configuration (admin UI to tune limits)
- Anomaly detection on booking patterns (ML-based, way beyond MVP)
- Honeypot fields on the booking form — not worth the complexity given Turnstile + Upstash
- WhatsApp Business API rate limits — separate spec, separate sprint
