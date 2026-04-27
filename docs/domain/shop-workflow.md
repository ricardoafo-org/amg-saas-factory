# Domain Reference: How a Spanish Auto-Repair Shop Actually Operates

**Date:** 2026-04-27
**Owner:** ricardoafo
**Type:** Domain knowledge (reference, not opinionated)
**Why this exists:** the rebuild plan keeps surfacing edge cases that come from real shop operations. Having one shared model of how a shop actually works prevents us from designing the wrong product. Feature decisions should be checked against this document first.

## The Customer Journey

A repair-shop interaction is NOT a transaction — it's a multi-day, multi-touchpoint relationship. The mistake most "booking platforms" make is treating it like a hair salon (one visit, one fixed service, paid on the spot). It isn't.

### Phase 1 — Intake (minutes to hours)
Customer reaches the shop via:
- **Online booking** (current chatbot — covers 5-15% of inbounds today, growing).
- **Phone call** ("¿está abierto? necesito una revisión").
- **Walk-in** ("se ha encendido el testigo del motor, ¿pueden mirarlo?").
- **WhatsApp** to the shop's number (informal, growing fast in Spain).

Outcome: an `appointment` record exists with a service type and a slot. Sometimes the service type is uncertain ("they want to look at it") and the duration is a guess.

### Phase 2 — Diagnosis (15 minutes to 2 hours)
Mechanic inspects the car. For catalog services (oil change, ITV, brake check) this phase is short or skipped — the work is well-defined.

For non-catalog issues, this is where the value of the shop is created. Mechanic identifies what's needed:
- "Necesita cambiar la junta de la culata" — head-gasket replacement
- "El engranaje del cambio está roto, hay que cambiar la palanca y el cable" — shifter assembly
- "Pastillas de freno desgastadas, pero los discos también — hay que cambiar las dos cosas"

Outcome: a list of issues, parts needed, labor estimate, total price. **This becomes a quote.**

### Phase 3 — Quote / estimate (~5-30 minutes after diagnosis)
Mechanic communicates the quote to the customer. Today this happens by:
- Verbal at the shop (customer is present)
- Phone call ("le he mirado el coche, son 480€ más IVA")
- WhatsApp message with photo of broken part + price

Customer decides: approve, decline, or ask for time. Spanish law (RD 1457/1986) requires written estimate above a threshold; below the threshold (most repairs) verbal is fine but a written record is best practice and dispute-resilient.

### Phase 4 — Parts ordering (1-14 days)
If parts aren't in stock, the shop orders them from a supplier. This is where customers experience the "when will my car be ready" anxiety.

Realities:
- **Lead time varies wildly:** common parts arrive same-day or next-day; rare parts (older cars, imported brands) take 1-2 weeks.
- **Multiple suppliers per shop:** AMG likely uses 3-5 suppliers (a generic distributor, a brand-specific one, sometimes a junkyard/used-parts vendor).
- **Confirmations are paper:** suppliers send order confirmations by email or WhatsApp; the shop has no system that tracks "what's coming, when, for whom".
- **Frequent customer questions:** "¿ya ha llegado la pieza?" — answered by mechanic flipping through paper notes or memory.

This is the BIGGEST operational pain point in a real shop.

### Phase 5 — Service execution (hours to days)
Once parts arrive, the mechanic schedules the actual work. Shop capacity is typically 2-4 cars in active repair simultaneously, depending on lift count and mechanic count. Cars sit in queue waiting for both:
- Mechanic availability (capacity)
- Parts availability (often the bottleneck)

The shop has to juggle which car gets which lift, which mechanic, in which order.

### Phase 6 — Status communication (continuous)
Customer wants to know:
- Has my quote been finalized?
- Are the parts here yet?
- Is my car being worked on now?
- When can I pick it up?

Today: customer calls or WhatsApps and asks. This is friction for both sides.

