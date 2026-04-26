---
id: BUG-009
title: Double IVA charge — services display "IVA included" then booking adds IVA again
severity: sev-1
severity-rubric-citation: Functional axis F1 — IVA breakdown wrong (hardcoded gross-vs-net mismatch); compounded by Functional axis F6 — config-stored ivaRate overridden by hardcoded UI prices
status: fixed
fixed: 2026-04-25
filed: 2026-04-25
filed-by: manual
triaged: 2026-04-25
triaged-by: bug-triager
branch: fix/BUG-009-and-013-iva-and-catalog
merged-pr: 29
---

## Triage Summary

**Severity:** SEV-1 — Spanish consumer-protection violation (LGCU Art. 60: prices shown to consumers must be final/gross). The advertised price differs from the booking total, which is bait-and-switch. Also breaches RD 1457/1986 Art. 16 (IVA breakdown discipline) and the project invariant "no hardcoded prices/IVA in components".
**Rubric citation:** Functional axis F1 (IVA breakdown wrong / hardcoded multiplier path) + F6 (config value overridden by hardcoded constant in component).

## Root-Cause Hypothesis

There are TWO inconsistent sources of truth for service prices, and neither matches the "IVA incl." label rendered to the user:

1. `src/core/components/ServiceGrid.tsx:71-120` hardcodes a static `BUNDLE_SERVICES` array (e.g. `price: '49,99 €'`) and renders `<span className="svc-price-iva">IVA incl.</span>` at line 183. The price strings are not derived from `config.json` or the `services` PocketBase collection — they are display literals.
2. `src/actions/chatbot.ts:64-76` reads `base_price` from the PocketBase `services` collection (which per `src/core/types/adapter.ts:14` — `basePrice: number; // before IVA — never store total` — is stored NET) and computes `totalAmount = baseAmount * (1 + ivaRate)` (line 76), correctly grossing-up the net price.

Result: the customer sees a hardcoded "49,99 € IVA incl." in the grid (which actually equals or is close to the NET base_price in `clients/talleres-amg/config.json:35` — `"basePrice": 39.99` for cambio-aceite, 49.99 for pre-itv, etc.), then the booking confirmation shows `price * 1.21`, so the customer is charged ~21% more than advertised.

Secondary defect: `ServiceGrid.tsx` ignores its `ivaRate` and `services` props (line 130 — `_props`), violating the F6 invariant that `config` collection values must drive component output.

## Affected Files (with line numbers)

| File | Lines | Why affected |
|------|-------|--------------|
| `src/core/components/ServiceGrid.tsx` | 71-120 | Hardcoded `BUNDLE_SERVICES` price strings; ignores `services` and `ivaRate` props |
| `src/core/components/ServiceGrid.tsx` | 130 | Component discards props (`_props`) — config is not consumed |
| `src/core/components/ServiceGrid.tsx` | 182-184 | Renders "IVA incl." label next to net-looking price literal |
| `src/actions/chatbot.ts` | 64-76 | `baseAmount` summed from `base_price`, then multiplied by `(1 + ivaRate)` — correct math, but predicated on the UI showing the NET price as net |
| `clients/talleres-amg/config.json` | 30-87, 102 | `basePrice` is NET; `ivaRate: 0.21` — confirms the contract that DB/config stores net |
| `src/core/types/adapter.ts` | 14 | Documents the contract: `basePrice` is "before IVA — never store total" |
| `src/types/pb.ts` | 52, 125 | `iva_rate` columns on appointments/quotes — destination of the (currently double-applied) computation |

## Suspect Commits

| Hash | Author | Date | Message | Why suspicious |
|------|--------|------|---------|----------------|
| `da4fd99` | — | recent | feat(design): full Claude Design v2 bundle alignment (FEAT-033) | Likely introduced the static `BUNDLE_SERVICES` array in ServiceGrid.tsx to match the design bundle, decoupling from the `services` prop without updating the gross/net contract. |
| `93a0e14` | — | earlier | feat(chatbot): customer post-booking registration (FEAT-031) | Touched `saveAppointment` total calc; the `baseAmount * (1 + ivaRate)` path lives in this surface area. Worth `git show` to confirm whether the `* (1 + ivaRate)` line was already present or added here. |

(Run `git show da4fd99 -- src/core/components/ServiceGrid.tsx` and `git show 93a0e14 -- src/actions/chatbot.ts` to confirm.)

