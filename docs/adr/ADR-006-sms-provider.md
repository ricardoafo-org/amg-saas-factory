---
id: ADR-006
title: SMS provider selection — Twilio
status: accepted
date: 2026-04-18
---

## Context

Sprint 6 requires SMS reminders (24h + 2h before appointment) and one-click reschedule links. The provider must support Spanish phone numbers, be reliable, have a good Node.js SDK, and fit within the budget of a small car workshop (typically <500 SMS/month).

## Decision

Use **Twilio** as the SMS provider. Twilio credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`) stored in environment variables and the `config` PocketBase collection (per-tenant overridable). SMS sending isolated to a server action `src/actions/sms.ts`.

## Rationale

Twilio has the best European number availability, best-in-class Node SDK (`twilio`), excellent deliverability to Spanish carriers (Movistar, Vodafone, Orange), and transparent pay-per-use pricing (~€0.08/SMS). The Node.js SDK is mature and well-documented. Alternative providers are cheaper but have worse Spanish market support.

## SMS types

| Type | Trigger | Template |
|---|---|---|
| Appointment confirmation | After `save_appointment` | "Tu cita en {nombre} el {fecha} a las {hora} está confirmada. Cancelar: {link}" |
| Reminder 24h | Cron 24h before | "Recuerda tu cita mañana a las {hora}. Reprogramar: {link}" |
| Reminder 2h | Cron 2h before | "Tu cita es en 2 horas ({hora}). Dirección: {address}" |
| Ready notification | Owner marks appointment ready | "Tu vehículo está listo para recoger en {nombre}. Horario: {hours}" |
| Quote sent | Owner sends quote | "Hemos preparado tu presupuesto. Revísalo aquí: {link}" |

## One-click reschedule

Reschedule links are short-lived JWT URLs (`/reschedule/{token}`) that load a simple page showing available slots. Token expires 24h after appointment. No auth required (token is the credential).

## Alternatives Considered

| Option | Rejected because |
|---|---|
| Vonage (Nexmo) | Good but smaller ecosystem, fewer Spain-specific examples |
| AWS SNS | Requires AWS account; more complex setup; no dedicated Spanish numbers |
| Brevo (ex-Sendinblue) | Primarily email; SMS is secondary product; worse deliverability |
| WhatsApp Business API | Higher setup cost; requires Meta business verification; out of scope for MVP |

## Consequences

- Positive: Best SDK + docs for Node.js; proven Spanish market deliverability
- Positive: Pay-per-use — €0 if not configured; workshop can opt-in later
- Positive: SMS log in `sms_log` collection for delivery audit
- Negative: US company handling personal data (phone numbers) — GDPR transfer clause needed in privacy policy
- Negative: TWILIO_* env vars required; missing vars = SMS silently skipped (not crash)
- Neutral: Twilio sandbox available for development (no real SMS sent)

## Review trigger

When monthly SMS volume exceeds 1000 (consider Vonage bulk pricing), or when WhatsApp Business becomes a requirement.
