# Decision: Customer Auth Pattern — Email Magic Link

**Date:** 2026-04-27
**Owner:** ricardoafo
**Status:** Decided
**Phase:** FEAT-051.5 Discovery #1
**Implements:** Week 3 of [backend-foundation rebuild](../../../.claude/plans/humble-yawning-forest.md)

## Problem

Customer accounts (Week 3 deliverable) need an authentication mechanism. End users are Spanish car owners — a 35+ demographic that is mobile-first but not technical. Wrong choice here costs us conversion (booking abandonment) or support burden (forgotten passwords). Decision must be made BEFORE Week 1 because it shapes the `customer_users` schema.

The B2C SaaS norm in 2026 is passwordless. The question is **which** passwordless flow.

## Options Considered

### Option A — Email magic link (RECOMMENDED)
User enters email → we send a one-time-use link → click verifies + signs in.

- **Pros:**
  - Zero password to forget → eliminates ~50% of support tickets typical SaaS sees on auth.
  - Standard B2C SaaS UX in 2026 (Linear, Notion, Vercel, Slack, Cal.com, Documenso all default to this).
  - Free at our scale (Resend free tier covers 3K emails/month).
  - Email is universal — every adult has at least one address.
  - Works on any device with a browser.
- **Cons:**
  - Older users may not check email regularly → friction on first sign-in.
  - Email deliverability edge cases (spam folder, mailbox full, slow mail server). Mitigated by 30-min token expiry + "didn't receive? resend" CTA.
  - Email = personal data under LOPDGDD; tokens must expire and be one-use (covered below).

### Option B — SMS one-time code
User enters phone → we send 6-digit code via Twilio → enters code to sign in.

- **Pros:**
  - Phone numbers are universally available in Spain.
  - SMS read rate is higher than email (~98% vs ~25%).
  - Older users check SMS more reliably than email.
