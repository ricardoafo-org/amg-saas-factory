# Decision: Service / Quote / Parts Model — Catalog + Custom + Per-Job Parts; No Payments

**Date:** 2026-04-27
**Owner:** ricardoafo
**Status:** Decided
**Phase:** FEAT-051.5 Discovery (extended scope from user input)
**Implements:** Week 4 of [backend-foundation rebuild](../../../.claude/plans/humble-yawning-forest.md)
**Reference:** [docs/domain/shop-workflow.md](../domain/shop-workflow.md)

## Problem

The user clarified three things that meaningfully change the rebuild scope:

1. **Payments are out of scope** — customers pay in shop (cash or card terminal not integrated to our system). No Stripe, no PCI, no payment flows.
2. **Custom services exist** — many real jobs aren't on the public catalog (e.g., "replace shifter assembly on 2018 Renault Mégane"). Price + duration depend on the specific car and parts. Admin must create these on-the-fly.
3. **Parts/supplier tracking is needed** — when a job needs parts ordered, the shop and customer want to know "what was ordered, from whom, when does it arrive". This is THE biggest source of customer-shop friction today (per domain doc).

Each of these has product implications that need to be locked before Week 1 schemas are written.

## Options Considered

### Option A — Minimal: catalog-only services, no quotes, no parts (current state)
Keep the existing model: a fixed services catalog, appointments link to a service, that's it.

- **Pros:** smallest scope; ships fastest.
- **Cons:** unusable for ~70% of real shop work (anything beyond commodity services). Users would have to fall back to phone/WhatsApp for custom jobs, defeating the purpose.
- **Disqualified:** doesn't reflect how a shop actually works.

### Option B — Catalog + custom services + basic quote workflow + per-job parts (RECOMMENDED — v1 scope)
Both service types coexist. Catalog services are the "fast lane" (standard pricing, public). Custom services are admin-created during diagnosis, attached to an appointment, with a quote workflow (send to customer → customer approves → work proceeds). Parts are tracked at the appointment level (not at shop-inventory level): each appointment has a list of parts ordered + supplier + ETA.

- **Pros:** matches real shop operations; makes the digital tool ACTUALLY USEFUL (not just a fancy booking widget); foundation for future inventory/payments/multi-shop.
- **Cons:** more schemas, more UI work; pushes some scope into Week 4 that wasn't there before.

### Option C — Full inventory + supplier ordering + payments
Maximalist: stock levels per part, low-stock alerts, supplier ordering automation, integrated payments.

- **Pros:** complete shop OS.
- **Cons:** ~3-6 months of additional work; user explicitly deferred payments and inventory; over-engineered for one-shop AMG.
- **Disqualified for v1:** parked as future epic.

## Recommendation

**Option B — Catalog + custom services, basic quote workflow, per-job parts tracking. No payment processing.**

### Service Model

Two service "types" coexist in the same `services` collection:

```text
services (existing schema, extend)
  tenant_id, code, title, description,
  is_catalog (bool, default false)         ← NEW: true = on website / chatbot, false = admin-created custom
  base_price_net (existing)
  iva_rate (existing)
  default_duration_minutes (existing)
  warranty_months (default 3 per RD 1457/1986)
  warranty_km (default 2000)
  active (existing)
```

- **Catalog services** (`is_catalog=true`): exposed on website + chatbot, fixed pricing, fixed duration. Existing oil change, ITV, brakes, etc.
- **Custom services** (`is_catalog=false`): admin-created during diagnosis. Per-appointment in spirit, but represented as a service row so we can: (a) reuse if the same custom job recurs (e.g., "shifter assembly Mégane 2018" — likely seen again), (b) link parts to it, (c) track warranty.

