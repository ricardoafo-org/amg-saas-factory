---
id: BUG-017
title: Deploys to tst fail at apply-schema — UNIQUE INDEX on config(tenant_id, key) blocked by pre-existing duplicates
severity: high
status: open
filed: 2026-04-28
filed-by: manual
branch: fix/BUG-017
---

## Summary

Every CD run after PR #106 (FEAT-052 PR 3/N seed-tenant + generate-slots) lands the new
schema-as-code workflow but the **Apply schema to tst PB** step exits with status 2.
tst is therefore frozen at commit `36e4eea` while `main` is at `bb51226` — six PRs
have merged green to `main` (#117 #118 #119 #120 #121 #122) without any of them
reaching tst.

This was discovered while running `npm run smoke:deployed` against tst as part of
task #111 (PR 1 — Playwright-verify booking on tst). The smoke spec is correct;
tst is just running the wrong code.

## Steps to Reproduce

1. Watch any push-to-main fire `.github/workflows/deploy.yml`.
2. Open the most recent failed run (e.g. <https://github.com/ricardoafo-org/amg-saas-factory/actions/runs/25055113609>).
3. Expand `Deploy to VPS → Apply schema to tst PB`.

## Expected Behaviour

`apply-schema.ts` runs idempotently against tst PB and exits 0. CD continues to
container swap, health-check, schema-contract, smoke. tst advances to the new SHA.

## Actual Behaviour

```
Updating config...
Error: update config failed (400): {"data":{"indexes":{"1":{"code":"validation_invalid_index_expression","message":"Failed to create index idx_config_tenant_key - constraint failed: UNIQUE constraint failed: config.tenant_id, config.key (2067)."}}},"message":"Failed to update collection.","status":400}
2026/04/28 13:24:07 Process exited with status 2
##[error]Process completed with exit code 1.
```

PocketBase rejects the `CREATE UNIQUE INDEX idx_config_tenant_key ON config (tenant_id, key)`
because tst's `config` collection already contains rows that would violate the
constraint — most likely duplicate `(tenant_id, key)` pairs accumulated before
the unique-index requirement was codified in `src/schemas/config.schema.json`.

The smoke run that surfaced the visibility:
- Test 1 (homepage title) → PASS.
- Test 2 (FAB opens, "Iniciar conversación" appears) → FAIL after 3 retries.
- Test 3 (booking flow advances past service pick) → FAIL after 3 retries.
- `/api/health` returns `commit: 36e4eea4b8b8d63335a441ab02bc4063d3b95039` (PR #106) — three weeks of merges behind main.

## Root Cause Analysis

`src/schemas/config.schema.json:21` declares:

```json
"CREATE UNIQUE INDEX idx_config_tenant_key ON config (tenant_id, key)"
```

`scripts/apply-schema.ts` translates that into a `PATCH /api/collections/config`
that PocketBase refuses when existing rows already violate the constraint.
`apply-schema.ts` does not pre-check for data conflicts before requesting an
index that requires uniqueness — it surfaces the raw PB error and exits 2.

## Fix

_Pending owner. Two complementary parts:_

1. **One-time data hygiene on tst**: dedupe `config` by `(tenant_id, key)`,
   keeping the most recently `updated` row. Done via a new
   `scripts/dedupe-config.ts` invoked through `workflow_dispatch` with explicit
   confirmation — destructive on shared state, must not run silently in CD.
2. **Defensive apply-schema**: before applying any index marked UNIQUE, count
   distinct vs total rows on the relevant column tuple, and refuse with a clear
   `BUG-017` reference if duplicates exist. Same pattern can guard future unique
   indexes.

The proper sequence is (1) then re-run CD, then (2) lands as part of the
`fix/BUG-017` PR so the next environment we add (pre-pro per #119) inherits the
defensive check.

## Verification

- `gh run rerun <id>` after dedupe → Apply schema step turns green.
- `npm run smoke:deployed` against tst → all 3 happy-path tests pass and
  `/api/health` reports the latest main SHA.
- `tests/db/schema-contract.spec.ts` against tst PB → green.

## Severity (rubric citation)

Functional axis row F4 (chatbot flow regression — though the chatbot itself is
fine; the regression is "tst is days behind main", masking real failures
behind stale code) combined with operational impact: customers cannot book
anything new that has merged since 2026-04-26. SEV-2 per the rubric's "feature
broken" line. Not SEV-1 because no PII leak, no LOPDGDD breach, no auth bypass —
purely a deployment plumbing failure.

## Files involved

- `src/schemas/config.schema.json` (the unique-index declaration)
- `scripts/apply-schema.ts` (no pre-check)
- `.github/workflows/deploy.yml` (Apply schema step)
- tst PB `config` collection (data state)
