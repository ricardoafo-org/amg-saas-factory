---
id: ADR-002
title: Presupuesto (quote) collection schema and RD 1457/1986 compliance
status: accepted
date: 2026-04-18
---

## Context

RD 1457/1986 (Ordenación de Talleres de Reparación de Vehículos) requires that every car workshop provide a written, signed quote (presupuesto) before starting any repair. This quote must include: line items, labor + parts breakdown, IVA, validity period (12 días hábiles minimum). FEAT-005 adds a chatbot quote-request flow; Sprint 6 adds full quote management in the owner dashboard.

## Decision

Create a `quotes` collection in PocketBase with status workflow `draft → sent → approved → rejected → invoiced`. Store line items as a `items` JSON field on `quotes`. A separate `quote_items` collection is not warranted for MVP.

## Rationale

The quote lifecycle is: owner drafts internally or customer requests via chatbot → owner adds pricing → sends PDF to customer → customer approves/rejects → on approval, triggers work order. A JSON `items` field on `quotes` is sufficient for ≤20 items per quote. This avoids a second collection while still being human-readable in the PB admin UI.

## Quote fields

```
quotes: {
  tenant_id: text (required)
  customer_name: text
  customer_email: email
  customer_phone: text
  vehicle_description: text
  vehicle_plate: text
  problem_description: text (customer-provided)
  service_type: text
  items: json  // [{description, qty, unit_price, type: 'labor'|'parts'|'diagnostic'}]
  subtotal: number  // computed: sum of items (excl IVA)
  iva_rate: number  // from config at time of creation
  total: number     // subtotal * (1 + iva_rate)
  status: select [pending, sent, approved, rejected, invoiced]
  valid_until: date  // created + 12 business days (RD 1457/1986)
  notes: text
  pdf_url: text     // generated on demand
  source: select [chatbot, manual]  // where the quote originated
}
```

## Alternatives Considered

| Option | Rejected because |
|---|---|
| `quote_items` as separate collection | Over-engineering; querying requires extra PB join; complicates owner UI |
| Embed quotes in appointments | Quotes can exist independently (no booking yet); different lifecycle |
| Single `description` text field | Not machine-readable; can't compute totals; fails RD 1457 itemization requirement |

## Consequences

- Positive: Full RD 1457/1986 compliance (itemized, dated, validity period)
- Positive: JSON items are flexible for any service type without schema change
- Positive: Chatbot quote requests populate `pending` status; owner adds pricing
- Negative: No DB-level constraint on items structure (app-level validation via Zod)
- Neutral: PDF generation deferred to post-Sprint 6 (html-to-pdf via server action)

## Review trigger

When multi-tenant quote volume exceeds 1000/month or when PDF generation + e-signature becomes required.
