# FEAT-031 — Customer Post-Booking Registration

**Sprint:** 8 — Design Alignment + UX Polish
**Priority:** High
**Branch:** `feature/FEAT-031-post-booking-registration`
**Author:** Claude (orchestrator) · 2026-04-25

## 1. Problem

The chatbot booking flow (`src/actions/chatbot.ts → saveAppointment`) writes appointments with **inline** customer fields (`customer_name`, `customer_email`, `customer_phone`) but never creates or links a record in the `customers` collection.

The admin side, by contrast, **already assumes** appointments are linked to customers — `src/actions/admin/customers.ts:140` filters appointments by `customer_id`, and the customer detail view only renders bookings tied to a customer record. Result: every chatbot booking is invisible from `/admin/customers/<id>` and counted as zero on `total_visits` / `total_spent` / `last_seen`. The whole "history of repeat customers" capability is dark today.

## 2. Goals

1. Every chatbot booking lands a row in the `customers` collection (or reuses an existing one by email + tenant).
2. `appointments.customer_id` becomes the canonical FK; inline customer fields stay for legacy/audit but the link is what admin reads.
3. `total_visits`, `total_spent`, `last_seen` increment correctly on each booking, no race conditions inside a single booking.
4. LOPDGDD invariant preserved: `consent_log` is still the FIRST write. Customer record creation does NOT precede consent.

## 3. Non-goals

- User accounts, magic-link login, customer self-service portal — separate sprint, separate spec.
- Backfill of existing chatbot appointments into `customers` — handled by a one-shot script, not part of this PR.
- Quote → customer linkage (`saveQuoteRequest` has the same gap, but quotes don't drive `total_spent` math; addressed in a follow-up).
- Marketing consent capture from the chatbot — current chatbot doesn't collect it, leave `marketing_consent` default `false`.

## 4. Schema changes

### `appointments` collection — add field

```js
new Field({
  name: 'customer_id',
  type: 'relation',
  collectionId: '<customers collection id>',
  required: false,                       // optional for backfill safety
  cascadeDelete: false,
})
```

Migration file: `pb_migrations/20260425130000_add_appointments_customer_id.js`. Required: `false` so the migration applies to a DB with existing inline-only appointments without errors.

No changes to `customers` collection — fields already exist.

## 5. Server flow

In `src/actions/chatbot.ts → saveAppointment`, between consent log and appointment create:

```ts
// 1. consent_log.create(...)  ← unchanged, MUST stay first
// 2. ivaConfig + serviceRecords  ← unchanged
// 3. find-or-create customer  ← NEW
const customerId = await findOrCreateCustomer(pb, {
  tenantId: payload.tenantId,
  name: payload.customerName,
  email: payload.customerEmail,
  phone: payload.customerPhone,
});
// 4. appointments.create({ ..., customer_id: customerId })  ← +1 field
// 5. update customer aggregates  ← NEW (after appointment exists)
await pb.collection('customers').update(customerId, {
  last_seen: new Date().toISOString(),
  total_visits: existingVisits + 1,
  total_spent: existingSpent + totalAmount,
});
```

### `findOrCreateCustomer` (new helper, same file)

```ts
async function findOrCreateCustomer(pb, { tenantId, name, email, phone }) {
  // Match by tenant + email (lowercased). Email is the only stable identifier we trust from chatbot input.
  const safeEmail = email.toLowerCase().trim();
  try {
    const existing = await pb.collection('customers').getFirstListItem(
      `tenant_id = "${tenantId}" && email = "${safeEmail}"`,
    );
    return existing.id;
  } catch {
    const created = await pb.collection('customers').create({
      tenant_id: tenantId,
      name,
      email: safeEmail,
      phone,
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      total_visits: 0,        // bumped to 1 after appointment commits
      total_spent: 0,         // bumped after appointment commits
      preferred_contact: 'email',
      marketing_consent: false,
      notes: '',
    });
    return created.id;
  }
}
```

### Failure handling

- Customer create fails → throw, surface "Error al guardar tus datos" to client. Appointment is NOT written. Consent log already committed (acceptable — consent log is the audit trail; orphaned consent without appointment is fine and recoverable).
- Customer aggregate update fails AFTER appointment commits → log to console.error, do NOT throw. The appointment is the customer-facing artifact; aggregates are admin observability and can be reconciled by a nightly job.

## 6. Files touched

| File | Change |
|---|---|
| `pb_migrations/20260425130000_add_appointments_customer_id.js` | NEW · adds `customer_id` field to `appointments` |
| `src/types/pb.ts` | extend `Appointment` type with optional `customer_id` |
| `src/actions/chatbot.ts` | add `findOrCreateCustomer`, wire into `saveAppointment` |
| `src/actions/__tests__/chatbot.test.ts` | NEW unit tests (find-or-create paths, aggregate increment, consent-first invariant) |

## 7. Testing

### Unit (`src/actions/__tests__/chatbot.test.ts`)

- creates a customer when none matches tenant+email
- reuses customer on second booking with same email
- different tenant + same email → two separate customer rows (tenant isolation)
- `total_visits` increments by 1 after each booking
- `total_spent` increments by `total_amount` (base × (1 + iva))
- consent_log is awaited BEFORE customer find-or-create
- customer write failure throws — no appointment row, no aggregate touched
- aggregate update failure does NOT throw

### E2E (deferred to FEAT-032)

A scenario that books via chatbot and asserts the customer appears in `/admin/customers` will land in FEAT-032's retrofit suite.

## 8. Quality gates (merge checklist)

1. `npm run type-check` — zero errors
2. `npm test` — all green, new chatbot tests passing
3. `compliance-reviewer` — zero violations on touched files
4. `validator` chain — PASS on tenant isolation + LOPDGDD order
5. PR opened atomically with `gh pr create --reviewer ricardoafo --label type:feat --label area:chatbot --milestone "Sprint 8 — Design Alignment + UX Polish"`

## 9. Out-of-scope follow-ups

- One-shot backfill script for pre-FEAT-031 appointments
- Same find-or-create wiring for `saveQuoteRequest`
- Customer-facing self-service portal (magic link, view past bookings)
- Marketing consent capture in the chatbot booking flow
