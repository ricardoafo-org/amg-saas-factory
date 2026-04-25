---
id: BUG-013
title: "€0 prices on 3 services — config IDs don't match ServiceGrid/chatbot flow"
severity: sev-1
severity-rubric-citation: Functional axis F1 — IVA breakdown wrong; F6 — config-stored value overridden/missing
status: wip
filed: 2026-04-25
filed-by: manual
branch: fix/BUG-009-and-013-iva-and-catalog
---

## Summary

Three services displayed in the ServiceGrid (`neumaticos`, `aire-acondicionado`, `diagnostico-obd`) had no corresponding entry in `clients/talleres-amg/config.json`. The config used legacy IDs (`cambio-neumaticos`, `diagnostico-electronico`, `escaner-obd`). When ServiceGrid looked up `basePrice` by ID it found nothing, so those cards showed €0 (or showed the price only because it was previously hardcoded — making BUG-009 worse).

## Root Cause Analysis

The design bundle (FEAT-033) introduced new customer-facing service IDs aligned with the chatbot flow, but `config.json` was never updated to match. The catalog had 7 entries with legacy IDs; the UI layer used 6 entries with different IDs. Three IDs were orphaned.

## Fix

**Fixed as part of BUG-009 — see `wip-BUG-009.md`.**

Branch: `fix/BUG-009-and-013-iva-and-catalog`

`clients/talleres-amg/config.json` `services[]` array replaced with exactly the 6 customer-facing IDs:
`cambio-aceite`, `frenos`, `pre-itv`, `neumaticos`, `aire-acondicionado`, `diagnostico-obd`.
All `basePrice` values are NET; gross display = `basePrice * (1 + ivaRate)` computed at render.

## Verification

- [ ] Unit tests pass (`service-grid-iva.test.ts` assertion (a) — every BUNDLE_SERVICES.id in config)
- [ ] E2E: all 6 service cards show non-zero price
- [ ] Manual: book each service — chatbot confirmation price matches grid price exactly