Admin UX:
- Settings → Service catalog: only shows `is_catalog=true` (this is what's on the website).
- New appointment / quote → "Add service" picker shows catalog by default; "+ Custom service" button creates a new `services` row inline with `is_catalog=false`.
- Custom services accumulate over time and become a "private catalog" the admin can search.

### Quote / Estimate Workflow

A quote is created when a custom service is added or when the price/scope of a catalog service is adjusted for this specific job. The existing `quotes` collection is reused (already exists per FEAT-017 spec).

Status workflow:
```
draft → sent → viewed → approved → executed
                ↓
              declined
                ↓
              expired (auto after 14 days)
```

Customer interaction:
- Admin sends quote via WhatsApp + email (per Decision #4). Quote contains a magic link → `/cuenta/presupuestos/[id]` → customer can approve, decline, or request a call.
- Customer approval is recorded with timestamp + IP + user-agent (audit trail).
- Approved quote unblocks "ordered parts" / "in progress" status transitions on the appointment.

### Parts and Suppliers

Two new collections, kept simple:

```text
suppliers
  tenant_id, name, contact_email, contact_phone,
  typical_lead_days (default 3), notes

appointment_parts
  tenant_id, appointment_id, supplier_id (nullable for "got from inventory"),
  part_name (text — admin types it; could be normalized later),
  part_number (nullable, OEM/manufacturer reference),
  quantity (default 1),
  unit_cost_net,
  ordered_at, expected_at, arrived_at (nullable),
  status (enum: needed | ordered | arrived | installed),
  note
```

This is **per-appointment parts tracking, NOT inventory**. The shop knows what they have on the shelves; we only need to track what's specifically ordered for THIS car. Solves the "where's my car's part?" customer anxiety.

Admin UX:
- Appointment detail page → Parts tab. Add parts one at a time. Mark status as parts arrive.
- Supplier dropdown auto-completes from the `suppliers` table; admin can "+Add supplier" inline.
- Customer sees parts status on `/cuenta/citas/[id]` (read-only, with sanitized labels — no internal supplier names exposed).

### Status Workflow (Appointments)

Extends the existing `appointments.status` field:

```
booked          → received and slot reserved
diagnosed       → mechanic has assessed; quote may be pending
quote-pending   → quote sent to customer, awaiting approval
parts-ordered   → quote approved, parts on the way
parts-arrived   → all parts in; ready to schedule the work
in-progress     → mechanic actively working on it
ready-for-pickup → work complete; customer can pick up
paid            → admin marks "paid in shop" (manual; no payment processing)
completed       → archived for service history; warranty clock starts here
cancelled       → at any point pre-paid
```

Customer-facing dashboard (`/cuenta/citas/[id]`) shows the current status with a friendly timeline. Each status transition is a notification trigger (Decision #4 channels apply).

### No Payments

- **Removed from scope:** Stripe / Redsys / payment processing of any kind.
- **Kept:** an admin "Mark paid" button on `ready-for-pickup` appointments. Records `paid_at`, `paid_amount_total`, `paid_method` (cash | card | bank-transfer | other) — informational only, no money moves through our system.
- **Receipts/invoices:** generate a PDF for the customer (Hacienda-format invoice with CIF, IVA breakdown). PDF is downloadable from `/cuenta/citas/[id]`. No payment integration.

This is a **massive simplification**:
- No PCI compliance scope.
- No payment provider risk (Stripe outage doesn't break us).
- No refund / chargeback flows.
- No subscription billing complexity.
- Faster v1 ship.

### Provider/Supplier Long-Term

For v1: minimum viable supplier tracking (the table + admin UX above). For v2, when shop scales or AMG-the-product gains tenants:
- OEM part-number lookup (PartsBase / Mecabase API integration).
- Supplier ordering automation (email-out templates).
- Inventory levels and reorder points.
- Multi-supplier price comparison.

All deferred. Not justified at single-shop AMG scale.

## Justification (References / Data)

**Domain understanding:**
- See [docs/domain/shop-workflow.md](../domain/shop-workflow.md) for the full operational model. Key takeaway: shops are NOT booking platforms. They are multi-day relationships with continuous communication, and the parts-tracking problem is THE biggest pain.

**No-payments simplification:**
- Spanish auto shops have a strong "pay in person" culture (cash + POS terminal). Customers are used to it.
- Online payment integration adds 2-4 weeks of work + ongoing PCI maintenance. Not justified when in-shop POS is universally accepted.
- We can always add online payments in v2 if shop owners ask. Easier to add than remove.

**Shopmonkey / Tekmetric / AutoLeap reference (auto-shop SaaS, US-focused):**
- All have catalog + custom services. Validates Option B model.
- All have per-job parts tracking. Validates our parts schema.
- All have quote/estimate workflows with customer approval. Validates our quote flow.
- AutoLeap and Shopmonkey have integrated payments — but that's because US shops want online payment. Spanish shops differ; in-person payment is the norm here.

**Booksy / Calendly reference (general booking):**
- Their model is closer to Option A (commodity services only). Confirms Booksy is NOT the right reference for the deeper shop ops; auto-shop SaaS (Shopmonkey, Tekmetric) is.

**LOPDGDD:**
- Quote approval = explicit consent for the cost. Captured with timestamp / IP / user-agent.
- Parts tracking includes part numbers (not personal data) but customer's appointment context IS personal data. Standard tenant-scoping applies (rubric S2).
- Invoice PDF includes name + CIF — already personal data, already in scope.
- Right of erasure: anonymize past quotes (keep amounts and dates for tax record per Hacienda rules; strip names/contact).

## Files Affected

When implemented (Week 4):

**Schemas (Week 1 prep):**
- [src/schemas/services.schema.json](../../src/schemas/services.schema.json) — extend with `is_catalog`, `warranty_months`, `warranty_km`.
- [src/schemas/appointments.schema.json](../../src/schemas/appointments.schema.json) — extend status enum (add `quote-pending`, `parts-ordered`, `parts-arrived`, `paid`); add `paid_at`, `paid_amount_total`, `paid_method`.
- [src/schemas/quotes.schema.json](../../src/schemas/quotes.schema.json) — already exists (FEAT-017); extend status workflow + add `appointment_id` link.
- [src/schemas/suppliers.schema.json](../../src/schemas/suppliers.schema.json) — NEW.
- [src/schemas/appointment_parts.schema.json](../../src/schemas/appointment_parts.schema.json) — NEW.

**Server actions (Week 4):**
- [src/actions/admin/services.ts](../../src/actions/admin/services.ts) — `createCustomService` (inline during appointment creation).
- [src/actions/admin/quotes.ts](../../src/actions/admin/quotes.ts) — extend `createQuote` to accept custom-service line items + send via Decision #4 channels.
- [src/actions/admin/parts.ts](../../src/actions/admin/parts.ts) — NEW. CRUD on `appointment_parts`, supplier dropdown.
- [src/actions/admin/suppliers.ts](../../src/actions/admin/suppliers.ts) — NEW. CRUD.
- [src/actions/admin/appointments.ts](../../src/actions/admin/appointments.ts) — extend with `markPaid({appointment_id, amount, method})`.
- [src/actions/customer/quotes.ts](../../src/actions/customer/quotes.ts) — NEW. Customer-side `viewQuote`, `approveQuote`, `declineQuote`.

**Components (Week 4):**
- [src/core/components/admin/AppointmentDetail.tsx](../../src/core/components/admin/AppointmentDetail.tsx) — NEW. Tabs: services, parts, quote, status, customer.
- [src/core/components/admin/PartsList.tsx](../../src/core/components/admin/PartsList.tsx) — NEW.
- [src/core/components/admin/SupplierPicker.tsx](../../src/core/components/admin/SupplierPicker.tsx) — NEW.
- [src/core/components/admin/CustomServiceForm.tsx](../../src/core/components/admin/CustomServiceForm.tsx) — NEW.
- [src/core/components/admin/MarkPaidModal.tsx](../../src/core/components/admin/MarkPaidModal.tsx) — NEW.
- [src/app/cuenta/presupuestos/[id]/page.tsx](../../src/app/cuenta/presupuestos/%5Bid%5D/page.tsx) — NEW. Customer quote-approval page.
- [src/app/cuenta/citas/[id]/page.tsx](../../src/app/cuenta/citas/%5Bid%5D/page.tsx) — extend with status timeline, parts ETA, quote link.

**Templates:**
- WhatsApp templates: `quote_ready` (Decision #4 already lists this), `parts_arrived`, `service_complete`.
- Email templates: `QuoteEmail.tsx` (with quote PDF attached), `InvoicePdf.tsx` (Hacienda-format).

## Timeline Impact

**Week 4 grows by ~2 days.** Original Week 4 estimate was ~5 days. New estimate: ~7 days. Total rebuild plan grows from 5.5 → 6 weeks (still less than the 6.5-7-week ceiling discussed for Pattern A/C in mechanic notes).

**Week 1 schema scope grows** by 5 new schemas (services extension, suppliers, appointment_parts, quotes extension, appointments status enum). Still within Week 1's 5-day budget — schemas-as-code is mechanical work.

**Compression options if needed:**
- Defer quote workflow to v2: appointments still work (catalog services), just no quote feature for custom work. Saves ~3 days. Loses major value — quotes are ONE of the 3 highest-leverage features per domain doc.
- Defer parts tracking to v2: customer doesn't see ETA, admin uses paper notes. Saves ~2 days. Loses major value — this is THE biggest customer pain.
- **Don't defer either.** Both are core to the v1 promise. The 0.5-week timeline growth is the right tradeoff.

## Open Questions / Follow-ups

- **Custom service deduplication:** if admin creates "Replace shifter Mégane 2018" and a similar job comes in 6 months later, should the system suggest reusing? **Decision:** v1 stores them as distinct rows (admin can search later); auto-suggest is a v2 polish.
- **Quote PDF generation:** what library? Recommend `@react-pdf/renderer` (works with our React Email infrastructure) or Playwright server-side render. Decide at Week 4 implementation time.
- **Hacienda invoice format:** sequential number per tenant per fiscal year, with CIF, customer ID, breakdown. Standard format. Use a generator like [factura-electronica](https://github.com/quanrong/factura-electronica) or hand-roll. Defer to Week 4.
- **Warranty tracking:** when the warranty period expires, what triggers? **Decision:** soft event (no automated email). Customer service history view shows "warranty active until DATE" or "warranty expired". v2 could add "warranty expiring in 30 days" notification.
- **Multi-tenant pricing differences:** when AMG-the-product onboards more shops, each will have different `service.base_price_net`. Already supported via tenant_id scoping. No additional scope needed.
- **Tax exports for accountant:** AMG's accountant uses Contasol. v2 could export CSVs in Contasol-compatible format. Out of scope for v1.
