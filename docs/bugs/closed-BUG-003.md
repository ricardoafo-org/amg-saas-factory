---
id: BUG-003
title: bookSlot() updates availability_slots without tenant_id guard — cross-tenant slot manipulation possible
severity: high
status: open
filed: 2026-04-18
filed-by: qa-agent
branch: ecosystem/qa-agents-living-docs
---

## Summary

The `bookSlot()` server action in `src/actions/slots.ts` (lines 44-49) fetches a slot by `slotId` and increments its `booked` count without verifying that the slot belongs to the calling tenant. Any client that knows or guesses a valid `slotId` from another tenant can decrement that tenant's availability, causing overbooking or denial-of-service on their calendar. The architecture rule in `.claude/rules/server-actions.md` states: "Every PocketBase query MUST include `tenant_id` in filter — never query without it."

## Steps to Reproduce

1. Obtain a valid `slotId` from tenant A (e.g. via the API or by observing network traffic).
2. Call `bookSlot(slotId)` while authenticated as tenant B.
3. Observe: the slot record for tenant A is updated — `booked` count incremented — without any tenant boundary check.

## Expected Behaviour

`bookSlot()` should verify that the retrieved slot's `tenant_id` matches the expected tenant before performing the update. The function signature should accept a `tenantId` parameter and the PocketBase fetch/update should be guarded with a `tenant_id` filter or post-fetch assertion.

## Actual Behaviour

`bookSlot()` at `src/actions/slots.ts` lines 44-49:
```ts
export async function bookSlot(slotId: string): Promise<void> {
  const pb = await getPb();
  const slot = await pb.collection('availability_slots').getOne(slotId);
  const booked = (slot['booked'] as number) + 1;
  await pb.collection('availability_slots').update(slotId, { booked });
}
```
No `tenant_id` is checked at any point. The `getOne` call retrieves any slot by ID regardless of tenant.

## Root Cause Analysis

_Filled by implementer after investigation._

## Fix

_Filled by implementer after fix._

Branch: `fix/bug-003`
Files changed: `src/actions/slots.ts`, `src/core/chatbot/ChatEngine.tsx` (call site must pass tenantId)

## Verification

_Filled by QA agent after re-testing._

- [ ] Unit tests pass
- [ ] E2E test covers this scenario
- [ ] Manual validation passed
