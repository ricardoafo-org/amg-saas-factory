# FEAT-027 — Sprint 1: Test Strategy Foundation

> **Parent specs:** FEAT-022 (QA Full Suite — test layer overview, OWASP coverage), FEAT-023 (Security OWASP — SAST/DAST tools).
> **Related (parallel work):** FEAT-025 (CI/CD Faster Feedback) shares the CI workflow file but optimizes raw speed (npm cache, `next build` in CI). Coordinate if both ship in the same sprint to avoid merge conflicts in `ci.yml`.
> This spec narrows the parents into a concrete, shippable Sprint 1 deliverable.

## Intent

Light up the **bottom of the testing pyramid** in CI: enable the existing-but-disabled E2E job, tag golden-path tests as `@smoke` for fast PR feedback, add post-deploy smoke against the live `tst` URL with automatic rollback, and bake security automation (Trivy + Semgrep + secret scan + ZAP baseline) into the same pipeline.

This sprint adds **no new test code beyond tagging** and **no new product code**. It is pure CI/CD wiring against tests that already pass locally. The goal is closing the gap where `ci.yml` runs zero E2E (`if: false`) and `deploy-tst.yml` runs only `type-check` before pushing to production — which is the failure mode the user flagged: *"we are deploying in PR flow Playwright tests should pass... we need testing strategy here or we will fuck up things."*

Sprints 2-6 (branded types, integration test infra, component tests, mutation/property-based, load tests) are out of scope here — each gets its own FEAT spec when started.

## Strategy alignment (one-pager)

```
PR Gate (ci.yml)              ← THIS SPRINT lights it up
  • type-check, lint, unit, flows-validate (have)
  • npm-audit, Semgrep custom, secret scan, schema sync   ← NEW
  • E2E @smoke subset, sharded x4, chromium                 ← NEW (enable existing)
  Target: < 6 min total

Deploy-tst Gate (deploy-tst.yml)
  • Trivy scan on Docker image (block HIGH+)               ← NEW
  • Build + push to GHCR (have)
  • Deploy via SSH (have)
  • Post-deploy smoke vs LIVE tst URL                      ← NEW
  • ZAP baseline scan vs tst (passive, non-blocking S1)    ← NEW
  • Auto-rollback on smoke failure                         ← NEW

Out of S1: integration tests, component tests, branded types,
property-based, mutation, load, nightly cross-browser.
```

## Acceptance Criteria

### Phase 1 — Smoke tagging

1. [ ] `@smoke` Playwright tag applied to **exactly these tests** (no more, no less — the smoke set must run in <2 min sharded):
   - `e2e/homepage.spec.ts` → "loads with correct title", "shows business name and tagline", "WhatsApp link is present and correct", "phone link is clickable", "services section renders all 5 services", "ITV section has calculate button", "chatbot FAB is visible" (7 tests)
   - `e2e/itv.spec.ts` → "Calcular mi ITV button reveals plate input" only (1 test)
   - `e2e/chatbot.spec.ts` → "FAB opens dialog with welcome message" only (1 test)
   - `e2e/chatbot-booking-golden-path.spec.ts` → the single golden-path test (1 test)
   - `e2e/v2-design.spec.ts` → "homepage renders in light theme", "footer landmarks present" only (2 tests)
   - **Total: 12 smoke tests**
2. [ ] All other E2E tests run in PR's E2E job too (full suite), but `@smoke` subset is a separate fast-fail job that gates the rest
3. [ ] `npx playwright test --grep @smoke` runs in <2 min on a single chromium worker; <45s sharded x4
4. [ ] Tag added via `test('name', { tag: '@smoke' }, async ({ page }) => {...})` syntax — Playwright native, no plugin

### Phase 2 — Enable PR E2E job (ci.yml)

5. [ ] `e2e` job in `.github/workflows/ci.yml` line ~80: `if: false` flipped to `if: true` (or removed entirely)
6. [ ] PR E2E runs in two stages: smoke first (fast-fail at <2 min), full chromium suite second (gated on smoke passing)
7. [ ] Both stages use the existing PB seed setup (`scripts/setup-pocketbase.sh`)
8. [ ] Sharding: 4 shards for full suite, 1 worker for smoke (smoke is small enough)
9. [ ] Browser cache reused across shards (already wired in ci.yml — verify)
10. [ ] Test report uploaded as artifact on every run; failure shows annotated trace
11. [ ] PR check status: "E2E / smoke" and "E2E / full" appear as separate required checks in branch protection (configure post-merge)

### Phase 3 — Static security in CI

