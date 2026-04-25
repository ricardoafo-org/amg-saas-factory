---
id: BUG-008
title: Hardcoded 'talleres-amg' tenant fallback in 5 files
severity: medium
status: open
filed: 2026-04-25
filed-by: compliance-reviewer
branch: chore/remove-tenant-id-fallback
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

_Filled by implementer after investigation._

## Fix

_Filled by implementer after fix._

Branch: `chore/remove-tenant-id-fallback`
Files changed: …

## Verification

- [ ] Unit tests pass with `TENANT_ID` set
- [ ] App throws clearly when `TENANT_ID` unset (test added)
- [ ] No `'talleres-amg'` literal remains in `src/`
- [ ] Compliance-reviewer clean on the change
