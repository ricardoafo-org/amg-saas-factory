# FEAT-026 — Deprecation Cleanup (next-pwa → serwist + upstream tracking)

**Status:** Proposed
**Priority:** Low (cosmetic — builds pass, tests pass)
**Sprint:** Post-Sprint 5 / DevOps backlog
**Owner:** TBD
**Spec'd:** 2026-04-25

## Problem

Every `npm ci` run prints ~25 deprecation warnings. They are **not blockers** (builds and tests pass), but they pollute CI logs and obscure real signal. After tracing each warning to its source, the picture is:

| Warning | Source dep | Direct dep version | Status |
|---|---|---|---|
| `inflight@1.0.6` | `glob@7.2.3` ← `workbox-build@7.1.1` | `@ducanh2912/next-pwa@10.2.9` (latest) | upstream stale |
| `glob@7.2.3` | `workbox-build@7.1.1` | same | upstream stale |
| `sourcemap-codec@1.4.8` | `magic-string@0.25.9` ← `workbox-build` | same | upstream stale |
| `source-map@0.8.0-beta.0` | `workbox-build@7.1.1` | same | upstream stale |
| `scmp@2.1.0` | `twilio@6.0.0` (latest) | `^6.12.0` | upstream stale |
| ~20 × `@react-email/{text,section,heading,...}` | `@react-email/components@1.0.12` (latest) | `^1.0.12` | upstream stale |

**Key fact:** every direct dep is already on its latest published version. Warnings live entirely in transitive deps owned by upstream maintainers. We cannot bump our way out.

## Goal

Eliminate the 4 workbox-related warnings by migrating off `@ducanh2912/next-pwa` to `@serwist/next`. Track the remaining warnings as upstream issues, do not migrate.

## Non-Goals

- Replacing `@react-email/components` with plain HTML templates — loses typed JSX templates, previews, and the `email-preview` admin route. ROI does not justify ~5h migration for 20 cosmetic warnings.
- Replacing `twilio` SDK with raw HTTP fetch — `scmp@2.1.0` is one warning. Loss of typed SDK is worse than the gain.
- Suppressing warnings via `npm config set loglevel=error`. Explicit decision per user: fix at root, do not silence.

## Proposed Changes

### 1. Migrate `@ducanh2912/next-pwa@10.2.9` → `@serwist/next@latest`

Why serwist:
- Modern, actively maintained replacement for next-pwa
- Built on Workbox v7 directly (no `workbox-build` wrapper) — bypasses the dormant Google project that owns the 4 deprecations
- Drop-in for our usage (we only use `dest`, `cacheOnFrontEndNav`, `aggressiveFrontEndNavCaching`, `reloadOnOnline`, `disable`)

Files affected:
- `next.config.ts` — replace `withPWA()` HOF with serwist plugin pattern
- `package.json` — remove `@ducanh2912/next-pwa`, add `@serwist/next` + `serwist`
- New `src/app/sw.ts` — service worker entry (serwist requires explicit SW source)
- `public/sw.js` — generated, gitignore

Migration reference: https://serwist.pages.dev/docs/next/getting-started

### 2. Document upstream-blocked warnings

Add `docs/decisions/2026-04-25-upstream-deprecations.md` listing the React Email and Twilio warnings as accepted noise pending upstream fix. Future engineers see the trail and don't relitigate.

### 3. Update CI log filtering (optional, follow-up)

If the noise still bothers us after #1 lands, add `npm ci 2>&1 | grep -v "npm warn deprecated"` only in CI logs (NOT during install — install warnings are real). Keeps human-facing logs clean while preserving signal at install time. Decision deferred.

## Quality Gates

- `npm run build:docker` exits 0 with serwist
- Service worker registers in browser dev tools after `npm start`
- Offline cache works (golden path: load page online → disconnect → reload → page still loads)
- Lighthouse PWA score not regressed

## Estimated Effort

- Migration: 2-4h
- Manual smoke test (offline + reload behavior): 30min
- PR review, deploy: 1h

## Implementation Order

1. PR A — install serwist, add `src/app/sw.ts`, update `next.config.ts`, remove `@ducanh2912/next-pwa`
2. PR B — add `docs/decisions/2026-04-25-upstream-deprecations.md` documenting accepted noise

## Out of Scope

- Replacing `@react-email/components` (see Non-Goals)
- Replacing `twilio` SDK (see Non-Goals)
- Service worker feature additions (push notifications, etc.) — separate spec

## Open Questions

- Do we want to keep `cacheOnFrontEndNav` + `aggressiveFrontEndNavCaching` semantics, or use serwist's defaults? Recommendation: start with serwist defaults, tune later.
- Is the `disable: process.env.NODE_ENV === 'development'` flag still needed with serwist? (Yes — serwist supports the same pattern via `disable: process.env.NODE_ENV !== 'production'`.)

## References

- `next.config.ts` — current PWA wiring
- npm warnings observed in deploy run 24918278695 (2026-04-25)
- workbox-build releases: https://github.com/GoogleChrome/workbox/releases — last meaningful release June 2024
