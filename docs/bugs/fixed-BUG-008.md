---
id: BUG-008
title: Hardcoded 'talleres-amg' tenant fallback in 14 files
severity: medium
status: fixed
filed: 2026-04-25
filed-by: compliance-reviewer
fixed: 2026-04-26
fixed-by: rafo-claude-bot
branch: fix/BUG-008-tenant-id-helper
---

## Summary

Five files have `process.env['TENANT_ID'] ?? 'talleres-amg'` — a hardcoded tenant slug that violates the "no hardcoded tenant data" rule. In multi-tenant rollout, this fallback masks misconfiguration: a deployment with a missing `TENANT_ID` env var silently serves talleres-amg's data instead of failing loudly.

Pre-existing pattern (since 3c187807, 2026-04-19). Not introduced by FEAT-031 — flagged because the compliance gate ran over a file that contains it. Tracked separately to avoid scope creep on FEAT-031.

## Steps to Reproduce

1. Run `rg "TENANT_ID.*talleres-amg" src/`
2. Observe 5 hits across actions, layout, and page

## Expected Behaviour

Either:
- Throw at module init if `TENANT_ID` is unset (preferred for prod safety), or
- Centralize to one helper `getTenantId()` that fails loudly with a useful error

## Actual Behaviour

Five files independently fall back to the literal string. A deployment without `TENANT_ID` set silently serves the wrong tenant.

## Files affected

- `src/app/layout.tsx:17`
- `src/app/page.tsx:13`
- `src/actions/chatbot.ts:20`
- `src/actions/consent.ts:19`
- (any others surfaced by full grep)

## Root Cause Analysis

Initial bug report said 5 files; full grep revealed 14 production callsites with two distinct patterns:

- 8 files with `const TENANT_ID = process.env['TENANT_ID'] ?? 'talleres-amg';` (module-init pattern)
- 6 files with the literal `loadClientConfig('talleres-amg')` (no env var read at all — strictly worse)

Root cause: cargo-culted across files as new pages were added. No central tenant-resolution helper existed, so each new file copied the local pattern instead of importing one.

## Fix

Introduced `src/lib/tenant.ts` with a single `getTenantId()` helper that throws if `TENANT_ID` is unset, empty, or whitespace-only. Error message references "cross-tenant data leak" so the failure is unambiguous in logs.

All 14 callsites swapped to call the helper. CI + Docker build now pass `TENANT_ID=talleres-amg` explicitly:

- `.github/workflows/ci.yml` — workflow-level `env: TENANT_ID: talleres-amg`
- `Dockerfile` — `ARG TENANT_ID=talleres-amg` + `ENV TENANT_ID=${TENANT_ID}` at builder stage
- `.github/workflows/deploy-tst.yml` — `build-args: TENANT_ID=talleres-amg`
- `vitest.config.ts` — `test.env.TENANT_ID = 'talleres-amg'` so test imports of pages don't blow up

A vitest alias for `server-only` was added (`src/test/server-only-stub.ts`) so the helper can be unit-tested.

Branch: `fix/BUG-008-tenant-id-helper`

Files changed:
- `src/lib/tenant.ts` (new)
- `src/lib/__tests__/tenant.test.ts` (new — 5 cases: set, unset, empty, whitespace, error message)
- `src/test/server-only-stub.ts` (new — empty stub for vitest alias)
- `vitest.config.ts` (alias + test env)
- `src/actions/chatbot.ts`, `src/actions/consent.ts`
- `src/app/layout.tsx`, `src/app/page.tsx`
- `src/app/{electronica,proceso,novedades,novedades/[slug],como-trabajamos,politica-de-privacidad,politica-de-cookies,aviso-legal,sobre-nosotros,reclamaciones}/page.tsx`
- `Dockerfile`, `.github/workflows/ci.yml`, `.github/workflows/deploy-tst.yml`

## Verification

- [x] Unit tests pass with `TENANT_ID` set (389 / 389 green)
- [x] App throws clearly when `TENANT_ID` unset (5 dedicated tests in `tenant.test.ts`)
- [x] No `'talleres-amg'` literal remains in `src/` production code (only test fixtures + the in-test set/expect remain)
- [x] Type-check clean (zero exit)
- [ ] Compliance-reviewer clean on the change (post-merge)
