# FEAT-017 — Admin: Quote (Presupuesto) Management

## Intent

Give the owner a complete quote pipeline — from chatbot-sourced requests to manually created quotes, to sent/approved quotes. Satisfies RD 1457/1986 (written quote before repair) and converts customer inquiries into confirmed bookings. This is a revenue-critical workflow.

## Acceptance Criteria

### Quote Pipeline (`/admin/quotes`)
1. [ ] Kanban board with columns: Pendiente / Enviado / Aprobado / Rechazado
2. [ ] Quote cards show: customer name, vehicle/service, amount (€ total incl. IVA), created date, expiry date
3. [ ] Visual expiry warning (amber) when quote expires in < 3 days; red when expired
4. [ ] Filter by status, sort by date or amount

### Create Quote (`/admin/quotes/new`)
5. [ ] Form: select/create customer, select/enter vehicle plate, service type description, line items (description, qty, unit price, type: labor/parts/diagnostic)
6. [ ] Auto-calculate: subtotal, IVA (from config), total
7. [ ] Auto-set expiry = today + 12 business days (RD 1457/1986)
8. [ ] Save as `draft`; separate "Enviar al cliente" action sends email + SMS

### Quote Detail (`/admin/quotes/[id]`)
9. [ ] Full quote display: all line items, totals, validity dates
10. [ ] Status actions: draft → "Enviar" | sent → "Marcar aprobado" / "Marcar rechazado" | approved → "Crear cita"
11. [ ] "Crear cita desde presupuesto" pre-fills appointment creation with customer + services
12. [ ] "Enviar por email/SMS" button: sends quote summary to customer (no PDF for MVP — plain text)
13. [ ] Quote shows: "Presupuesto sin compromiso. Válido 12 días hábiles. Precios sin IVA."
14. [ ] Edit line items when in draft/sent status

## Quote Kanban Design

```
┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐
│  PENDIENTE(3) │  │  ENVIADO (5)  │  │ APROBADO (2)  │  │RECHAZADO(1) │
│               │  │               │  │               │  │             │
│ [García·€240] │  │ [López·€380]  │  │ [Pérez·€95]  │  │[Mora·€180]  │
│  Diagnóstico  │  │ Frenos+neumát │  │ Pre-ITV       │  │ Motor       │
│  ⚠️ 2d expiry │  │  Vence 20 abr │  │ → Cita 15 may │  │ Rechazado   │
└───────────────┘  └───────────────┘  └───────────────┘  └─────────────┘
```

## Constraints

- **RD 1457/1986**: quote must state validity (12 días hábiles), non-binding nature, prices excl. IVA
- **IVA**: `iva_rate` from config at quote creation time — stored on quote record (rate may change)
- **No PDF**: deferred; email/SMS uses plain text summary for MVP
- **Tenant isolation**: all queries scoped; status transitions validated server-side
- **LOPDGDD**: customer data in quote protected; consent already captured at chatbot stage

## Quote Email Template (plain text)

```
Presupuesto Talleres AMG — {businessName}
Para: {customerName} · Vehículo: {plate}
Fecha: {date} · Válido hasta: {validUntil} (12 días hábiles)

CONCEPTOS:
- {item.description}  {item.qty} × {item.unit_price} = {item.subtotal}
...
──────────────────────────
Subtotal (sin IVA): {subtotal}
IVA ({iva_rate}%):  {iva_amount}
TOTAL:              {total}

Este presupuesto es orientativo y sin compromiso.
Para confirmar su cita: {bookingLink}
```

## Files to Touch

- `src/app/(admin)/admin/quotes/page.tsx` — kanban pipeline
- `src/app/(admin)/admin/quotes/new/page.tsx` — create quote form
- `src/app/(admin)/admin/quotes/[id]/page.tsx` — quote detail
- `src/core/components/admin/QuoteKanban.tsx`
- `src/core/components/admin/QuoteForm.tsx`
- `src/actions/admin/quotes.ts` — new: `getQuotes()`, `createQuote()`, `updateQuoteStatus()`, `sendQuote()`