12. [ ] **`npm audit --audit-level=high`** added to PR job — currently set at `--audit-level=critical` per `project_npm_audit_vulns.md` memory; raise to `high` once Resend transitive uuid CVE is patched upstream OR add `.npm-audit-ignore` with documented expiry. Decision must be made and noted in this spec before merge.
13. [ ] **Semgrep** GitHub Action wired with `p/owasp-top-ten` ruleset → fail PR on HIGH/CRITICAL
14. [ ] **Semgrep custom rules** in `.semgrep/` with three rules at minimum:
    - `pb-query-without-tenant-filter.yml` — flags `pb.collection().getList()` without a `tenantId` filter argument
    - `hardcoded-tenant-data.yml` — flags hardcoded city names, phone numbers, business names in `src/**/*.tsx`
    - `pii-in-console-log.yml` — flags `console.log` calls referencing `.email`, `.phone`, `.dni`
15. [ ] **TruffleHog** action runs on PR diff; finds zero secrets in `src/`, `clients/`, workflows
16. [ ] **gitleaks** runs in pre-commit hook (local) — `.gitleaks.toml` allows test fixtures, blocks everything else
17. [ ] **`schemas:sync --check`** flag added (or equivalent diff command) — fails PR if Zod schemas drift from PocketBase live schema
18. [ ] All four steps run in parallel within the PR job (no serial dependency)

### Phase 4 — Deploy-tst hardening

19. [ ] **Trivy** scan added to `deploy-tst.yml` BEFORE image push to GHCR — blocks on `HIGH`/`CRITICAL` OS/package CVEs
20. [ ] Trivy ignores `LOW`/`MEDIUM` (noise reduction); explicit allowlist in `.trivyignore` for documented exceptions
21. [ ] Smoke job in `deploy-tst.yml` (currently only `type-check`) extended: `type-check` → `npm test` → `npx playwright test --grep @smoke` against ephemeral PB → only THEN build image
22. [ ] If pre-build smoke fails: deploy aborts, no image push, GitHub deployment marked `failure`

### Phase 5 — Post-deploy verification + auto-rollback

23. [ ] New job `post-deploy-smoke` in `deploy-tst.yml`, runs AFTER SSH deploy completes
24. [ ] Job hits live `tst` URL (env-derived, NOT hardcoded) and runs `@smoke` tagged tests against it (chromium only, single worker, 5 min budget)
25. [ ] On failure, job triggers a rollback step that SSHes to tst server and re-deploys the previous image tag (last-known-good stored in deploy artifact)
26. [ ] Slack/email notification (or GitHub deployment status) flips to `failure` on rollback; on success, stays `success`
27. [ ] Rollback path tested at least once intentionally before this spec is closed (deliberate broken commit on a throwaway branch → verify rollback fires → revert)

### Phase 6 — DAST baseline (non-blocking S1, blocking S5)

28. [ ] **OWASP ZAP baseline scan** added to `deploy-tst.yml` after post-deploy smoke succeeds
29. [ ] Uses `zaproxy/action-baseline@v0.13.0` — passive scan only (no attack traffic against tst)
30. [ ] Target URL is the live tst URL (parameterised); active scan is forbidden against `pro` (workflow guards on environment name)
31. [ ] `.zap/rules.tsv` curated to suppress known-safe noise (X-Content-Type-Options on PNG assets, etc.) — initial pass, will be tuned over time
32. [ ] Sprint 1 setting: ZAP findings reported as artifact, **not blocking**. Sprint 5 will flip this to blocking once baseline is clean.
33. [ ] Active scan deferred to nightly workflow (out of S1)

### Phase 7 — Pre-commit hook expansion

34. [ ] Existing pre-commit hook (`type-check + unit tests` per `project_precommit_hook.md`) extended with:
    - `gitleaks protect --staged` (secret scan on staged files only — fast)
    - `lint-staged` running ESLint --fix + Prettier on changed files only
35. [ ] Pre-push hook (new) runs `npm run flows:validate` + `npx playwright test --grep @smoke` headless
36. [ ] Both hooks installed via Husky; documented in `docs/decisions/` ADR

### Phase 8 — Documentation + observability

37. [ ] `docs/qa-strategy.md` created — single-page authoritative reference matching the table-driven strategy from this conversation (test pyramid, gates per environment, tools, OWASP coverage map)
38. [ ] `docs/security/owasp-coverage.md` created — the OWASP Top 10 → tests matrix
39. [ ] `docs/adr/ADR-007-test-pyramid-and-gates.md` records the strategic decisions: TestContainers planned for S2, branded types planned for S2, post-deploy smoke + auto-rollback chosen over canary
40. [ ] `docs/adr/ADR-008-zap-self-hosted-in-actions.md` records why Option A (self-hosted ZAP in GitHub Actions) was chosen over managed DAST

