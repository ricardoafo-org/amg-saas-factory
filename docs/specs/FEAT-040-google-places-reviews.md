# FEAT-040 — Google Places live reviews + 24h cache

> Status: **DRAFT — implementation deferred** until user provisions GCP project and adds API key as a GitHub secret. The spec is complete; the runbook for the GCP setup lives at `docs/infra/gcp-places-setup.md`.

## Intent

Replace the current static testimonial block with the workshop's *live* Google Business Profile reviews (rating, review count, latest 5 reviews) so the trust signal is real, current, and self-updating. Reviews refresh at most every 24 hours per tenant — the cache window is enforced server-side to keep API cost predictable and well inside Google's free tier.

This is **not** a freeform integration: the feature is bounded to a single read endpoint per tenant, a single cache key per tenant, and a single render component on the homepage.

## Acceptance Criteria

1. [ ] A new server module `src/lib/reviews/google-places.ts` exposes `fetchPlaceReviews(placeId: string)` returning `{ rating: number, userRatingCount: number, reviews: Review[] }` typed via Zod.
2. [ ] Cache layer in `src/lib/reviews/cache.ts` — file-system or Vercel KV (via env-toggled adapter), 24-hour TTL, keyed `places:reviews:<tenant_id>:<place_id>`. Cache hits do NOT call Google.
3. [ ] Homepage `<TestimonialsSection>` reads from a Server Component that calls `fetchPlaceReviews` via the cache. **No client-side fetching of reviews — server only.**
4. [ ] If the live fetch fails (rate limit, network, missing key), render a **graceful fallback**: the existing static testimonials block keeps working. Never crash the page. Log to server console *without* PII.
5. [ ] Each tenant's `placeId` lives in `clients/<tenant>/config.json` under `business.googlePlaceId`. No hardcoding.
6. [ ] Schema for `Review` covers: author display name, rating (1–5), relative publish time text, original language, translated text, and a `Pictures` array if Google returns any. **PII-aware**: do NOT store reviewer profile photo URLs in our cache; display them only by passing through the Google CDN URL with a `referrerpolicy="no-referrer"` flag.
7. [ ] Unit tests in `src/lib/reviews/__tests__/google-places.test.ts` mock the Places fetch and assert: cache hit path, cache miss path, malformed-response handling, rate-limit handling, missing-key fallback.
8. [ ] E2E test (after FEAT-042 PR 1 lands) hits the homepage with reviews mocked to a fixed payload via Playwright's `route()` and asserts: rating renders, review cards render, fallback renders when the route returns 500.
9. [ ] Documentation: `docs/infra/gcp-places-setup.md` describes how a tenant onboards (create GCP project, enable Places API New, restrict key, store as GitHub secret, set `googlePlaceId` in tenant config, smoke-test via dev server).
10. [ ] Cost guardrail: a **monthly budget alarm** of 50 € is configured in GCP for the Maps Platform billing account; the runbook includes the exact gcloud / console steps. The alarm fires to the user's email at 50 % and 100 %.
11. [ ] LSSI-CE compliance: reviews are content the workshop *publishes* about itself; no cookies are dropped by this integration. Verified by checking that no third-party script is included client-side.

## Constraints

- **Cost**: Free tier — Google Maps Platform issues a $200/month credit. Place Details (Pro SKU) is $0.017/call. With 24-hour cache and one tenant, expected calls are ~30/day (one cache miss + manual force-refresh). $0.017 × 30 × 30 = ~$15/month — well inside free tier even with 5 tenants.
- **Performance**: Server-rendered, no extra client JS. Cache miss adds at most one server-side fetch (Google p95 ~250ms). Cache hit is local I/O. No impact on LCP.
- **Compatibility**: Server-only module. No Web API dependencies.
- **Tenant**: All cache keys + place IDs scoped to `tenant_id`. No leak between tenants.
- **Tooling**: Use `fetch` with `next: { revalidate: 86400 }` for Next.js's built-in cache where possible; file-system fallback for non-Vercel deployments (we deploy to a VPS via Docker — no Vercel KV).
- **Legal**: Google Places API ToS forbids storing review text long-term beyond the cache window. Our 24h cache is fine. Do NOT persist reviews to PocketBase.

## Out of Scope

- Live review *moderation* or *response* (that's a Google Business Profile API call, different SKU, not free).
- Sentiment analysis or AI review summarization.
- Multi-language UI for reviews — render in original language with optional `translatedText`.
- Reviews from non-Google sources (Trustpilot, Facebook, Yelp).
- Submit-a-review CTA — link to Google review form is a separate UX task.

## Test Cases

| Scenario | Input | Expected output |
|---|---|---|
| Cache hit | Repeat request within 24h window | Local cache hit, zero Google calls |
| Cache miss | First request after expiry | One Google call, response cached, render |
| API key missing | `GOOGLE_PLACES_API_KEY` unset | Fallback to static block, server log: `[reviews] key unset — fallback` |
| Rate limit | Google returns 429 | Fallback to static block, log warning, do NOT cache the failure |
| Malformed response | Place returns 200 but invalid JSON | Zod parse fails, fallback to static block, log error |
| Place not found | Wrong `googlePlaceId` in config | Fallback, log error with place ID |
| PII safety | reviewer profile photo URL | Rendered with `referrerpolicy="no-referrer"`; URL not persisted in our cache |
| Budget exhaustion | Monthly spend > $200 free credit | Out of scope here — GCP billing alarm fires; integration auto-fails to fallback |

## Files to Touch

- [ ] `src/lib/reviews/google-places.ts` — new (Zod schema + fetch)
- [ ] `src/lib/reviews/cache.ts` — new (FS adapter, swappable interface)
- [ ] `src/lib/reviews/__tests__/google-places.test.ts` — new
- [ ] `src/lib/reviews/__tests__/cache.test.ts` — new
- [ ] `src/core/components/TestimonialsSection.tsx` — switch to RSC, read live + fallback
- [ ] `src/lib/config.ts` — extend Zod schema to include `business.googlePlaceId`
- [ ] `clients/talleres-amg/config.json` — add real `googlePlaceId`
- [ ] `.env.example` — add `GOOGLE_PLACES_API_KEY` (do NOT commit a real key)
- [ ] `docs/infra/gcp-places-setup.md` — runbook (covered by this PR)
- [ ] `docs/specs/FEAT-040-google-places-reviews.md` — this file
- [ ] `tests/e2e/reviews.spec.ts` — E2E with Playwright `route()` mock (after FEAT-042 PR 1)

## Builder-Validator Checklist

- [ ] Zod schemas reject malformed Google responses
- [ ] No reviewer text or photo persisted past 24h cache window (LSSI-CE-safe)
- [ ] No Google JS / cookie dropped client-side
- [ ] `tenant_id` namespaces every cache key
- [ ] Cache hit path verified by test (zero network calls)
- [ ] Fallback path verified by test (key unset, rate limit, malformed, 404)
- [ ] `npm run type-check` → zero exit
- [ ] `npm test` → all pass
- [ ] `npm run lint` → zero errors
- [ ] User has provisioned GCP project and stored `GOOGLE_PLACES_API_KEY` as GitHub secret + on the VPS env file
- [ ] Budget alarm at 50 % and 100 % of $200 credit confirmed live in GCP console

## Implementation gate

This spec does NOT enter implementation until the user has completed `docs/infra/gcp-places-setup.md` end-to-end. The runbook is the unblock — once it's done and `GOOGLE_PLACES_API_KEY` is set on the VPS, this spec ships in one PR.
