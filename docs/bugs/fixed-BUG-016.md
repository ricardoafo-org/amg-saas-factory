---
id: BUG-016
title: Raw filter interpolation across remaining server actions (SEV-1 audit follow-up to BUG-015)
severity: critical
status: fixed
fixed: 2026-04-25
filed: 2026-04-25
filed-by: orchestrator (follow-up to BUG-015 / PR #31)
branch: fix/BUG-016-filter-injection-audit
merged-pr: 33
---

## Summary

BUG-015 fixed the filter-injection vector in `src/actions/chatbot.ts` (6 sites) by switching to PocketBase's `pb.filter('… {:k} …', { k })` parameterised form. A wider audit with `rg 'tenant_id = "\$\{'` against `src/` surfaces **29 additional sites across 11 files** that still interpolate values raw into filter strings — every one of them shares root cause and remediation with BUG-015.

This is filed as a single bug (not 29) because the dispatch is mechanical: same regex-detectable transform, no new logic, no new control flow, no schema change. Per ADR-013 "Mechanical Patch Definition" all 5 conditions hold → 0 reviewer subagents required.

## Severity

**SEV-1** — Security axis row **S4** (filter injection — user-controlled input interpolated raw into a PocketBase filter).

Several of the 29 sites flow user input directly into the filter:

- `src/actions/sms.ts:303` — admin search input (`name`, `phone`) substituted into a `~` (regex) operator.
- `src/actions/admin/customers.ts:136, 140, 207` — `id` parameter from URL/route.
- `src/actions/admin/vehicles.ts:138, 199` — same.
- `src/actions/admin/quotes.ts:189` — same.
- `src/lib/chatbot/engine.ts:44` — `configKeys` from chatbot flow JSON (controlled but still parameterise).

The remaining sites interpolate values that are nominally server-side (`tenantId` from `getTenantContext()`, dates, IDs constructed from server lookups). Defence-in-depth: parameterise everything regardless of provenance, because BUG-015 demonstrated that "trusted" inputs become untrusted the moment the assumption breaks.

## Steps to Reproduce

For the user-input sites (e.g. `sms.ts:303`):

1. As an admin user, search the SMS recipient list with a `name` or `phone` value containing `"` followed by a PocketBase operator (e.g. `x" || tenant_id != "`).
2. The injected fragment short-circuits the per-tenant scope and exfiltrates rows belonging to other tenants.

For the route-param sites (e.g. `admin/customers.ts:136`):

1. Craft an `id` URL parameter containing `"` + ` || ` to break out of the `customer_id = "..."` clause.
2. The query returns rows that should be inaccessible.

## Expected Behaviour

Every PocketBase filter is constructed via `pb.filter('… {:placeholder} …', { placeholder })`. No raw `${value}` interpolation in any filter expression.

## Actual Behaviour

29 raw-interpolation sites identified (full list in commit body). Pattern:

```ts
filter: `tenant_id = "${tenantId}" && some_field = "${userInput}"`,
```

## Suspect Files

| File | Sites |
|---|---|
| `src/actions/sms.ts` | 4 (L127, L192, L256, L303) |
| `src/actions/slots.ts` | 2 (L28, L54) |
| `src/actions/settings.ts` | 2 (L156, L194) |
| `src/lib/chatbot/engine.ts` | 1 (L44) |
| `src/actions/admin/appointments.ts` | 3 (L86, L99, L169) |
| `src/actions/admin/kpis.ts` | 3 (L28, L49, L54) |
| `src/actions/admin/customers.ts` | 6 (L39, L64, L123, L136, L140, L207) |
| `src/actions/admin/vehicles.ts` | 4 (L39, L64, L138, L199) |
| `src/actions/admin/quotes.ts` | 2 (L54, L189) |
| `src/app/(admin)/admin/(app)/settings/page.tsx` | 1 (L63) |
| `src/app/(admin)/admin/(app)/reports/page.tsx` | 1 (L20) |

## Suggested Fix

Identical to BUG-015. For each site:

```ts
// before
filter: `tenant_id = "${tenantId}" && customer_id = "${id}"`,

// after
filter: pb.filter('tenant_id = {:tenantId} && customer_id = {:id}', { tenantId, id }),
```

For dynamic `||` lists (services, configKeys), use indexed placeholders `{:k0}, {:k1}, …` as already established in `chatbot.ts` after BUG-015.

## Tests Required

- Unit: SEV-1 annotated tests for the user-input sites (`sms.ts:303`, `admin/customers.ts:136/140/207`, `admin/vehicles.ts:138/199`, `admin/quotes.ts:189`) feeding a payload containing `"` + ` || ` and asserting `pb.filter` is invoked with placeholders, never with the raw concatenation.
- Existing test suite must remain green (test contract preserved per Mechanical Patch Definition).

## References

- Severity rubric: `docs/contracts/severity-rubric.md` row S4
- Mechanical Patch Definition: `docs/adr/ADR-013-personal-framework-off-repo.md`
- Predecessor: BUG-015 (PR #31, merged)