## Constraints

- **No new test code** beyond tagging existing tests. If a smoke test reveals it isn't actually green, fix the test (mark as `@smoke` only after green), do NOT broaden scope.
- **No application code changes**. Branded types, integration tests, schema refactors are S2.
- **Active DAST scans run against `tst` ONLY**. The workflow must hard-fail if invoked against `pro` (env name guard).
- **Post-deploy rollback** uses the previous Docker image tag from GHCR — no DB rollback. DB schema changes that aren't backward-compatible are out of scope this sprint and must be flagged in their own FEAT.
- **Branch protection on `main`** must require: `ci/type-check`, `ci/unit`, `ci/lint`, `ci/e2e-smoke`, `ci/e2e-full`, `ci/semgrep`, `ci/trivy` (configured by repo admin after merge).
- **Tenant context**: Sprint 1 is single-tenant (AMG only). All workflow secrets and test fixtures use the AMG tenant; multi-tenant test isolation is S2.

## Out of Scope

- Branded types for `TenantId`, `Email`, `Phone` (S2)
- Integration tests against ephemeral PB via TestContainers (S2)
- Component tests with React Testing Library (S3)
- Storybook + visual regression (S3)
- Property-based testing with fast-check (S4)
- Mutation testing with Stryker (S4)
- Lighthouse CI + Web Vitals budgets (S5)
- Load testing with k6 (S5)
- Nightly cross-browser regression workflow (deferred — first nightly job is in S5)
- ESLint custom rules (S6 — Semgrep covers the highest-value patterns first)
- Penetration test / human pentest playbook (S6)
- Threat-model section in spec template (S6)
- React/Next CSP nonce hardening (post-MVP, tracked in FEAT-023)

## Test Cases (verification of this sprint's deliverables)

| Scenario | Input | Expected output |
|---|---|---|
| Happy PR | Open PR with passing code | All 7 PR checks green in <6 min; merge enabled |
| Broken smoke test | Push commit that breaks homepage title | PR check `ci/e2e-smoke` fails in <2 min; merge blocked |
| Broken full E2E | Push commit that breaks chatbot edge case | `ci/e2e-smoke` passes; `ci/e2e-full` fails; merge blocked |
| New transitive CVE (high) | Dependabot adds vulnerable dep | `ci/npm-audit` fails on PR |
| Hardcoded tenant data | PR adds `"Cartagena"` literal in `Hero.tsx` | `ci/semgrep` fails with custom rule violation |
| Cross-tenant query without filter | PR adds `pb.collection('bookings').getList()` | `ci/semgrep` fails with `pb-query-without-tenant-filter` rule |
| Committed `.env` value | PR contains `RESEND_API_KEY=re_xxx` | `ci/secret-scan` fails; pre-commit `gitleaks` would have caught locally |
| Trivy HIGH CVE in base image | Docker base image has unpatched HIGH | `deploy-tst` Trivy step fails; image not pushed |
| Pre-build smoke fails | Broken merge to main | Deploy aborts; no image swap on tst |
| Post-deploy smoke fails | Image deploys but live `/` returns 500 | Auto-rollback to previous image tag; deployment status = failure |
| ZAP finds non-blocking issue | Header missing on tst | Artifact uploaded; deployment still succeeds (S1 non-blocking) |

## Files to Touch

> Implementer fills line counts during planning.

### Workflows
- [ ] `.github/workflows/ci.yml` — flip `if: false` on E2E job; add Semgrep, gitleaks, schema-sync steps; split smoke vs full; raise audit level (with documented exception if needed)
- [ ] `.github/workflows/deploy-tst.yml` — add Trivy pre-push, full pre-build smoke, post-deploy smoke job, ZAP baseline job, rollback step
- [ ] `.github/workflows/secret-scan.yml` — new, runs TruffleHog on PR diffs

### Hooks + config
- [ ] `.husky/pre-commit` — extend with gitleaks + lint-staged
- [ ] `.husky/pre-push` — new, runs flows:validate + smoke tests
- [ ] `package.json` — add `husky`, `lint-staged`, `@playwright/test` tag scripts

### Tooling config
- [ ] `.semgrep/` directory — three custom rule files (see Phase 3)
- [ ] `.zap/rules.tsv` — initial passive-scan suppressions
- [ ] `.gitleaks.toml` — fixture allowlist, repo rules
- [ ] `.trivyignore` — documented HIGH exceptions (none expected at start; file exists empty)

