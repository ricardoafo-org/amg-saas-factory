# 2026-04-29 — CI/CD Pipeline Performance Review

## Status

Authored autonomously after the 2026-04-28/29 overnight session that landed PRs #133–#138 (Playwright container, .next cache, OSSF fold, Node 24 + TS 6 + Next 16 bump, security overrides, dependency-review + semgrep merge-blocking).

This is a review and recommendation document — not an implementation. Per the locked rule **"Solo-dev — PRs for code only, never for docs alone"**, this file lives on `docs/pipeline-perf-review` waiting to ride with the next code PR (or to bundle with a chosen optimisation in the same commit).

## Snapshot — current state

Pipeline: single workflow `.github/workflows/ci.yml`. Branch protection requires one check (`CI success`); ci-success aggregates 14 jobs via `needs:`.

Wall-clock observed on PR #138 run 25083962267:

```
00:48  PR opened
04:13  ci-success green   ⇒  ~3:25 wall clock
```

### Critical path (longest dependency chain)

```
  type-check 36s ─┐
                  ├──► next-build 85s ──► e2e-smoke 63s ──► ci-success
  lint       31s ─┘                       (shard max)
```

Total ≈ **204s on the hot path**. Everything else (lint, unit, integration, semgrep, codeql, dependency-review) finishes in parallel inside that window.

### Per-job durations (run 25083962267, sorted)

| Job | Time | Tier | On critical path? |
|---|---|---|---|
| pr-template-check | ~5s | T1 | no |
| pr-size | ~6s | T1 | no |
| auto-label | ~7s | T1 | no |
| dependency-review | ~12s | T1 | no |
| flows-validate | ~17s | T1 | no |
| test-deletion-guard | ~20s | T1 | no |
| new-code-needs-test | ~22s | T1 | no |
| security-gate | ~25s | T1 | no |
| castilian-lint | ~26s | T1 | no |
| lint | 31s | T1 | T1-blocker for next-build |
| integration-tests | 35s | T1 | no |
| **type-check** | **36s** | **T1** | **YES** |
| codeql (actions) | 51s | T1 | no |
| unit-tests | 52s | T1 | no |
| semgrep | 54s | T1 | no |
| npm-audit | 60s | T1 | no |
| codeql (js-ts) | 79s | T1 | no |
| **next-build** | **85s** | **T2** | **YES** |
| **e2e-smoke shard 1** | **58s** | **T3** | **YES (if slowest)** |
| **e2e-smoke shard 2** | **63s** | **T3** | **YES (slowest shard)** |

Already-applied wins (visible in current ci.yml):