## Suggested Fix Approach

1. Decide canonical contract: the project rule is `basePrice` is NET in DB/config, and gross is computed at render/booking time. Keep that contract.
2. In `ServiceGrid.tsx`: delete the hardcoded `BUNDLE_SERVICES` price literals. Consume the `services` and `ivaRate` props (or the `config.json` source) and compute the displayed price as `basePrice * (1 + ivaRate)`, formatted with `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })`. Keep the icons/duration/desc as design-bundle constants if needed, but JOIN them with config service IDs.
3. In `src/actions/chatbot.ts`: keep the `baseAmount * (1 + ivaRate)` logic — it is correct given the NET contract. Do NOT remove the multiplication.
4. Add a contract test: `services[].basePrice` is always net; `total_amount === sum(basePrice) * (1 + iva_rate)`; and the price string rendered in `ServiceGrid` for service `X` equals `formatCurrency(X.basePrice * ivaRate_plus_1)`.
5. Manual verification: book each of the 6 services in the chatbot — total at confirmation MUST equal the price shown in the grid (to the cent, with IVA-rounding rule).
6. Compliance-reviewer pass: confirm no remaining hardcoded `1.21`, `0.21`, or price literals in `src/**/*.tsx`.

## Open Questions for Implementer

- Confirm whether `BUNDLE_SERVICES` ids in `ServiceGrid.tsx` (`cambio-aceite`, `frenos`, `pre-itv`, `neumaticos`, `aire-acondicionado`, `diagnostico-obd`) match the ids in `clients/talleres-amg/config.json` services (`cambio-aceite`, `pre-itv`, `mecanica-general`, `cambio-neumaticos`, `frenos`, `diagnostico-electronico`, `escaner-obd`). They do NOT — the design bundle invented different ids. This was the subject of BUG-007 (`89020c6 fix(chatbot): align ServiceGrid IDs with flow options`). Verify alignment is still intact after the fix.
- Should the grid show price as "X,XX € (IVA incl.)" with a tooltip that breaks down `subtotal + IVA = total`, per RD 1457/1986 Art. 16? Recommend yes for the booking confirmation; optional for the grid.

## Fix Summary

**Branch:** `fix/BUG-009-and-013-iva-and-catalog`
**Also fixes:** BUG-013 (€0 prices — config ID mismatch, see `wip-BUG-013.md`)

**Changes made:**

1. `clients/talleres-amg/config.json` — replaced legacy 7-service list with the 6 customer-facing IDs (`cambio-aceite`, `frenos`, `pre-itv`, `neumaticos`, `aire-acondicionado`, `diagnostico-obd`). All `basePrice` values are NET; gross = `basePrice * 1.21` matches the formerly hardcoded display strings exactly.

2. `src/core/components/ServiceGrid.tsx` — removed hardcoded `price` literals from `BUNDLE_SERVICES`. Component now accepts `services` + `ivaRate` props (previously discarded via `_props`). Display price computed as `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(basePrice * (1 + ivaRate))`. `_props` discard at old line 130 removed.

3. `src/core/components/__tests__/service-grid-iva.test.ts` — new contract test asserting: (a) every BUNDLE_SERVICES.id has a matching config entry; (b) rendered price equals gross (not net); (c) chatbot total equals sum of grid display prices.

`chatbot.ts:76` (`* (1 + ivaRate)`) was NOT modified — it is correct.

## Rubric Check

- [x] Security axis reviewed: yes — S1/S2/S3 do not apply (no PII leak, no cross-tenant leak, no consent ordering issue introduced by this bug). The PocketBase `services` query on `chatbot.ts:67` DOES include `tenant_id` filter — clean.
- [x] Functional axis reviewed: yes — F1 (IVA breakdown / hardcoded path) and F6 (config overridden by hardcoded constant) both apply. F1 is the dominant rubric row. SEV-1 because the legal exposure is consumer-protection (LGCU Art. 60 bait-pricing) which the project treats as critical-tier.
- [x] Tenant-query involvement: yes — `chatbot.ts:67-68` queries `services` with tenant filter. Filter looks safe (literal interpolation of internal `serviceIds`, not free user input), but `security-auditor` should confirm there is no path where a user-supplied id reaches that filter unsanitized when fixing this bug.
- [x] Personal data involvement: no — IVA math touches no PII directly. Email send path is unaffected by the fix.
