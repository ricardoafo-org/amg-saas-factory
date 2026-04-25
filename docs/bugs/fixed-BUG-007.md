---
id: BUG-007
title: ServiceGrid CTAs for 4 services are silent — IDs don't match chatbot flow
severity: high
status: fixed
filed: 2026-04-25
filed-by: manual
branch: fix/BUG-service-mismatch
---

## Summary

Clicking the "Pedir" CTA on 4 of the 6 service cards in `ServiceGrid.tsx` opens the chat widget but the chat shows nothing — no welcome, no service preselected, no flow advance. The user perceives a dead button. Affected services: Revisión de frenos, Neumáticos y equilibrado, Aire acondicionado, Diagnóstico OBD. Cambio de aceite and Pre-revisión ITV work.

## Steps to Reproduce

1. Open the home page in a browser
2. Scroll to the Services section
3. Click "Pedir" on **Revisión de frenos**
4. Observe: chat widget opens but stays on the cold welcome screen, no service preselected

## Expected Behaviour

Chat opens, jumps to the booking flow with the clicked service preselected, shows the bot greeting "¡Perfecto! Vamos con [service name]. Empezamos por tu coche."

## Actual Behaviour

Chat opens but `ChatEngine.tsx` line 384 silently `return`s because `matchedOption` is `undefined`. The chat widget renders the empty welcome instead of the booking flow.

## Root Cause Analysis

Two sources of truth drifted apart:

- `src/core/components/ServiceGrid.tsx:71-120` hard-codes 6 services with IDs: `cambio-aceite`, `frenos`, `pre-itv`, `neumaticos`, `aire-acondicionado`, `diagnostico-obd`.
- `clients/talleres-amg/chatbot_flow.json` `ask_service` options have IDs: `cambio-aceite`, `pre-itv`, `mecanica-general`, `diagnostico-electronico`, `escaner-obd`, `otro`.

Only `cambio-aceite` and `pre-itv` overlap. `ChatEngine.tsx` looks up `flow.nodes.ask_service.options` by `value === initialService` and bails when it can't find a match, with no error surfaced.

The reason this slipped through: no contract test asserts `ServiceGrid IDs ⊆ flow.options[].value`, and no E2E test clicks each service card. FEAT-029 only covered the welcome-menu booking path, never the per-card pre-select path for all 6 services.

## Fix

Align IDs at the source. Since the bundle (Website.html) is the design source of truth and FEAT-033 just shipped these 6 service cards, the flow JSON expands to match — not the other way around.

1. `clients/talleres-amg/chatbot_flow.json` — update `ask_service` options to:
   - `cambio-aceite` (keep)
   - `frenos` (was `mecanica-general`)
   - `pre-itv` (keep)
   - `neumaticos` (new)
   - `aire-acondicionado` (was `diagnostico-electronico`)
   - `diagnostico-obd` (was `escaner-obd`)
   - keep `otro` as catch-all
2. `clients/talleres-amg/chatbot_flow.json` — update the deep-link node `oil_offer_book` (line 103) to keep `cambio-aceite` (no change needed there).
3. `src/core/components/__tests__/service-flow-contract.test.ts` — NEW contract test:
   - Loads `clients/talleres-amg/chatbot_flow.json`
   - Imports `BUNDLE_SERVICES` from `ServiceGrid.tsx` (export it)
   - Asserts every BUNDLE_SERVICES id appears in `ask_service.options[].value`
4. `npm run flows:validate` must still pass.

Ensure the matching `services` collection records exist for all 6 IDs in tst tenant — handled separately in PocketBase data, out of this PR's scope (will flag).

Branch: `fix/BUG-service-mismatch`
Files changed:
- `clients/talleres-amg/chatbot_flow.json` — replaced 3 stale option values (`mecanica-general`, `diagnostico-electronico`, `escaner-obd`) with the 4 correct IDs (`frenos`, `neumaticos`, `aire-acondicionado`, `diagnostico-obd`); added `otro` as catch-all (7 options total)
- `src/core/components/ServiceGrid.tsx` — changed `const BUNDLE_SERVICES` to `export const BUNDLE_SERVICES` so the contract test can import it
- `src/core/components/__tests__/service-flow-contract.test.ts` — NEW: asserts every BUNDLE_SERVICES id is present in ask_service options; prevents future drift

## Verification

- [x] Unit tests pass (186 tests, 0 failures)
- [x] Contract test added catching this regression class
- [x] `npm run flows:validate` passes
- [x] `npm run type-check` passes (zero errors)
- [ ] Manual validation: each of the 6 service cards opens chat with that service preselected
- [ ] E2E test covers all 6 cards (deferred to FEAT-032 retrofit)
