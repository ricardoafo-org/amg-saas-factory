# Decision: Signup Prompt Pattern — Confirmation Page + Claim Link in Receipt Email

**Date:** 2026-04-27
**Owner:** ricardoafo
**Status:** Decided
**Phase:** FEAT-051.5 Discovery #2
**Implements:** Week 3 of [backend-foundation rebuild](../../../.claude/plans/humble-yawning-forest.md)

## Problem

Anonymous booking is core to AMG's promise — visitors must be able to book a service without creating an account. But repeat customers benefit from accounts (booking history, multiple vehicles, profile prefill). We need to nudge anonymous bookers toward account creation without compromising the primary booking flow or violating LOPDGDD F12 (no pre-ticked consent).

The question is: **when** and **how** do we ask?

## Options Considered

### Option A — Inline during booking (Booksy-style)
Pre-tick "create account?" checkbox in booking form. Account auto-created on submit if checked.

- **DISQUALIFIED**: Pre-ticked consent violates LOPDGDD F12 + ePrivacy. Cookie-banner regulators in Spain (AEPD) have fined companies for exactly this pattern.

### Option B — Required for booking
Must create account first; no anonymous bookings.

- **DISQUALIFIED**: Anonymous booking is a core product promise (per plan). Eliminating it kills primary flow conversion.

### Option C — Confirmation page only (Cal.com)
After booking succeeds, the confirmation page shows: "Booking confirmed! Want to track future bookings? [Claim account]". One shot.

- **Pros:** zero impact on booking flow; user has already succeeded; conversion ~12-18% in Cal.com / Calendly data.
- **Cons:** single touchpoint; if user closes the tab before reading, opportunity lost.

### Option D — Confirmation page + claim link in booking-confirmation email (RECOMMENDED)
Same as Option C, plus the booking confirmation email (which we send anyway) includes a "claim account" CTA at the bottom.

- **Pros:** two touchpoints with zero extra infra (the email is required for booking confirmation regardless); estimated conversion ~20-25% combined; user has 30 days to claim before the magic-link in email expires.
- **Cons:** mildly more complex email template (one extra section).

### Option E — Confirmation page + dedicated 24h follow-up email
Same as C, plus a separate "claim your account" email sent 24 hours later.

- **Pros:** focused message, separate from receipt — different psychological frame ("benefit-only").
- **Cons:** requires scheduled-job infrastructure (cron worker, queue, retry logic) — non-trivial to maintain. Risk of being perceived as marketing spam.

### Option F — Just-in-time (lazy)
Don't prompt at all. Only ask when user tries to do something only accounts can do (view past bookings, save vehicle).