- **Cons:**
  - Twilio cost: ~€0.07/SMS. At 1000 customer logins/month = €70/month, scales linearly.
  - SMS deliverability in Spain has carrier-specific issues (some MVNOs delay).
  - Phone-number-as-auth has GDPR scope creep (phone is more sensitive than email for some).
  - Complicates onboarding: customer must give phone before sign-in (can't progressively enrich).

### Option C — WhatsApp one-time code
User enters phone → we send 6-digit code via WhatsApp Business API → enters code to sign in.

- **Pros:**
  - Spain WhatsApp adoption is ~85% adults; the dominant messaging channel.
  - Read rate higher than email AND SMS.
  - Optimal demographic fit (35+ Spanish car owners).
  - WhatsApp Business API is being set up anyway (Decision #4 — notifications channel) — same infra serves both.
- **Cons:**
  - WhatsApp Business API has setup friction (Meta verification, ~7-14 days).
  - Cost per conversation (~€0.05) — comparable to SMS.
  - Not all users have WhatsApp installed (rare in Spain but exists).
  - Couples customer auth tightly to a third-party API outside our control.

### Option D — Email + password (traditional)
User registers with email + password → signs in with same.

- **Pros:**
  - Familiar to all users.
  - No external dependency for sign-in (works offline relative to email).
- **Cons:**
  - "Forgot password" flows generate ~50% of auth support tickets.
  - Users reuse passwords across sites — credential-stuffing risk if a breach occurs elsewhere.
  - Increasingly unusual in B2C SaaS — feels dated.
  - Requires password complexity rules, breach-list checks (HIBP), bcrypt config — all things to maintain.

### Option E — OAuth (Google / Apple)
User clicks "Sign in with Google" → redirected to Google → returns authenticated.

- **Pros:**
  - Zero forms.
  - Highest conversion rates in tech-savvy demographics.
- **Cons:**
  - Older Spanish demographic has lower Google account adoption than US/UK.
  - Apple ID requires being on Apple device — limits universality.
  - Adds Google/Apple as identity providers we depend on.
  - Privacy concern: customers may not want Google/Apple to know they use AMG.

## Recommendation

**Email magic link as primary (Option A).** Optional WhatsApp code as a future secondary channel post-launch if metrics show poor conversion (parked under Decision #4).

NO password option in v1. Adding password later is straightforward (just an additional column on `customer_users`); rolling back from password-by-default to passwordless requires a migration. Default to the simpler model.

## Justification (References / Data)

**Industry references (verified):**
- **Cal.com** ([github.com/calcom/cal.com](https://github.com/calcom/cal.com)) — uses NextAuth.js EmailProvider as default; OAuth as secondary. AGPLv3 licensed; pattern reference only.
- **Documenso** ([github.com/documenso/documenso](https://github.com/documenso/documenso)) — same pattern (NextAuth EmailProvider + OAuth).
- **Vercel, Notion, Linear, Slack** — all magic-link-primary in their B2C onboarding flows (verifiable by inspecting their public sign-up pages).
- **Stripe Checkout** — customer-facing auth uses email + 6-digit code (passwordless). Their UX is the gold standard for "low-friction, high-trust" passwordless.

**LOPDGDD compliance:**
- Email is personal data → consent must be recorded at sign-up (rubric F2).
- Magic link tokens must be one-use, time-bound (15-30 min industry standard) → mitigates token interception.
- Failed attempts must be rate-limited (5/hour per email) → prevents account enumeration.
- Tokens stored hashed at rest (SHA-256 of random 32-byte token) → leak resilience.

**PocketBase capabilities (verified):**
- PB has built-in auth collection type — email + password by default.
- PB has `requestVerification` (sends email with verification link) and `requestPasswordReset` (sends email with reset link).
- PB does NOT have native "magic-link sign-in" — we build it on top using:
  - A custom `magic_link_tokens` PB collection (email, token_hash, expires_at, consumed_at).
  - Server actions `requestMagicLink(email)` and `verifyMagicLink(token)` orchestrate creation + verification.
  - Once verified, PB auth session is established the same way as for password sign-in.
- This is ~150 lines of code, no external auth library needed. Keeps everything in PB.

**Demographic fit:**
- Spain Statistical Office (INE) data: 95% of Spanish adults aged 25-54 use email at least monthly. 100% have a smartphone capable of clicking a link.
- 75% read email on mobile. Magic-link UX (one-click) works well on mobile.

## Files Affected

When implemented in Week 3:

- [src/schemas/customer_users.schema.json](../../src/schemas/customer_users.schema.json) — PB **auth collection**: `email` (unique per tenant), `email_verified` (bool), `tenant_id`, `customer_id` (link to CRM record, nullable for fresh signups), `created`/`updated`. **NO password field** (PB auth collection allows password to be optional via `requirePassword: false`).
- [src/schemas/magic_link_tokens.schema.json](../../src/schemas/magic_link_tokens.schema.json) — `email` (lowercase, indexed), `token_hash` (SHA-256 of random 32-byte token), `tenant_id`, `expires_at` (30 min after creation), `consumed_at` (null until used), `request_ip` (for rate-limit + audit), `request_user_agent`.
- [src/actions/customer-auth.ts](../../src/actions/customer-auth.ts) — `requestMagicLink({email})`, `verifyMagicLink({token})`, `signOut()`. Rate-limit: 5 requests/hour/email and 10/hour/IP.
- [src/emails/CustomerMagicLink.tsx](../../src/emails/CustomerMagicLink.tsx) — React Email template with the magic link and a "didn't request this? ignore" disclaimer.
- [src/app/cuenta/login/page.tsx](../../src/app/cuenta/login/page.tsx) — email input + submit.
- [src/app/cuenta/login/sent/page.tsx](../../src/app/cuenta/login/sent/page.tsx) — "check your inbox" confirmation, with resend CTA after 60s.
- [src/app/cuenta/verify/[token]/page.tsx](../../src/app/cuenta/verify/%5Btoken%5D/page.tsx) — server-side token validation; on success, set `cust_auth` cookie + redirect to `/cuenta`.
- [middleware.ts](../../middleware.ts) — `/cuenta/**` route protection (already planned for Week 3); now reads `cust_auth` cookie.

## Timeline Impact

**+0 days.** Magic-link implementation fits within Week 3 estimate (1 week for full customer auth + dashboard). The working assumption in the plan was already "magic-link primary"; this decision validates and locks the schema shape.

**No retroactive changes** to Week 1 (foundation) or Week 2 (customer flows + admin login fix).

## Open Questions / Follow-ups

- **Account deletion / right to erasure:** how do we handle pending magic-link tokens for a deleted account? Token table has `email` only (not `customer_user_id`); deletion of the user doesn't auto-clean tokens. Add a cleanup hook or rely on natural expiry (30 min). Defer to Week 3 implementation.
- **WhatsApp code as secondary:** if conversion metrics post-launch show <40% magic-link completion within 1h, add WhatsApp code as alternative channel. Post-launch decision; instrument logging in Week 3 for `magic_link_request → magic_link_verify` funnel.
- **OAuth as future addition:** Google sign-in could be added in a follow-up epic if metrics show demand. Not blocking v1.
- **Existing customers (CRM rows without `customer_user_id`):** when an existing CRM customer (e.g., booked previously, has email on file) requests a magic link, we should auto-create the `customer_users` row + link `customer_id`. Document this "claim flow" in Week 3 spec.
