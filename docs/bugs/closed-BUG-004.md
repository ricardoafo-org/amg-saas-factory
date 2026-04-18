---
id: BUG-004
title: iva_rate falls back to hardcoded 0.21 if PocketBase config fetch fails
severity: medium
status: open
filed: 2026-04-18
filed-by: qa-agent
branch: ecosystem/qa-agents-living-docs
---

## Summary

In `src/actions/chatbot.ts` (line 38), the `iva_rate` is fetched from the PocketBase `config` collection per tenant. However, if the fetch fails (network error, missing config record, etc.), the code silently falls back to `0.21` via `.catch(() => null)` and a ternary default. This violates the project rule that IVA rate must never be hardcoded and must always come from the `config` collection. A misconfigured or inaccessible PocketBase will cause appointments to be stored with an incorrect, silent fallback rate with no error surfaced to the operator.

## Steps to Reproduce

1. In a test environment, remove the `iva_rate` config record for a tenant (or temporarily make PocketBase unavailable after auth).
2. Submit a chatbot booking.
3. Observe: appointment is created with `iva_rate: 0.21` — no error, no warning, no log.

## Expected Behaviour

If the `iva_rate` config cannot be fetched, the server action should throw an error (preventing the appointment from being created with a wrong rate) or at minimum log a structured warning to allow operator detection. It should NOT silently use a hardcoded fallback.

## Actual Behaviour

`src/actions/chatbot.ts`, lines 35-38:
```ts
const ivaConfig = await pb.collection('config').getFirstListItem(
  `tenant_id = "${payload.tenantId}" && key = "iva_rate"`,
).catch(() => null);
const ivaRate = ivaConfig ? parseFloat(ivaConfig['value']) : 0.21;
```
A PocketBase failure silently produces `ivaRate = 0.21` with no observable side effect.

## Root Cause Analysis

_Filled by implementer after investigation._

## Fix

_Filled by implementer after fix._

Branch: `fix/bug-004`
Files changed: `src/actions/chatbot.ts`

## Verification

_Filled by QA agent after re-testing._

- [ ] Unit tests pass
- [ ] E2E test covers this scenario
- [ ] Manual validation passed