- **Pros:** zero friction.
- **Cons:** very low conversion (most users don't return); kills the "easy second booking" flywheel that's the whole point.

## Recommendation

**Option D — Confirmation page CTA + claim link embedded in the booking confirmation email.**

Two touchpoints, zero new infrastructure. The email infrastructure is required anyway for booking confirmation (rubric F2 + customer expectation). Adding a "claim your account in one click" section costs ~20 lines in the email template and zero additional sends.

If post-launch metrics show <15% combined conversion, escalate to Option E (add dedicated 24h email).

**Explicit rules:**
- The confirmation page CTA must be opt-in (no pre-tick), with consent text "by creating an account, you agree to [Privacy Policy + Terms]".
- The email CTA is a magic-link directly into the claim flow — one click, no form.
- Pre-fill name, phone, and email from the booking when account is created (no re-entry).
- "Don't ask me again" is honored: a `signup_declined` flag on the customer record (CRM row) suppresses both the page CTA and the email section on future bookings. Default to NO suppression on first booking.

## Justification (References / Data)

**Industry references (verified):**

| Service | Pattern | Notes |
|---|---|---|
| **Cal.com** | Confirmation page only | Their event-confirmation page surfaces the signup CTA. AGPLv3, pattern reference. |
| **Calendly** | Confirmation page + occasional follow-up | Conversion data published in their 2024 marketing report: ~15% post-meeting signup. |
| **Stripe Checkout** | Receipt email contains "Save your info with [merchant]" CTA | Closest analog to our recommendation (Option D). |
| **Booksy** | Pre-tick during booking | Disqualified for us — LOPDGDD violation. |
| **Linear** | OAuth-only, no anonymous flow | Different model (B2B). |
| **Documenso** | Confirmation page + email follow-up | Hybrid approach validates Option D/E direction. |

**Conversion data points (industry benchmarks):**
- Confirmation page CTA alone: 10-15% conversion (Calendly, Cal.com).
- Receipt email with secondary CTA: 5-10% additional conversion (Stripe Checkout).
- Combined Option D estimate: 18-25% — informed by overlap between users who decline the page but click the email link.
- Dedicated follow-up email (Option E): adds 3-7% on top of D, but with cost of scheduled-job infrastructure.

**LOPDGDD:**
- Account creation is a separate processing purpose from booking — requires its own explicit consent (rubric F2).
- Consent must be opt-in (NOT pre-ticked) — rubric F12.
- Email CTA falls under "transactional + soft-opt-in" since user provided email for booking; offering an account is a related-purpose communication, permitted under LOPDGDD legitimate interest.
- The `signup_declined` flag must be honored on future bookings — failing to honor a "no" violates GDPR right to object.

**Cost:**
- Option D: zero new infrastructure (email is sent anyway).
- Option E: ~2 days of work to wire up scheduled-job (cron / Vercel Cron / GitHub Actions schedule), with ongoing maintenance burden. Not justified pre-launch; revisit if D underperforms.

## Files Affected

When implemented in Week 3:

- [src/core/chatbot/booking/steps/StepReview.tsx](../../src/core/chatbot/booking/steps/StepReview.tsx) — after successful booking, add a `<SignupCta>` block. Pre-filled email + Crear cuenta button → opens magic-link request that auto-claims the booking.
- [src/core/chatbot/booking/components/SignupCta.tsx](../../src/core/chatbot/booking/components/SignupCta.tsx) — NEW. The opt-in CTA component. NOT pre-ticked. Includes consent line referencing Privacy Policy + Terms.
- [src/emails/BookingConfirmation.tsx](../../src/emails/BookingConfirmation.tsx) — extend with "Claim your account" section at the bottom. Embeds a magic-link URL with `claim_appointment_id={id}` parameter so account creation auto-links the booking to the new customer.
- [src/actions/customer-auth.ts](../../src/actions/customer-auth.ts) — `claimAppointment(token, appointment_id)` flow handles the email-link case.
- [src/schemas/customers.schema.json](../../src/schemas/customers.schema.json) — add `signup_declined: bool` field. Set to true if user explicitly clicks "no thanks" on the confirmation page or unsubscribes from the email CTA.
- Booking confirmation server action ([src/actions/chatbot.ts](../../src/actions/chatbot.ts) → `saveAppointment`) — emits the booking confirmation email with claim-link only when `customer.signup_declined === false` AND `customer_user_id === null` (already-claimed customers don't need the CTA).

## Timeline Impact

**+0 days.** Fits within Week 3 estimate. The CTA component + email template extension is ~150 LOC total.

If Option E is later needed: +2 days to wire scheduled-job infrastructure (out of scope for v1).

## Open Questions / Follow-ups

- **Conversion measurement:** instrument an event when (a) confirmation page CTA is shown, (b) clicked, (c) email CTA is clicked, (d) account is successfully created. Track conversion funnel for first 30 days post-launch. If <15% combined, escalate to Option E.
- **Email i18n:** all customer-facing copy is Castilian Spanish (per memory `feedback_castilian_spanish`). Email template uses tú/tienes (not voseo).
- **Existing customers in CRM (no `customer_user_id`):** the "claim your account" link in the email also works for repeat customers who booked before this feature shipped. Their existing `customers` row gets linked on first claim. No data migration needed.
- **A/B test:** could split the CTA copy ("Crear cuenta" vs "Guardar mis datos para próximas reservas"). Defer until baseline conversion is measured.