- Tier-ordered execution — type-check + lint gate next-build; next-build gates e2e-smoke. Saves 8 minutes on every failed PR.
- `actions/cache` keyed on `package-lock.json` — restores `node_modules` so `npm ci` is incremental on every job.
- `.next/cache` step with two-tier `restore-keys` (lockfile+sources, then lockfile-only).
- Playwright runs inside `mcr.microsoft.com/playwright:v1.59.1-jammy` — skips ~30s of `playwright install` per shard, and the skew-check job fails CI if the npm version drifts from the container tag.
- e2e-smoke sharded 2× (was 4× — halved per PR #133, current shards finish in 58/63s, adding shards no longer pays).
- OSSF Scorecard folded into ci.yml — schedule-only, doesn't affect PR latency.
- 14 jobs share one `cache: npm` config via `actions/setup-node` — restores from a hash-keyed cache in ≈1–3s.

## Bottlenecks

### #1 — `next-build` (85s, single-job critical path)

Today the build runs `npm run build:docker` ≡ `next build --webpack`. Tier 2, blocks all e2e shards.

What's already done: `.next/cache` is restored before the build. On a hot cache the incremental compile finishes in 25–35s; on a cold cache (lockfile or source change) it pays the full 85s.

What to investigate:

1. **Cache hit rate.** No metric is exported. Add a `--debug` flag or a tiny shell step that logs the cache size + whether the primary key hit, so we can prove cache is actually warming. If hit rate is < 50% on hot PRs, the source-files key (`hashFiles('src/**/*.{ts,tsx,js,jsx,css}')`) is too aggressive — it busts on any change, defeating the purpose. Trade for `hashFiles('package-lock.json')` only and accept slightly larger incremental compiles.
2. **Turbopack opt-out is a constraint, not a default.** `npm run build:docker` uses `--webpack` because next-pwa requires it. Once next-pwa lands a Turbopack-compatible loader (tracked upstream), flipping back to Turbopack production builds yields ~30–50% off `next build` time per Next 16 benchmarks. This is a watching item — no action this round.

### #2 — e2e-smoke shards (max 63s, gate of T3)

Two shards run in parallel; the slowest determines critical-path contribution. PR #133 already halved 4 shards → 2.

What's already done: container-baked browsers, `--workers` bumped (PR #133), traces uploaded only when present (`if-no-files-found: ignore`).

What to investigate:

1. **Worker count vs shard count.** With shards=2 and 2-vCPU runners, more workers per shard fights the runner. Confirm `playwright.config.ts` doesn't set workers > 2 inside containerised CI; if it does, we're trading shard parallelism for CPU contention.
2. **Trace retention policy.** `retention-days: 7` × 2 shards × every PR run. Cheap today, scales linearly. Drop to 3 days once cutover stabilises — diagnostic value of a 7-day-old trace is near zero.
3. **Skip e2e-smoke on docs-only PRs.** See #4 below — this is the single highest-ROI lever for PRs that touch only `docs/`.

### #3 — npm install duplication (210s parallel CPU, ~0s wall clock)

Every job runs `actions/checkout` + `actions/setup-node@cache:npm` + `npm ci`. The cache makes `npm ci` ~10–15s; checkout + setup-node ≈ 4–5s; total ≈ 15s × 14 jobs = 210s of CPU minutes per PR.

**This does not reduce wall-clock latency** — jobs run in parallel on separate runners. It costs Actions minutes (free under the public-repo allowance, but matters if the repo ever flips private or hits the org allotment).

Composite-action consolidation (`./.github/actions/setup`) would dedupe the YAML but yields zero wall-clock improvement. Defer until Actions minutes become a real constraint.

### #4 — All gates run on every PR including docs-only

Spec/decisions/runbook PRs (when bundled with code per the locked rule) still trigger the full pipeline because at least one code file is touched. But the *minutes spent* on type-check / next-build / e2e for a 5-line README typo bundled with a 2-line code tweak are real waste.

Two paths:

- **`paths-filter` / job-level `paths-ignore`.** GitHub-supported. Skip specific jobs when only `docs/**` or `*.md` change. Risk: if a PR mixes docs + code, the filter must require at least one code change to enable each gate. Implementable as a path-filter job feeding `if:` conditions on the others, OR via `dorny/paths-filter@v3`.
- **No-op fast lane.** A first job that detects "docs-only changeset" and short-circuits ci-success directly. Safer than per-job conditions because there's a single decision point.

This matters less today (most PRs touch code) but is a free 3-minute win on doc-heavy PRs once it's in.

## Ranked recommendations

| # | Lever | Wall-clock saved | Risk | Effort |
|---|---|---|---|---|
| 1 | Validate `.next/cache` hit rate — log it for a week, then tune key | 30–60s (cold→hot promotion) | low | 30 min |
| 2 | Reduce trace retention 7d → 3d | 0s wall, storage win | none | 5 min |
| 3 | Docs-only fast lane (paths-filter + ci-success short-circuit) | ~180s on doc-heavy PRs | low (filter must be conservative) | 1–2h |
| 4 | Conditional CodeQL — schedule-only on `actions` query (workflows rarely change) | ~50s on PRs that don't touch `.github/` | low | 30 min |
| 5 | Workflow concurrency cancellation per PR ref (`concurrency: pr-${{ github.ref }}`) | unbounded — kills superseded runs | none | 5 min |
| 6 | Composite `./.github/actions/setup-node` action | 0s wall, ~50% YAML reduction | low | 1h |
| 7 | Bump `e2e-smoke` workers carefully + measure | 5–15s if balanced | medium (flake risk) | 1h + monitor |
| 8 | Turbopack production builds (await next-pwa upstream) | 30–50% of next-build | high until upstream lands | external |

**Recommended order to ship:** 5 → 1 → 2 → 4 → 3 → 6 → 7 → (8 watch only).

Lever 5 (concurrency) is a one-liner that prevents superseded PR pushes from holding runner slots — pure win, no downside, biggest practical effect on developer feedback latency when rebasing.

Lever 1 (cache visibility) is the prerequisite for any further build-time work — we cannot tune what we don't measure.

## Anti-recommendations (do NOT do)

- **Do not add more e2e-smoke shards.** Already halved 4→2. Each shard pays 15s of fixed setup; 4 shards spent 60s on setup to save 30s on tests — net loss. The current 58/63s shard times are the floor for this suite size.
- **Do not split next-build into multiple jobs.** Webpack incremental compile is single-process; parallelising it across runners loses the in-memory cache and adds checkout/setup overhead.
- **Do not promote npm-audit to merge-blocking.** It's already at `--audit-level=critical` and the 5 known high vulns (resend → svix → uuid) are upstream-pending. Promoting now would gate every PR on a fix we don't control.
- **Do not consolidate codeql matrix into one job.** `actions` and `javascript-typescript` are independent SARIF outputs; merging them into one job loses parallelism and cuts visibility in the Security tab.

## Operational notes

- Weekly Monday `schedule:` cron acts as a free "main is still green" canary. Keep it.
- `branch_protection_rule:` trigger fires when the protection JSON itself changes. Useful as a built-in test-the-test for protection config drift. Keep it.
- e2e-admin job is `if: false` pending FEAT-053. When re-enabled, add it to `ci-success.needs:` in the same PR. Document in spec.

## Acceptance for this review

- [x] Lever 5 (workflow concurrency cancel) shipped in PR #139.
- [x] Lever 1 (.next/cache hit-rate logging — `id: next-cache` + restore-status notice + post-build `du -sh`) shipped on `perf/ci-cache-logging-trace-retention`.
- [x] Lever 2 (Playwright trace retention 7d → 3d) shipped same branch.
- [ ] Cache-hit log reviewed after 1 week of PR data.
- [ ] If primary-key hit rate < 50%, lever 1 follow-up widens cache key (drop the `src/**/*` portion, keep lockfile only).
- [ ] Lever 4 (conditional CodeQL `actions` query) — proper implementation needs `dorny/paths-filter` + matrix → 2-job split + ci-success.needs update. Deferred.
- [ ] Doc-only fast lane (lever 3) opened as a separate PR with a representative test PR proving it short-circuits.

## References

- PR #133 — `perf(ci): halve smoke shards + bump smoke workers`
- PR #134 — `perf(ci): Playwright container + .next cache + CodeQL fold`
- PR #135 — Node 24 + TS 6 + Next 16 + Zod 4
- PR #136 — `chore(ci): fold OSSF Scorecard into ci.yml`
- PR #137 — `chore(security): override postcss + serialize-javascript`
- PR #138 — `ci: dependency-review + semgrep merge-blocking`
- Run 25083962267 — measurement source for this document