### Test files (tagging only — no logic changes)
- [ ] `e2e/homepage.spec.ts` — add `@smoke` tags to 7 listed tests
- [ ] `e2e/itv.spec.ts` — tag 1 test
- [ ] `e2e/chatbot.spec.ts` — tag 1 test
- [ ] `e2e/chatbot-booking-golden-path.spec.ts` — tag 1 test
- [ ] `e2e/v2-design.spec.ts` — tag 2 tests

### Documentation
- [ ] `docs/qa-strategy.md` — new, master strategy doc
- [ ] `docs/security/owasp-coverage.md` — new, OWASP → tests matrix
- [ ] `docs/adr/ADR-007-test-pyramid-and-gates.md` — new
- [ ] `docs/adr/ADR-008-zap-self-hosted-in-actions.md` — new

## Dependencies (npm)

- `husky` (dev) — git hooks
- `lint-staged` (dev) — incremental lint
- `@playwright/test` — already installed; `tag` API is native

## Dependencies (GitHub Actions)

- `returntocorp/semgrep-action@v1` (or `semgrep/semgrep-action`) — pinned by SHA
- `aquasecurity/trivy-action@master` — pinned by SHA
- `trufflesecurity/trufflehog@main` — pinned by SHA
- `zaproxy/action-baseline@v0.13.0` — pinned by SHA
- `gitleaks/gitleaks-action@v2` — pinned by SHA

All actions pinned by SHA per FEAT-023 §A08 (Software & Data Integrity).

## Builder-Validator Checklist

> Validator fills this after implementation.

- [ ] All Playwright tags syntactically correct; `--grep @smoke` matches exactly 12 tests
- [ ] PR E2E job actually runs (no `if: false` left); smoke job blocks full job on failure
- [ ] Semgrep custom rules each have a known-bad fixture proving they fire
- [ ] Trivy scan tested against a deliberately-vulnerable base image at least once (then reverted)
- [ ] Auto-rollback drill executed end-to-end on a throwaway branch — evidence linked in PR
- [ ] No PII or tenant-specific values hardcoded in workflow files (URLs come from secrets/vars)
- [ ] All GitHub Actions pinned by SHA, not tag
- [ ] `.npm-audit-ignore` (if used) has explicit expiry date and CVE references
- [ ] ADR-007 and ADR-008 reviewed by user before close
- [ ] `docs/qa-strategy.md` matches the strategy table in this conversation (single source of truth)
- [ ] `npm run type-check` → zero
- [ ] `npm test` → all pass
- [ ] `npm run lint` → zero errors
- [ ] Pre-commit hook installs cleanly on a fresh clone (`npm ci && npx husky install`)

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Smoke test is slow on CI runner due to cold-start | Med | Cache browsers + node_modules; benchmark first run, tune shard count |
| Auto-rollback fires on flaky smoke (false positive) | Med | Smoke retries 1×; only rollback after both attempts fail |
| Semgrep false positives on legitimate code | High initially | Tune rules over first week; allowlist via inline comments with explanation |
| ZAP baseline noise overwhelms artifact | High initially | Curate `.zap/rules.tsv` aggressively in first run; treat as informational S1 |
| Trivy blocks deploy on un-patchable CVE in base image | Low | `.trivyignore` with documented exception + tracking issue |
| `npm audit --audit-level=high` blocks PRs day 1 (Resend uuid CVE) | High | Decision required: ship at `--audit-level=critical` until upstream patch (per memory `project_npm_audit_vulns.md`), document expiry |
| GitHub Actions minutes spike from sharded E2E | Low (within free tier headroom) | Monitor weekly; throttle shards if needed |

## Success criteria (sprint-close definition of done)

The sprint is closed only when:

1. A deliberately-broken PR (test failure, secret leak, hardcoded city, vulnerable dep) is rejected by the appropriate gate within 6 minutes — evidence committed as `docs/qa-reports/2026-XX-XX-sprint-1-gate-validation.md`
2. A clean PR merges in <6 min from green check appearance
3. A deliberate post-deploy break triggers auto-rollback within 8 min of detection — evidence in same QA report
4. ZAP baseline produces a clean report (artifact uploaded, no HIGH findings) on three consecutive deploys
5. ADR-007 and ADR-008 reviewed and accepted by user
6. `docs/qa-strategy.md` exists and is referenced from project CLAUDE.md

Once these six pass, FEAT-026 (Sprint 2: Branded Types + Integration Test Infra) opens.
