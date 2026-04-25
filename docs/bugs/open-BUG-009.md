---
id: BUG-009
title: Double IVA charge — services display "IVA included" then booking adds IVA again
severity: critical
status: open
filed: 2026-04-25
filed-by: manual
branch: fix/BUG-009-double-iva
---

## Summary

Service grid prices are displayed as "IVA included" (precio final consumidor — RD 1457/1986 + LGCU). Then the booking flow recalculates a total by ADDING 21% IVA on top of that already-gross price, so the customer sees a higher total at the booking confirmation than what was advertised.

This is both a UX defect AND a Spanish consumer-protection violation: prices shown to consumers must be final (gross). Adding IVA again at booking time is effectively a price bait — actionable under LGCU Art. 60 and AEPD/Consumo guidance.

User impact: customer is quoted X €, presented with X × 1.21 € at booking, abandons or pays more than advertised.

## Steps to Reproduce

1. Open homepage → Services section
2. Note any service price (e.g. Cambio de Aceite — "Desde 49€ IVA incluido")
3. Click "Reservar" on that service
4. Complete chatbot flow up to confirmation step
5. Observe total at booking summary

## Expected Behaviour

Total at booking summary === advertised price (or itemised: subtotal + IVA breakdown that SUMS to the advertised gross price).

## Actual Behaviour

Booking total = advertised price × 1.21. IVA is computed twice.

## Files affected (suspected)

Likely culprits — confirm during RCA:
- `src/core/components/ServiceGrid.tsx` — where service prices are sourced
- `src/actions/chatbot.ts` — `saveAppointment` total calculation
- `clients/talleres-amg/chatbot_flow.json` — `compute_total` action if present
- PocketBase `services` / `config` collection — whether `price` column stores net or gross

Root cause hypothesis: services collection stores gross prices but booking action treats them as net.

## Root Cause Analysis

_Filled by implementer after investigation._

## Fix

_Filled by implementer after fix._

## Verification

- [ ] Service grid price === booking confirmation total for every service
- [ ] Unit test: total calculation never multiplies by 1.21 if source price is already gross
- [ ] Contract test: schema invariant — `services.price_is_gross` flag must match how `compute_total` reads it
- [ ] Manual: book each of the 6 services, total must equal display
- [ ] compliance-reviewer clean (no IVA-related grep hits flagged)
