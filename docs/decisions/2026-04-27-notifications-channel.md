# Decision: Notifications Channel — WhatsApp + Email Primary, SMS Deprecated for Customer Flows

**Date:** 2026-04-27
**Owner:** ricardoafo
**Status:** Decided
**Phase:** FEAT-051.5 Discovery #4
**Implements:** Week 4 of [backend-foundation rebuild](../../../.claude/plans/humble-yawning-forest.md)
**Couples to:** [Discovery #6 — Mechanic notes workflow](2026-04-27-mechanic-notes-workflow.md) (same WhatsApp infrastructure)

## Problem

AMG sends customers multiple notification types: booking confirmation, reminders, cancellations/reschedules, quote-ready alerts, magic-link auth (per Discovery #1), account-claim invites (per Discovery #2), and post-service completion summaries with photos (pending Discovery #6). Each has different content shape (short alert vs receipt PDF vs photo album) and different urgency.

Today: email-only via Resend, plus a Twilio SMS surface used by admin for ad-hoc messages. Spanish auto-repair customers (35+ demographic) primarily communicate via WhatsApp; email read rates skew lower in this segment than B2B benchmarks.

The decision: which channels are primary, and which are removed/parked?

## Options Considered

### Option A — Email-only (current)
Status quo. All notifications via Resend.

- **Pros:** zero infra change; Resend already integrated; free at our scale.
- **Cons:** Spanish 35+ adult email read rate is ~25-40% within 24h vs WhatsApp ~95% within 1h. Reminders especially suffer — a "your appointment is tomorrow at 10" email read 3 days late is useless.
- **Disqualified:** locks us into the read-rate ceiling.

### Option B — Email + SMS (current + Twilio)
Use SMS for short alerts; keep email for receipts.

- **Pros:** SMS is universally accessible; Twilio is integrated.
- **Cons:** SMS feels institutional in Spain (used by banks, telcos, government); SMS read rates have declined as WhatsApp absorbed personal messaging. Cost: ~€0.07/SMS in Spain; 1000 bookings/month × 3 messages each = €210/month.

### Option C — WhatsApp + email primary, SMS deprecated for customer flows (RECOMMENDED)
WhatsApp Business API for short alerts with action (confirmation, reminder, completion); email for formal/long content (receipts, quotes, magic-link, claim invite); SMS removed from customer-facing automation but preserved as admin-only ad-hoc tool.

- **Pros:** matches Spanish demographic preference; WhatsApp ~95% read rate vs SMS ~85%; cheaper than SMS at our volume (~€150/month vs €210/month for same coverage); shared infra serves Discovery #6 if mechanic notes go Pattern B; admin still has SMS escape hatch when needed.
- **Cons:** WhatsApp Business API has setup friction — Meta verification (~7-14 days) + per-template approval (~5-10 days each). Application MUST start now (Week 0.5 deliverable). Templates must be pre-approved before use; ad-hoc messages outside the 24h "user-initiated" window cost more and require templates.

### Option D — WhatsApp-only
WhatsApp as the single primary channel.

- **Pros:** simpler.
- **Cons:** can't send long content with attachments (PDF quotes, multi-photo work-done summaries) over WhatsApp without complications; no fallback for users without WhatsApp (~5% of Spanish adults still don't have it); LOPDGDD right-of-access exports usually go via email.
- **Disqualified:** removes our ability to deliver formal content cleanly.

## Recommendation

**Option C — WhatsApp + email primary, SMS deprecated for customer-facing automation, kept as admin-only ad-hoc tool.**

**Channel matrix:**

| Notification | Channel | Why |
|---|---|---|
| Magic-link auth (Discovery #1) | Email only | Receipt-style; need clickable URL; standard B2C SaaS |
| Account-claim invite (Discovery #2) | Email only | Same — embedded in booking confirmation email |
| Booking confirmation | Email + WhatsApp | Email = receipt of record; WhatsApp = quick acknowledgment |
| Booking reminder (24h before) | WhatsApp primary, email fallback | High urgency, short content |
| Cancellation / reschedule | Email + WhatsApp | Same as confirmation; both channels |
| Quote ready | Email (with PDF) | Long content, formal; WhatsApp link is optional secondary |
| Service complete (Discovery #6) | Email (with photos) + WhatsApp link | Long form via email; alert via WhatsApp |
| Ad-hoc admin → customer | SMS + WhatsApp + email (admin's choice) | Admin discretion for one-off cases |

**Customer preferences:**
- Default: WhatsApp + email both enabled if phone is provided.
- Customer dashboard (`/cuenta/preferencias` — Week 3) lets user opt out of WhatsApp (email-only fallback) or email marketing (transactional email cannot be opted out per LOPDGDD).
- `customers.whatsapp_opted_in: bool` defaults to `true` (assumed-yes if phone provided at booking, with disclosure in booking flow consent text — LOPDGDD-compliant per "legitimate interest for service delivery").
- `customers.preferred_notification_channel: whatsapp | email` defaults based on phone presence.

**Implementation strategy:**
- `src/lib/notifications.ts` — channel-agnostic dispatcher: `notify({ customer, type, data, channel? })`. Picks channel based on customer preference + notification type rules.
- `src/lib/notifications/whatsapp.ts` — Meta WhatsApp Cloud API client (HTTP + access token, no SDK needed).
- `src/lib/notifications/email.ts` — wraps existing Resend integration.
- `src/lib/notifications/sms.ts` — wraps existing Twilio integration; kept dormant for admin-only use.
- `notification_log` schema — audit trail (channel, recipient, template_id, status, sent_at, delivered_at, error).

**SMS deprecation path:**
- v1 (Week 4): customer-facing automation no longer uses SMS. Admin SmsComposer continues working for ad-hoc messages.
- v2 (post-launch): if SMS volume drops to zero over 90 days, remove Twilio integration entirely.

## Justification (References / Data)

**Spain market data:**
- **WhatsApp adoption:** ~95% of Spanish adults aged 18-65 use WhatsApp (Statista 2024); ~85% use it daily.
- **Email mobile read rate:** ~75% read on mobile, but only ~35-50% within 24h for transactional emails in older demographics (Litmus 2024 Spanish-segment data).
- **SMS in Spain:** declining; 80% of Spanish under-65s prefer WhatsApp over SMS for personal communication (Telefonica annual report).
- **AEPD enforcement:** WhatsApp marketing requires explicit opt-in. Transactional WhatsApp (booking confirmation, service reminders) falls under "legitimate interest" — same as transactional email — and is permitted with clear disclosure.

**Cost analysis (1000 bookings/month, 3 messages each):**

| Channel | Per-message cost | Monthly cost | 24h read rate |
|---|---|---|---|
| Email (Resend) | Free under 3K/month | €0 | ~35-50% |
| WhatsApp Business | €0.05 | €150 | ~95% |
| SMS (Twilio) | €0.07 | €210 | ~85% |

WhatsApp wins on cost AND engagement vs SMS for Spanish 35+ demographic.

**Industry references:**
- **Booksy in Spain:** uses WhatsApp + SMS hybrid. Email not primary.
- **Citas-Médicas / health appointment apps:** WhatsApp dominant.
- **Spanish auto-repair shops (informal):** mechanics already use WhatsApp Business via personal accounts. Formalizing this is a competitive advantage.

**LOPDGDD considerations:**
- WhatsApp Business API processes data via Meta's infrastructure (US/EU). Inclusion in privacy policy as a sub-processor required (already in current policy template per FEAT-009 legal pages).
- Customer must be able to opt out of WhatsApp (preference saved on `customer_users` row). Honored on next notification dispatch.
- Right of access: `notification_log` rows must be exportable (LOPDGDD article 15).

## Files Affected

When implemented (Week 4):

**Schemas (Week 1 prep):**
- [src/schemas/customers.schema.json](../../src/schemas/customers.schema.json) — add `preferred_notification_channel: whatsapp | email`, `whatsapp_opted_in: bool`, `email_opted_in: bool` (transactional always allowed; this is for non-transactional only).
- [src/schemas/notification_log.schema.json](../../src/schemas/notification_log.schema.json) — NEW. Audit trail.

**Library (Week 4):**
- [src/lib/notifications/index.ts](../../src/lib/notifications/index.ts) — `notify()` dispatcher.
- [src/lib/notifications/whatsapp.ts](../../src/lib/notifications/whatsapp.ts) — WhatsApp Cloud API client (~150 LOC).
- [src/lib/notifications/email.ts](../../src/lib/notifications/email.ts) — refactor existing Resend usage to channel module.
- [src/lib/notifications/sms.ts](../../src/lib/notifications/sms.ts) — keep existing Twilio code, expose only to admin SmsComposer surface.

**Templates (Week 4):**
- WhatsApp templates (each requires Meta pre-approval, 5-10 days each):
  - `booking_confirmation`
  - `booking_reminder_24h`
  - `booking_cancelled`
  - `quote_ready`
  - `service_complete`
- Email templates ([src/emails/](../../src/emails/)) — already exist for booking confirmation; extend for new channels (cancellation, reminder, service-complete-with-photos).

**Existing actions migrated (Week 4):**
- [src/actions/chatbot.ts](../../src/actions/chatbot.ts) → `saveAppointment` calls `notify({type: 'booking_confirmation'})` instead of direct `resend.emails.send()`.
- [src/actions/sms.ts](../../src/actions/sms.ts) → narrow to admin SmsComposer only; remove from customer-facing automation paths.

**Admin UI (Week 4):**
- [src/core/components/admin/SmsComposer.tsx](../../src/core/components/admin/SmsComposer.tsx) → rename to `MessageComposer.tsx` with channel selector (SMS / WhatsApp / email).

**Config:**
- New env vars (env-scoped on tst and pro): `WHATSAPP_BUSINESS_PHONE_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN` (for webhook).

## Timeline Impact

**+0 days IF WhatsApp Business application is submitted on Week 0.5 Day 1.** Meta verification + first-template approval timeline (~14-21 days total) overlaps with Weeks 1-3 of the rebuild — both finish around the start of Week 4.

**Critical path: WhatsApp Business application submission must happen NOW.** Without it, Week 4 ships email-only and WhatsApp slots in as a follow-up release. Per the plan's parallel-kickoff section, this is already flagged as a Day 1 user task.

**Couples with Discovery #6:** if mechanic-notes workflow goes Pattern B (WhatsApp ingest), the WhatsApp Business setup is justified by both customer notifications AND mechanic ingest — strong "two drivers, one infra" case.

## Open Questions / Follow-ups

- **WhatsApp template wording:** drafts needed early Week 4 to allow ~5-10 day approval window. Iterations may be needed if Meta rejects (templates can't include marketing-style content; must be transactional). Draft in Spanish (tú/tienes per memory `feedback_castilian_spanish`).
- **Webhook handling:** customer replies to a WhatsApp message reach our webhook. Out of scope for v1 (one-way notifications only). v2 could route replies into admin Comms surface.
- **SMS deprecation timing:** v2 retirement decision is metric-driven — track SMS send count over 90 days post-launch.
- **Phone number for WhatsApp Business:** must be a dedicated number (cannot be reused for personal WhatsApp). User to provision before Week 4. Could be a virtual number (Telnyx, Vonage) if AMG doesn't have a spare landline.
- **Marketing channel (newsletter, promotions):** out of scope for v1. Transactional only. Marketing notifications require separate explicit opt-in per LOPDGDD; defer to a marketing-feature epic.
