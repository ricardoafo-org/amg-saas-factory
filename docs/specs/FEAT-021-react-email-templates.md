# FEAT-021 — React Email Templates + Mailtrap Testing (Sprint 3.5)

## Intent

Replace the current inline HTML strings in `src/actions/chatbot.ts` with typed, testable React Email components. Emails must be brand-consistent (logo, colors, typography), testable via Mailtrap in CI, and visually previewable in the admin dashboard. Covers: appointment confirmation, quote request, quote sent, appointment reminder, vehicle ready notification.

## Acceptance Criteria

1. [ ] `src/emails/` directory with one React Email component per template
2. [ ] Templates: `AppointmentConfirmation`, `QuoteRequest`, `QuoteSent`, `AppointmentReminder`, `VehicleReady`
3. [ ] Each template uses brand colors from config (not hardcoded hex)
4. [ ] Each template includes: SVG logo (from public/logo.svg), business name, address, phone
5. [ ] `AppointmentConfirmation` includes: customer name, service(s), date/time, vehicle plate, warranty note (RD 1457/1986), cancel/reschedule link
6. [ ] `QuoteSent` includes: line items table, subtotal, IVA breakdown, total, validity date (RD 1457/1986), approval CTA link
7. [ ] `AppointmentReminder` includes: appointment details, reschedule link, one-click cancel
8. [ ] `VehicleReady` includes: plate, services performed, amount due, business hours
9. [ ] Preview route: `/admin/email-preview/[template]` renders each template in browser (dev + admin use)
10. [ ] Mailtrap integration test: `src/emails/__tests__/delivery.integration.test.ts` sends each template to Mailtrap inbox and asserts delivery
11. [ ] Visual regression: Playwright screenshots of each email template at preview route
12. [ ] `chatbot.ts` updated to use new templates via `react-dom/server` renderToStaticMarkup
13. [ ] `MAILTRAP_API_TOKEN`, `MAILTRAP_INBOX_ID` added to `.env.example`
14. [ ] `npm run type-check` → zero errors; `npm test` → all pass

## Offline Slot Caching (bundled in Sprint 3)

Add localStorage slot cache to `ChatEngine.tsx`:
- Cache key: `amg_slots_{tenantId}` 
- Cache value: `{ slots: AvailableSlot[], cachedAt: ISO string }`
- TTL: 30 minutes (slots don't change frequently enough to warrant shorter)
- On `load_slots` action:
  1. Try server `getAvailableSlots()` → on success, update cache + display
  2. On network error → read cache → if cache valid (< 30min), show slots with banner: "Mostrando disponibilidad guardada. Puede no reflejar cambios recientes."
  3. If no cache → show "Sin conexión. Llámanos al {phone}"
- On `ServiceWorker` offline event → same fallback path
- Cache invalidated on successful slot booking (`bookSlot()` clears it)

## Constraints

- **react-email**: `@react-email/components` + `@react-email/render` — no other email libraries
- **No external CDN in emails**: all images base64-encoded or hosted on same domain (email clients block external resources)
- **IVA**: always from config — never hardcoded in templates
- **Tenant config**: brand colors, logo, address loaded per-tenant
- **Mailtrap**: only in test environment (NODE_ENV=test) — production uses Resend

## Files to Touch

- `package.json` — add `@react-email/components`, `@react-email/render`
- `src/emails/AppointmentConfirmation.tsx`
- `src/emails/QuoteRequest.tsx`
- `src/emails/QuoteSent.tsx`
- `src/emails/AppointmentReminder.tsx`
- `src/emails/VehicleReady.tsx`
- `src/emails/__tests__/delivery.integration.test.ts`
- `src/emails/__tests__/render.test.ts` — unit tests: each template renders without throwing
- `src/app/(admin)/admin/email-preview/[template]/page.tsx`
- `src/actions/chatbot.ts` — swap inline HTML for template renders
- `src/core/chatbot/ChatEngine.tsx` — add localStorage slot cache
- `.env.example` — add MAILTRAP_* vars
