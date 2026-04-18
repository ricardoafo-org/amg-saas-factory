---
id: ADR-008
title: Customer and vehicle data model — normalized profiles
status: accepted
date: 2026-04-18
---

## Context

Currently, customer data (name, email, phone) is embedded directly in the `appointments` collection. This means a returning customer creates duplicate records. The owner dashboard (Sprint 6) needs a unified customer view showing all vehicles, complete service history, and lifetime spend. A normalized `customers` + `vehicles` model is required.

## Decision

Create a `customers` collection (non-auth, regular collection) and a `vehicles` collection. `appointments` gains optional `customer_id` and `vehicle_id` relation fields (nullable for backwards compatibility). Deduplication is application-level: `saveAppointment()` upserts customer by email before creating the appointment.

## Customer fields

```
customers: {
  tenant_id: text (required)
  name: text (required)
  email: email (required, unique per tenant)
  phone: text
  notes: text
  first_seen: date (auto-set on create)
  last_seen: date (updated on each appointment)
  total_visits: number (computed/cached)
  total_spent: number (computed/cached — base amounts only, excl IVA)
  preferred_contact: select [sms, email, whatsapp] (default: sms)
  marketing_consent: bool (default: false — from LOPDGDD consent flow)
}
```

## Vehicle fields

```
vehicles: {
  tenant_id: text (required)
  customer_id: relation → customers (optional — vehicle may be anonymous)
  plate: text (required, unique per tenant)
  brand: text
  model: text
  year: number
  fuel_type: select [gasolina, diesel, electrico, hibrido]
  engine_cc: number
  last_km: number
  itv_expiry: date
  notes: text
}
```

## Upsert strategy

In `saveAppointment()`:
1. Try `pb.collection('customers').getFirstListItem('email="{email}" && tenant_id="{tid}"')`
2. If found: update `last_seen`, increment `total_visits`, sum `total_spent`
3. If not found: create new customer record
4. Set `customer_id` on appointment
5. Try `pb.collection('vehicles').getFirstListItem('plate="{plate}" && tenant_id="{tid}"')` — if found, set `vehicle_id`

## LOPDGDD implications

- `customers` collection contains PII — access restricted to authenticated staff
- LOPDGDD right-to-erasure: `deleteCustomer()` action that nullifies appointment `customer_id` and deletes customer + vehicle records
- Marketing consent stored on customer record (from LOPD checkbox in chatbot)

## Alternatives Considered

| Option | Rejected because |
|---|---|
| Keep customer data embedded in appointments | No deduplication; impossible to build customer 360 view |
| Customer auth collection | Customers don't need to log in; over-complicates the model |
| External CRM (HubSpot) | Data leaves stack; GDPR complexity; cost; overkill for taller |
| Deduplicate on read (query all appointments by email) | Slow; complex; won't scale past 1000 appointments |

## Consequences

- Positive: Customer 360 view possible (all vehicles, history, spend)
- Positive: Enables SMS targeting (reminder to returning customer for ITV expiry)
- Positive: Vehicle plate lookup covers recurring fleet customers
- Negative: `saveAppointment()` becomes more complex (upsert before insert)
- Negative: Old appointments without `customer_id` need backfill script
- Neutral: `vehicles.itv_expiry` enables "ITV reminder campaign" from comms center

## Review trigger

When adding customer-facing portal (login to see own history), or if customer email uniqueness constraint causes issues with family/fleet accounts.
