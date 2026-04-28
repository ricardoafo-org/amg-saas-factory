---
id: BUG-017
title: tst deploy fails on apply-schema — UNIQUE constraint blocked by pre-existing config duplicates
severity: high
status: wip
filed: 2026-04-28
filed-by: manual
branch: fix/BUG-017-config-dedupe
---

## Summary

Every push to `main` since 2026-04-28 fails the CD pipeline at the **Apply schema to tst PB** step with `UNIQUE constraint failed: config.tenant_id, config.key (2067)`. tst is consequently stuck on commit `36e4eea`, six commits behind `main`. The chatbot smoke test fails (booking flow appears broken to operators), but the application code is not the root cause — the deployed bundle is simply stale.

Per the severity rubric this is **F4 (chatbot flow regression — visible to users)** with operational amplification: the deploy gate that must protect tst is the gate that's locking us out.

## Steps to Reproduce

1. Push any commit to `main` (any of #119/#120/#121/#122 since 2026-04-28).
2. Observe `CD / Deploy to VPS / Apply schema to tst PB` step in the GitHub Actions run.
3. Step exits non-zero; `apply-schema.ts` propagates the PocketBase error: `UNIQUE constraint failed: config.tenant_id, config.key (2067)`.

## Expected Behaviour

`apply-schema.ts` is idempotent: on a tst PB whose `config` collection already exists, applying the schema is a no-op for any drift it cannot non-destructively reconcile, and exits 0.

## Actual Behaviour

The schema declares (line 21 of `src/schemas/config.schema.json`):

```sql
CREATE UNIQUE INDEX idx_config_tenant_key ON config (tenant_id, key)
```

tst's `config` collection contains pre-existing rows with duplicated `(tenant_id, key)` tuples — most likely from earlier `db-setup.js`/`seed-tenant.ts` runs prior to UNIQUE being declared. PocketBase refuses the index creation, the request returns an error, `apply-schema.ts` exits non-zero, and the rest of the deploy pipeline (`Deploy to VPS via SSH`, `Health check tst`, `Smoke test`) is skipped.

The SEV-1 root cause from 2026-04-26 (no schema on `availability_slots`) is no longer present — the new failure is a downstream artefact of the same lineage of one-shot seed scripts.

## Root Cause Analysis

Two compounding gaps:

1. **Data-side**: tst's `config` collection has duplicate `(tenant_id, key)` rows that pre-date the UNIQUE-index declaration. The schema-as-code work introduced UNIQUE without verifying the existing data could satisfy it.
2. **Tool-side**: `apply-schema.ts` does not pre-check whether requested UNIQUE indexes are satisfiable by the existing data. It hands the SQL to PocketBase and reports whatever PB returns. The error message PB surfaces (`SQLITE_CONSTRAINT_UNIQUE: UNIQUE constraint failed: config.tenant_id, config.key (2067)`) is correct but unactionable for an operator scanning CI logs.

## Fix

Two-part fix on branch `fix/BUG-017-config-dedupe`:

### 1. Defensive pre-check in `apply-schema.ts`

For every NEW UNIQUE index targeting an existing collection, parse the SQL to extract `(columns)`, fetch the live records, and group by the unique tuple. If duplicates exist, emit an actionable error listing the conflicting tuples + record counts and exit 1 BEFORE PB is asked to create the index. This generalises beyond `config` — every future UNIQUE index gets the same pre-flight.

### 2. One-time `scripts/dedupe-config.ts` (workflow_dispatch only)

Walks `config` records, groups by `(tenant_id, key)`, keeps the most-recently-updated row per group, deletes the rest. Idempotent (no-op once clean). Triggered manually via `.github/workflows/dedupe-config.yml` with a confirmation input — never on `push`. Once tst is clean, this script can be deleted in a follow-up PR.

Files changed:
- `scripts/apply-schema.ts` — pre-check for UNIQUE-index data conflicts
- `scripts/dedupe-config.ts` — one-time destructive dedupe (NEW)
- `.github/workflows/dedupe-config.yml` — manual trigger workflow (NEW)
- `docs/bugs/wip-BUG-017.md` — this file
- `tests/db/apply-schema-precheck.test.ts` — unit test for the pre-check (NEW)

## Verification

- [ ] `npm run type-check` clean
- [ ] `npm test` clean (new pre-check test green)
- [ ] PR merged to main → next CD run reports the actionable pre-check error instead of cryptic 2067 (proves tool-side fix on tst's still-dirty data)
- [ ] `dedupe-config.yml` triggered manually with explicit user authorization → tst `config` deduped
- [ ] Subsequent push to `main` deploys cleanly all the way through `confirm-tst`
- [ ] Smoke test against tst URL green (closes loop with PR 1 task #111)
