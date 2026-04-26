---
id: BUG-015
title: Filter injection in saveAppointment — payload.serviceIds interpolated raw into PocketBase filter
severity: critical
status: fixed
fixed: 2026-04-25
filed: 2026-04-25
filed-by: security-auditor (surfaced on PR #29)
branch: fix/BUG-015
merged-pr: 31
---

## Summary

`src/actions/chatbot.ts:67` builds the PocketBase filter for fetching service prices by interpolating `payload.serviceIds` directly into the filter string with `.map(id => \`id = "${id}"\`).join(' || ')`. Although the field is typed `string[]`, server actions cannot trust the runtime payload — a malicious caller can submit a service ID like `x" || tenant_id != "" && name = "anything` and break out of the per-tenant scope, exfiltrating other tenants' service rows or causing the filter to drop the `tenant_id` guard entirely.

This was **not introduced** by PR #29 (BUG-009 + BUG-013); the security-auditor flagged it as a pre-existing risk in the surrounding code while reviewing the IVA fix. Filing it here so it is tracked rather than absorbed into PR #29's scope.

## Severity

**SEV-1** — Security axis row **S4** (filter injection — user-controlled input interpolated raw into a PocketBase filter).
Tenant-isolation defence depends on the `tenant_id = "..."` clause being unbreakable; raw interpolation breaks that promise.

## Steps to Reproduce

1. Hit `saveAppointment` (or whichever entrypoint calls into `src/actions/chatbot.ts`) with a payload where one entry of `serviceIds` contains a `"` character followed by a PocketBase operator (e.g. `x" || tenant_id != "`).
2. Observe the constructed filter string in `chatbot.ts:67`.
3. The injected fragment short-circuits the `tenant_id` scope; the subsequent `.getList(1, 20, { filter })` returns rows from other tenants (or none, depending on the payload).

## Expected Behaviour

`payload.serviceIds` is parameterised — either via PocketBase's parameter binding (`pb.collection('services').getList(1, 20, { filter: '... && (id = {:id0} || id = {:id1})', params: { id0, id1 } })`) or by validating IDs against a strict allow-list (e.g. regex `^[a-z0-9-]+$`) before interpolation.

## Actual Behaviour

```ts
// src/actions/chatbot.ts:67
const filter = `tenant_id = "${payload.tenantId}" && (${payload.serviceIds.map((id) => `id = "${id}"`).join(' || ')})`;
```

`payload.tenantId` is also interpolated raw (low risk if it is set server-side from a trusted session, but worth verifying — see Open Questions). `payload.serviceIds` is the immediate vector.

## Suspect Files

- `src/actions/chatbot.ts:67` — primary site
- Audit the rest of the file for the same pattern; `chatbot.ts:54` and `chatbot.ts:59` interpolate `payload.tenantId` into other filters.

## Suggested Fix

Use PocketBase's parameterised filter form. Sketch:

```ts
const placeholders = payload.serviceIds.map((_, i) => `id = {:id${i}}`).join(' || ');
const params = Object.fromEntries(
  payload.serviceIds.map((id, i) => [`id${i}`, id]),
);
const filter = `tenant_id = {:tenantId} && (${placeholders})`;
const serviceRecords = await pb.collection('services').getList(1, 20, {
  filter,
  filter_params: { tenantId: payload.tenantId, ...params },
});
```

If parameterised filters are not supported in the current PocketBase JS SDK version, second choice: validate IDs against `/^[a-z0-9-]{1,64}$/` at the action boundary and reject the payload otherwise. Document the validator in `docs/contracts/tenant-isolation.md` once it is written.

## Tests Required

- Unit: feed a `serviceIds` entry containing `"` + ` || ` and assert the action either rejects the payload or produces a filter where the injected fragment is escaped/parameterised, **not** raw-substituted.
- Integration (PocketBase): confirm a crafted serviceId cannot return rows from another `tenant_id`.
- Annotation: `// SEV-1: S4 (PocketBase filter injection)` above each test block.

## Open Questions

- Is `payload.tenantId` populated server-side from the authenticated session, or is it sent by the client? If client-sent, this is a second SEV-1 (S2 tenant-isolation IDOR) on the same line. The implementer must verify before opening the PR.

## References

- Severity rubric: `docs/contracts/severity-rubric.md` row S4
- Tenant isolation contract: `.claude/rules/server-actions.md` ("Every PocketBase query MUST include `tenant_id` in filter — never query without it")
- Surfaced by: `security-auditor` on PR #29 review (BUG-009 + BUG-013)
