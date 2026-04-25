---
id: BUG-013
title: Three services render €0 in chat (catalog mismatch)
severity: high
status: open
filed: 2026-04-25
filed-by: manual
branch: fix/BUG-013-catalog-mismatch
---

## Summary

Selecting **Neumáticos y equilibrado**, **Aire acondicionado**, or **Diagnóstico OBD** in the chatbot shows the price as **0 €**. Root cause is the same shape as BUG-007 but on a different axis: these three services are referenced by `chatbot_flow.json` and `ServiceGrid.tsx`, but **do not exist** in `clients/talleres-amg/config.json` at all. The price lookup returns `undefined` and the formatter renders 0 €.

BUG-007 only realigned IDs that existed in both places. It did not catch services missing from the canonical catalog. This is a category-level gap, not a typo.

## Steps to Reproduce

1. Open the chatbot from any homepage CTA
2. Pick "Neumáticos y equilibrado", "Aire acondicionado", or "Diagnóstico OBD"
3. Observe price shown as `0 €` in chat bubble and (when the redesign lands) in CartPanel

## Expected

Real prices and durations from the tenant catalog. For tyres the catalog has `cambio-neumaticos` (15 €, 30 min) — that's the one to align to. For OBD the catalog has `escaner-obd` (25 €) and `diagnostico-electronico` (45 €). For air-conditioning **there is no entry in the catalog**.

## Actual

`config.json` services array vs UI references:

| UI references (Footer + ServiceGrid + chatbot_flow) | `config.json` catalog | Match |
|---|---|---|
| `neumaticos` / "Neumáticos y equilibrado" | `cambio-neumaticos` / "Cambio de Neumáticos" | ID + label mismatch |
| `aire-acondicionado` / "Aire acondicionado" | *(absent)* | Not in catalog at all |
| `diagnostico-obd` / "Diagnóstico OBD" | `escaner-obd` and `diagnostico-electronico` | ID mismatch + ambiguous mapping |

## Files affected

- `clients/talleres-amg/config.json` — add `aire-acondicionado` entry; align IDs / labels for tyres and OBD
- `clients/talleres-amg/chatbot_flow.json` (lines 23–25) — `value` fields must match catalog IDs
- `src/core/components/ServiceGrid.tsx` (lines 97, 105, 113) — `id` fields must match catalog IDs
- `src/core/components/Footer.tsx` (lines 25–27) — labels OK, but anchors (`#servicios`) collide with BUG-011

## Root cause

There is no contract test asserting `chatbot_flow.value ⊆ config.services[].id` or `ServiceGrid.id ⊆ config.services[].id`. BUG-007's fix patched specific IDs; the structural gap remains.

## Fix (proposed)

1. Add `aire-acondicionado` (description, basePrice, duration, category) to `config.json`
2. Decide canonical IDs (recommend: `neumaticos`, `aire-acondicionado`, `diagnostico-obd`) and rename in `config.json` so the catalog is the source of truth
3. Update `chatbot_flow.json` and `ServiceGrid.tsx` to reference those IDs
4. **Add a Vitest contract test** in `src/__tests__/contracts/services.test.ts` that fails CI if any UI reference points to a non-existent catalog ID. This permanently closes the BUG-007 + BUG-013 class.

## Verification

- [ ] All three services show non-zero prices in chat
- [ ] CartPanel (when BookingApp lands) renders correct IVA breakdown for all three
- [ ] New contract test fails when an unknown ID is added to ServiceGrid or chatbot_flow
- [ ] BUG-007 regression test still passes
- [ ] No hard-coded prices in components — all from `config.json`
