---
id: BUG-017
title: tst deploy fails — config UNIQUE index conflicts with pre-existing duplicate rows
severity: high
status: wip
filed: 2026-04-28
filed-by: manual
branch: fix/BUG-017-config-dedupe
---

## Summary

`scripts/apply-schema.ts` (run by `deploy.yml` after every push to `main`) attempts
to create the UNIQUE index `idx_config_tenant_key ON config (tenant_id, key)` declared
in `src/schemas/config.schema.json`. PocketBase rejects the index creation with
SQLite error 2067 (`UNIQUE constraint failed`) because the live tst `config`
collection already contains duplicate `(tenant_id, key)` tuples — they were
inserted before the UNIQUE constraint existed in the schema-as-code source of
truth. Result: every `main → tst` deploy goes red at the apply-schema step, the
container is never swapped, and the post-deploy gates never run. Severity: F4
(deploy regression — automation that previously held green now red).

## Steps to Reproduce

1. Live PB instance with at least two `config` rows sharing `(tenant_id, key)`
   (current state on tst).
2. Run `tsx scripts/apply-schema.ts` against that instance.
3. Observe: PB returns 400 on `PATCH /api/collections/config` with the SQLite
   2067 message buried inside `data.indexes.message`.

## Expected Behaviour

`apply-schema.ts` detects the conflict BEFORE issuing the PATCH and exits with a
clear, actionable error pointing to the duplicate rows + the recommended
remediation (one-time `dedupe-config.ts` workflow, also delivered in this PR).

## Actual Behaviour

The PATCH is issued blind. PB's error surface buries the conflict inside a
nested object that the script's "first error message" extraction does not
unwrap, so the operator sees an unhelpful `400` and must SSH into the box to
read PB logs.

## Root Cause Analysis

Two compounding issues:

1. **Existing data violates a new constraint.** The `config` collection
   pre-dates the schema-as-code rebuild (FEAT-052). Duplicates accumulated
   before `idx_config_tenant_key` was declared. Schema-as-code now wants the
   index; live data refuses.
2. **`apply-schema.ts` has no defensive pre-check for new UNIQUE indexes
   targeting existing collections.** It trusts PB to either succeed or surface
   a useful error. PB does neither.

## Fix (this PR)

Two-part — both ride in the same PR per solo-dev policy
(`feedback_no_solo_dev_doc_prs.md`):

### 1. Defensive pre-check in `apply-schema.ts` — generic, scalable

For every NEW `CREATE UNIQUE INDEX` against a collection that already exists on
the live PB, fetch the indexed columns via the records API, group by tuple,
and report any group with `count > 1` BEFORE issuing the PATCH. Exits 1 with a
readable error listing the offending tuples and the count. Pure helpers
extracted into `scripts/lib/unique-precheck.ts` so they are unit-testable
without a live PB.

Why this lives in the schema applier: the rule "new UNIQUE constraint must
match live data" is a general invariant of schema-as-code, not specific to
`config`. Future schemas adding UNIQUE indexes inherit the guard for free.

### 2. One-time `scripts/dedupe-config.ts` + `dedupe-config.yml` workflow

Removes the existing duplicates so the index can be created. Strategy: keep
the most-recently-`updated` row per `(tenant_id, key)`, delete the rest.
Defaults to dry-run; requires explicit `--apply` flag to mutate. Wrapped in a
`workflow_dispatch`-only GitHub Actions workflow (`dedupe-config.yml`) gated
on a typed confirmation input (`confirm = "dedupe-tst"`) so it cannot be
triggered accidentally. Runs the ops image inside the existing `amg_default`
docker compose network on the tst VPS over SSH, identical wiring to
`deploy.yml`'s ops steps.

After dedupe runs once on tst, `apply-schema.ts` succeeds, the next deploy goes
green, and the dedupe script + workflow stay in the repo as documented
remediation. They are NOT deleted post-run — the script is idempotent (a clean
DB exits 0 with "no duplicates"), so the cost of leaving it is zero and the
documented procedure has long-tail value.

Branch: `fix/BUG-017-config-dedupe`

Files added:
- `scripts/lib/unique-precheck.ts` — pure helpers (`parseUniqueIndexColumns`, `findDuplicateTuples`)
- `scripts/dedupe-config.ts` — one-time deduplication script
- `.github/workflows/dedupe-config.yml` — manual workflow_dispatch wrapper
- `tests/db/unique-precheck.integration.test.ts` — 13 unit tests on the helpers

Files modified:
- `scripts/apply-schema.ts` — pre-check loop after the drift summary, before PATCH

## Verification

- [ ] `npm run type-check` clean
- [ ] `npm run lint` clean
- [ ] `npm run test:integration -- tests/db/unique-precheck.integration.test.ts` all green
- [ ] Local `tsx scripts/apply-schema.ts --dry-run` against a clean PB exits 0
      without the pre-check firing (no duplicates, no error)
- [ ] Manual: simulate duplicate by inserting two `config` rows with same
      `(tenant_id, key)` on a local PB, re-run apply-schema, verify pre-check
      catches it and exits 1
- [ ] After merge: `dedupe-config.yml` triggered with `mode=dry-run` on tst,
      review output, then re-trigger with `mode=apply`
- [ ] Subsequent `main → tst` deploy reaches green at apply-schema step