### Phase 7 — Pickup and payment (10-30 minutes)
Customer comes to shop. Receives the car, the keys, an invoice or receipt. **Pays in person — cash or card terminal** (POS reader, NOT integrated to the shop's system today).

The "payment record" is whatever the POS terminal printed plus an entry in the shop's accounting (which is usually a separate program — Contasol, A3 Asesor, or a paper book — not in the booking system).

### Phase 8 — Warranty period (3 months / 2,000 km minimum, per RD 1457/1986)
If the same issue recurs within the legal warranty window, the shop must repair free. Need to track:
- Which work was done
- When (start of warranty clock)
- What parts (some parts have manufacturer warranties separate from the shop's labor warranty)

## Service Types

Two fundamentally different categories:

### Catalog services
Fixed-price, fixed-duration, advertised on the website:
- Cambio de aceite
- ITV (pre-inspection)
- Revisión general
- Cambio de pastillas (sometimes)
- Cambio de neumáticos (sometimes)

These are "commodity" services. Customer knows what they want. Booking flow is simple. Pricing is per-service (or per-service tier — "small / medium / large" engine).

### Custom services (per-job)
Per-car, per-issue, defined after diagnosis:
- "Reparación caja de cambios — Renault Mégane 2018, presupuesto pendiente"
- "Reemplazo bomba de agua — VW Golf VII"
- "Trabajo eléctrico — diagnóstico encendido testigo"

These do NOT exist in the catalog. Each is a one-off entry. Pricing is calculated from:
- **Parts cost** (varies by car model, supplier, brand)
- **Labor time × hourly rate** (typical Spanish shop rate: €30-50/hour)
- **IVA** (21% standard rate)

The admin tool needs to **create services on-the-fly** during diagnosis, attach them to an appointment, and produce a quote.

## Parts and Suppliers

A car parts ecosystem is complex. The shop maintains:

- **Suppliers list** (3-10 per shop) — distributor name, contact, typical lead time, payment terms.
- **Parts catalog (informal)** — mechanic knows from experience which supplier carries which parts. Modern shops have software that maps OEM part numbers to supplier SKUs (e.g. PartsBase, Mecabase) — small shops don't.
- **Per-job parts list** — for THIS appointment, what was ordered, from whom, when, ETA.

For a digital solution to be useful, we need at minimum the per-job parts list with supplier and ETA. Full inventory (stock levels, low-stock alerts, reorder points) is a different beast and not justified at AMG's single-shop scale.

## Communication Patterns

A shop is a high-touch business. In a typical day:
- 20-40 phone calls (incoming + outgoing)
- 50-100 WhatsApp messages
- 5-15 walk-ins
- 5-10 emails

Most of this is currently fragmented across the mechanic's personal phone, the shop's landline, and the receptionist's memory. Centralizing this is a massive productivity win.

Key communications by type:
- **Customer → shop:** "is my car ready?" "how much will it cost?" "can you fit me in tomorrow?"
- **Shop → customer:** "your car is ready", "we found another issue, here's the new estimate", "your parts are here, we'll start tomorrow"
- **Shop → supplier:** "send me 4 brake pads for a Civic 2017 by Friday"
- **Supplier → shop:** "your order arrives tomorrow at 11am"

For v1 we're solving customer ↔ shop. Supplier ↔ shop is a future phase.

## Legal Framework (Spain)

| Law | Implication |
|---|---|
| RD 1457/1986 | Minimum warranty: 3 months / 2,000 km. Mandatory written estimate above ~150€ threshold (auto-shops). Customer must consent to additional work beyond original estimate. |
| LOPDGDD / GDPR | Customer data (name, phone, email, plate, car details) is personal data. Consent required, audit register, right of access/erasure. |
| Spanish IVA (VAT) law | All prices to consumer must be IVA-inclusive. Invoices break out NET + IVA. |
| Hacienda invoice format | Must include CIF, address, sequential number, date, breakdown. |

## Pain Points the Digital Solution Addresses

| Pain | Today | Digital fix |
|---|---|---|
| "Where's my customer's information?" | Paper agenda, mechanic's memory | Customer 360 view |
| "What's pending today?" | Whiteboard | Today dashboard |
| "Did we order that part?" | Mechanic flips through receipts | Per-appointment parts list |
| "Customer is calling — what's their car about?" | Memory or no answer | Click customer name → full history |
| "Has the customer approved the new estimate?" | Phone tag or memory | Quote status tracker (sent, viewed, approved) |
| "When can I tell the customer to pick up?" | Guess based on parts ETA | Status workflow with computed ETA |
| "What does this customer owe me?" | Paper receipts | Invoice history (read-only — payments still in person) |
| "When was their last service?" | Paper records | Customer service history |
| "Do we have warranty coverage on this part?" | Memory + paper | Warranty tracker per appointment |

## Pain Points the Digital Solution Does NOT Address (v1)

- Inventory management (stock levels, low-stock alerts) — single shop, mechanic knows their inventory.
- Online payments — customer pays in shop. We don't process card transactions.
- Accounting / Hacienda submission — handled by the shop's accountant in their own software (Contasol, A3, etc.). We may export CSVs to feed it.
- Supplier ordering automation — mechanic still calls/emails the supplier. We track WHAT was ordered, but not the order placement itself.
- Multi-shop scaling — single tenant for now.

## What This Means for the Product

The booking flow is the **front door**, not the **whole product**. The whole product is:

1. **Booking + scheduling** (today's website + chatbot + admin calendar).
2. **Diagnosis + quote management** (admin creates custom services, sends quote to customer for approval).
3. **Parts tracking** (admin records what's been ordered + ETA).
4. **Status communication** (customer sees real-time status; gets notified at each step).
5. **Service history + warranty tracking** (per-customer, per-vehicle).
6. **Manual booking + walk-in support** (admin can create appointments without customer using the website).
7. **Notifications** (WhatsApp + email — already decided).

Payments are **outside** the system (in-shop, cash or card terminal). Inventory is **outside** the system. Multi-shop is **outside** the system (for now).

This document is the reference — when we make scope decisions, we check them against this map.
