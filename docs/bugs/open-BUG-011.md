---
id: BUG-011
title: Some footer links/buttons do not navigate
severity: medium
status: open
filed: 2026-04-25
filed-by: manual
branch: fix/BUG-011-footer-dead-links
---

## Summary

Manual testing on tst shows some buttons/links in the footer do nothing on click. Exact ones TBD by audit, but this is exactly the class of failure FEAT-032's `global-ctas.spec.ts` was added to catch — meaning either the test isn't yet covering footer or the regression was introduced after the test was written.

User impact: dead links break trust; legal pages (privacidad, cookies, aviso legal) MUST be reachable for LOPDGDD/LSSI-CE compliance.

## Steps to Reproduce

1. Open tst homepage
2. Scroll to footer
3. Click each footer link/button in turn
4. Note which ones do nothing or 404

## Expected Behaviour

Every footer link navigates to a real page. Legal pages (privacidad, cookies, aviso legal, condiciones) MUST exist and load.

## Actual Behaviour

Some links are dead — exact list to be filled in by QA pass.

## Files affected (likely)

- `src/core/components/Footer.tsx` (or equivalent)
- Missing `src/app/(legal)/*/page.tsx` routes
- Possibly anchor-only links to sections that no longer exist after the v2 redesign

## Root Cause Analysis

_Filled by implementer after audit._ Hypothesis: footer was migrated during v2 redesign but routes / anchor targets were not updated.

## Fix

_Filled by implementer after fix._

## Verification

- [ ] Every footer href resolves to 200 (Playwright `global-ctas.spec.ts` extended to assert this)
- [ ] All 4 legal pages exist and render
- [ ] No `href="#"` placeholder links in footer
- [ ] FEAT-032 `global-ctas.spec.ts` extended to cover all footer links by `data-testid`
- [ ] Manual click-through passes
