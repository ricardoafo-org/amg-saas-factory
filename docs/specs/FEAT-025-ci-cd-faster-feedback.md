# FEAT-025 — CI/CD Faster Feedback Loop

**Status:** Proposed
**Priority:** Medium
**Sprint:** Post-Sprint 4 / DevOps backlog
**Owner:** TBD
**Spec'd:** 2026-04-25

## Problem

The current PR-to-deploy loop takes **~7 minutes** wall-clock minimum, dominated by:

1. **CI workflow (~3-4 min)** — 5 parallel jobs each repeat `npm ci` (~40s/job). The slowest job determines PR feedback latency.
2. **Deploy workflow (~3-4 min)** — `smoke` (re-runs type-check) ~1.5 min + Docker build ~50s + SSH deploy ~30s.
3. **No `next build` runs in CI** — production-only Next.js errors (e.g. `'use server'` export rules) only surface during the Docker build step in the deploy workflow, forcing CI/build round-trips on every offending PR. Two such errors blocked FEAT-024 deployment (commits 2546680 and 1dbde63) before reaching tst.

Net effect: every revision waits multiple minutes for signal that could arrive in seconds.

## Goal

Reduce merge-to-live wall-clock from **~7 min → ~3 min** without sacrificing safety.

## Non-Goals

- Switching package manager (bun, pnpm) — high migration cost, separate decision
- Larger GitHub-hosted runners — bad ROI
- Multi-arch Docker builds — x86-only by design

## Proposed Changes

### 1. Drop `smoke` job from `.github/workflows/deploy-tst.yml`
- Saves ~90s per deploy
- Rationale: PR-level CI gate already type-checks the merge commit before allowing the merge into `main`. The smoke job re-proves what's already proven. Defense-in-depth that costs 90s on every deploy is bad ROI given branch protection rulesets.
- Risk: bypass scenarios (admin push directly to main) lose the type-check gate. Mitigation: branch protection ruleset already blocks direct push.

### 2. Add explicit `node_modules` cache to all CI jobs
Currently `actions/setup-node@v4 with cache: npm` only caches `~/.npm` registry tarballs — `npm ci` still has to install everything to disk every run.

Add to each job:
```yaml
- uses: actions/cache@v4
  id: deps
  with:
    path: node_modules
    key: deps-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
- run: npm ci --prefer-offline --no-audit
  if: steps.deps.outputs.cache-hit != 'true'
```
- Saves ~25-35s on every job when lockfile unchanged
- Wall-clock impact: drops slowest CI job below 60s

### 3. Add `Build (next build)` job to `.github/workflows/ci.yml`
- Runs `npm run build:docker` (which is `next build` without the schemas-sync prelude)
- ~50-60s with cold cache, ~20s with warm `.next/cache`
- Catches `'use server'` export errors, missing imports, type-only-but-runtime issues — every category that bit FEAT-024
- Cache `.next/cache`:
  ```yaml
  - uses: actions/cache@v4
    with:
      path: .next/cache
      key: nextjs-${{ runner.os }}-${{ hashFiles('package-lock.json') }}-${{ hashFiles('**/*.{ts,tsx}') }}
      restore-keys: nextjs-${{ runner.os }}-${{ hashFiles('package-lock.json') }}-
  ```

### 4. Verify GHA Docker cache is actually warm in deploy workflow
- Current config sets `cache-from: type=gha, cache-to: type=gha,mode=max`
- After PR #11 lands, monitor next deploy run for `CACHED [builder N/M]` markers
- If misses persist, investigate scope key collisions (only one `cache-to` per repo per scope)

### 5. (Optional, follow-up) Pre-push local hook running `npm run build:docker`
- 30-60s local feedback before commits push
- Prevents wasting CI minutes on builds that won't pass anyway
- Tradeoff: longer local commit-to-push latency. Make opt-in via `.git/hooks/pre-push.sample` doc, not enforced.

## Quality Gates Update

Add to `CLAUDE.md` "Merge checklist":
- Item 1.5: `npm run build:docker` must exit 0 (covered by new CI Build job)

## Estimated Impact

| Workflow | Before | After |
|---|---|---|
| CI (PR) | ~3-4 min | ~90-120 sec |
| Deploy (post-merge) | ~3-4 min | ~75-100 sec |
| **Merge-to-live** | **~7 min** | **~3 min** |

## Implementation Order

1. PR A — drop `smoke` job + add `Build` CI job (1 file each, mechanical)
2. PR B — add `node_modules` and `.next/cache` caching across all CI jobs
3. Observation period (1 week) — measure actual wall-clock improvement, verify cache hit rates
4. PR C (optional) — pre-push hook documentation

## Out of Scope

- Self-hosted runners
- Migration to bun/pnpm
- Parallel test sharding (unit tests already <30s, no benefit)
- E2E enablement (separate spec — needs PocketBase seed parity)

## Open Questions

- Should we also cache `~/.cache/ms-playwright` once E2E is re-enabled? (Yes, but blocked on E2E re-enablement.)
- Do we want to enforce `npm run build:docker` as a pre-commit hook (stronger) or pre-push (lighter)? Recommendation: pre-push, opt-in.
