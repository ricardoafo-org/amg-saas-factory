---
title: ADR-005 — Testing Architecture & QA Pipeline Contract
status: proposed
revision: v2
date: 2026-04-28
supersedes: ADR-005 (v1, 2026-04-18 — preserved in git history)
authors: AMG Talleres
affects: All test code, CI/CD pipeline, every PR
---

# ADR-005 — Testing Architecture & QA Pipeline Contract (v2)

## Goals

This ADR is the **single source of truth** for "is this code good enough to ship?".

AMG Talleres has no dedicated QA team. The dev team is one person (ricardoafo) with AI-pair-programming assistance. There will be no human QA hand-off, no exploratory test session by another engineer, no manual regression sweep before release. **Automation IS the QA team.** Every gate that would normally be a human's job is automated, has measurable thresholds, and is documented here.

Three guiding principles flow from this:

1. **Every gate has a measurable threshold AND an explicit bypass path.** No silent failure. No undocumented escape hatch. If a gate cannot be objectively decided, it is not a gate.
2. **Every layer of the test pyramid has a single owner who maintains it.** Today that's "ricardoafo with Claude". When a 2nd dev joins, ownership is split per ADR-016 (governance) §8.
3. **Tests document intent in production.** A reader of `tests/` should know what the system is supposed to do without reading `src/`. Tests are the spec.

---

## 1. Test pyramid

Five layers, ordered cheapest → most expensive:

| Layer | Target distribution | Speed/test | Owner | Where |
|---|---|---|---|---|
| **L1: Unit** | ~70% of tests | ms | dev | `src/**/*.test.{ts,tsx}` |
| **L2: Integration** | ~20% | s | dev | `tests/{db,api}/*.integration.test.ts` |
| **L3: E2E** | ~7% | s-min | dev | `tests/e2e/*.spec.ts` |
| **L4: API Contract** | ~2% | s | dev | `tests/api/*.contract.test.ts` |
| **L5: Visual Regression** | ~1% | s | dev | `tests/e2e/visual-*.spec.ts` |

**Pyramid violation policy:** if E2E count exceeds 15% of total test count, that's a smell — push the logic into integration or unit tests. Reverse holds for unit tests doing integration work (mocking PB instead of using real instance).

---

## 2. Per-layer policies

### 2.1 L1 — Unit tests

| Aspect | Policy |
|---|---|
| **Tool** | Vitest + jsdom + React Testing Library |
| **Pattern** | Arrange-Act-Assert; one assertion concept per test |
| **Scope** | Pure functions + React component shapes; NO PB calls, NO network |
| **Owner** | Dev (TDD) |
| **When it runs** | Pre-commit hook (`npm test`); PR CI (`unit-tests` job); merge queue |
| **Isolation** | None needed (no shared state) |
| **Coverage threshold** | **80% lines / 75% branches** on `src/**` (excluding `**/__tests__/**`, `**/*.config.ts`). Enforced via `vitest --coverage` in `unit-tests` job. **Below threshold = build red.** |
| **Speed budget** | ≤30s for full suite. Currently 8s for 570 tests. |
| **Flake budget** | 0%. Unit tests are deterministic by construction. Any flake = bug in test or test infra; quarantine + fix immediately. |

**Rationale for 80% (not 90% per v1):** 90% target on `src/**` includes UI components where the marginal coverage point is React render-tree branches with limited bug-catching value. 80% lines + 75% branches captures the same business-logic risk at lower maintenance burden. Critical paths (`src/actions/**`, `src/lib/auth.ts`, `src/lib/tenant.ts`) carry implicit 100% target via integration tests.

### 2.2 L2 — Integration tests

| Aspect | Policy |
|---|---|
| **Tool** | Vitest (node env) + real PocketBase container |
| **Pattern** | Setup tenant → exercise server action → assert PB state → cleanup |
| **Scope** | Every server action × valid + invalid + cross-tenant rejection cases. Schema contract checks. Tenant isolation probes. |
| **Owner** | Dev |
| **When it runs** | **PR CI** (`integration-tests` job — NEW in PR 1) AND post-deploy (`schema-contract-tst` job, against deployed PB) |
| **Isolation** | Mostly isolated (each test owns its tenant). Shared scenarios: multi-booking same customer, concurrent booking conflicts, cross-tenant probes. |
| **Cleanup** | `afterEach` MUST delete tenant + cascaded data. Test that leaks data fails the suite. |
| **Coverage threshold** | **100% of server actions in `src/actions/**`** must have ≥1 valid + ≥1 invalid + (where applicable) ≥1 cross-tenant rejection case. Enforced via a meta-test that lists actions and matches against test descriptions. |
| **Speed budget** | ≤2 min for PR-time run. Sharding allowed if exceeded. |
| **Flake budget** | <2% (re-runs allowed). Any flake → quarantine + investigate within 48h. |
| **Mocking policy** | **NEVER mock PocketBase.** Per BUG-003 incident (2026-04-26 SEV-1 root cause: tests with mocked PB stayed green while live PB schema was empty). External APIs (Twilio, Resend, Anthropic) MAY be mocked at this layer; contract tests (L4) verify mock fidelity. |

### 2.3 L3 — E2E tests

| Aspect | Policy |
|---|---|
| **Tool** | Playwright |
| **Pattern** | Page Object Model. Selectors via `data-testid` only (no CSS / text). |
| **Scope** | All happy paths + key error paths for customer + admin flows. Cookie consent. LOPDGDD consent ordering. Booking, quote, multi-service, presupuesto, ITV, admin login, admin today/quotes/customers/calendar. |
| **Owner** | Dev |
| **When it runs** | **PR CI** (`e2e-smoke` job — sharded 4 ways against `npm run dev`). Post-deploy (`smoke-tst` job — Playwright against deployed URL). |
| **Viewports** | Desktop Chrome (1280×720) + Mobile Chromium (Pixel 5 viewport). **Both shards run in PR CI.** |
| **Network throttling** | 3G profile on mobile shard (rural shop reality). |
| **Browser coverage** | Chromium-only PR-time. Firefox + WebKit run weekly via cron, NOT PR-blocking (cost vs benefit). |
| **Coverage threshold** | All routes documented in `src/app/**` MUST have ≥1 E2E spec touching them. Enforced via meta-test that diffs route tree against spec coverage. |
| **Speed budget** | ≤8 min for full PR-time run (sharded). Each shard ≤2 min. |
| **Flake budget** | <5% — Playwright `retries: 2`. Any spec flaking >2× in 2 weeks → auto-quarantine + investigation. |

### 2.4 L4 — API contract tests

| Aspect | Policy |
|---|---|
| **Tool** | Vitest (node env). Calls real external APIs via probe (no mocks at this layer). |
| **Pattern** | One file per external dependency: `tests/api/{twilio,resend,anthropic,pocketbase}.contract.test.ts`. Sends a minimal real request, asserts response shape against the schema we use in code. |
| **Scope** | Verifies that mocks used at L2 still match real API behavior. Detects external API breaking changes early. |
| **Owner** | Dev |
| **When it runs** | **Weekly cron** (`contract-tests-cron.yml`) — NOT PR-blocking. Posts a GitHub Issue if any contract drifts. |
| **Cost** | Each run consumes 1 SMS, 1 email, 1 Anthropic message, ~10 PB requests. Acceptable monthly spend (~€0.05). |
| **Coverage threshold** | 100% of external APIs we depend on. Currently: 4 (Twilio, Resend, Anthropic, PocketBase REST). |
| **Flake budget** | <10% — external network can blip. Auto-retry 1× before issue creation. |

### 2.5 L5 — Visual regression tests

| Aspect | Policy |
|---|---|
| **Tool** | Playwright `toHaveScreenshot()` with thresholds |
| **Pattern** | Capture screenshot of stable element → compare against baseline → fail if pixel diff >0.1% (configurable). |
| **Scope** | Hero, ServiceGrid, ChatEngine widget closed/open states, Email render, Admin Today panel, Admin Calendar. Locked list — adding routes requires ADR amendment. |
| **Owner** | Dev (baseline approval) |
| **When it runs** | **PR CI** post-build, against deployed preview-URL or local `npm run dev` (TBD per FEAT-055 cutover plan). |
| **Approval workflow** | Diff above threshold → CI red → human reviews → if intentional, run `npx playwright test --update-snapshots` locally → commit new baseline → merge. New baseline lives in `tests/e2e/__screenshots__/` in git. |
| **Coverage threshold** | The locked list above. Adding/removing requires ADR change. |
| **Flake budget** | <3% — fonts, animations, async loading can flake. Mitigations: `await page.waitForLoadState('networkidle')`, disable animations via CSS, use `mask` for dynamic regions. |
| **Status today** | NOT IMPLEMENTED. Planned for FEAT-055 (Week 5 cutover). |

---

## 3. Cross-cutting quality dimensions

### 3.1 Accessibility (a11y)

| Aspect | Policy |
|---|---|
| **Standard** | **WCAG 2.1 Level AA** as best-practice target |
| **Legal status** | AMG is **EAA-EXEMPT** as a microenterprise (<10 employees AND <€2M turnover, autónomo, services-only). Per Spain's Ley 11/2023 (EAA transposition) microenterprise carve-out, AMG is automatically exempt from service-related accessibility legal requirements. **WCAG 2.1 AA is therefore best practice, not legal mandate.** Verified 2026-04-28 with user-confirmed AMG sizing data + web research; see `project_amg_legal_status_eaa_exempt.md`. **Threshold-watch:** if AMG grows past 10 employees OR €2M turnover, exemption stops and this status MUST be re-verified. |
| **Why we still aim for it** | (1) Accessible design helps non-disabled users too (keyboard nav, color contrast, semantic markup, screen-resize tolerance); (2) future-proofs against AMG growing past microenterprise threshold; (3) better SEO; (4) signals quality to customers; (5) trivial cost when baked into the design system. |
| **Automated coverage** | `@axe-core/playwright` integrated into all E2E specs touching customer-facing routes. Asserts zero violations of "serious" and "critical" severity per axe rules. ~40-50% of WCAG 2.1 AA criteria caught by axe. |
| **Manual coverage** | Quarterly self-audit using NVDA + keyboard-only navigation on top 5 customer flows. Audit checklist in `docs/runbooks/a11y-audit.md`. |
| **When it runs** | Automated: every PR via `e2e-smoke`. Manual: quarterly cron creates a GitHub Issue. |
| **Fail action** | Automated violation → CI red (treated as a quality regression, not a legal violation). Manual finding → SEV-3 bug per severity rubric (or SEV-1 if blocks customer flow). |
| **Status today** | NOT IMPLEMENTED. Planned in PR 3 (post PR 1 + PR 2). |

### 3.2 Performance

| Aspect | Policy |
|---|---|
| **Targets** | LCP ≤2.5s p75, FID/INP ≤200ms p75, CLS ≤0.1 p75. Bundle size: initial JS ≤200KB gzipped per route. |
| **Tool** | Lighthouse CI (`@lhci/cli`) configured against tst-deployed URL post-deploy. Bundle size: `size-limit` PR-time. |
| **Coverage** | LCP/INP/CLS measured on `/`, `/cita`, `/cuenta` (when added). Bundle size on every entry point. |
| **When it runs** | Lighthouse CI: post-deploy on tst (NEW job `lighthouse-tst`). Bundle size: PR CI (NEW job `bundle-size`). |
| **Fail action** | Below threshold → CI red. Configurable warning band (10% degradation) before red. |
| **Status today** | NOT IMPLEMENTED. Planned in PR 3. |

### 3.3 Security

| Aspect | Policy |
|---|---|
| **Threat model** | Tenant isolation (S1-S2 from severity rubric), filter injection (S4), prompt injection in chatbot (S5), secrets leak (S6, S9), auth bypass (S7), LOPDGDD violations (S3, F2, F12). |
| **Static analysis (SAST)** | Semgrep (free tier, OSS rule packs) — runs PR-time on `src/**`. Catches injection, hardcoded secrets, dangerous patterns. NEW job `sast` (PR 3). |
| **Dependency scanning** | `npm audit` PR-time at `--audit-level=critical` (current — raise to `high` once Resend resolves svix→uuid CVE chain per `project_npm_audit_vulns.md`). Dependabot weekly + security updates auto-opened. |
| **Secret scanning** | GitHub native secret scanning + push protection (per ADR-015 §7). Detects secrets at commit time. |
| **Tenant isolation** | Schema contract test (`tests/db/schema-contract.integration.test.ts`) + live cross-tenant probe (`tests/db/tenant-isolation-live.integration.test.ts`). Both run PR-time + post-deploy. |
| **Filter injection** | Unit test (`src/actions/__tests__/filter-injection-contract.test.ts`) — already in `unit-tests` job. |
| **Prompt injection** | E2E test on chatbot widget — adversarial prompts in customer name field, free-text message field. (Currently NOT implemented — SEV-2 gap, prioritize in PR 3.) |
| **When it runs** | npm audit + filter injection: PR CI. Secret scanning: GitHub-managed continuous. SAST: PR CI (PR 3). Tenant isolation: PR CI + post-deploy. Prompt injection: PR CI E2E (PR 3). |
| **Fail action** | Any SAST "critical" or `npm audit` critical-severity → CI red. Tenant isolation probe failure → SEV-1 immediate. |

### 3.4 Internationalization (i18n)

| Aspect | Policy |
|---|---|
| **Supported language** | Castilian Spanish only (per `feedback_castilian_spanish.md`). |
| **Forbidden** | Rioplatense Spanish (vos, querés, etc.) in any product copy. Personality voseo OK in dev dialogue / commit messages, NEVER in shipping copy. |
| **Automated check** | Lint rule `no-rioplatense-copy` — regex match list (`vos`, `tenés`, `querés`, `che`, `boludo`, `auto/coche` mismatch, `computadora/ordenador` mismatch) against `**/*.{tsx,ts}` excluding `**/test/**` and `**/__tests__/**`. Runs in `lint` job. |
| **When it runs** | PR CI (lint). |
| **Fail action** | Match → CI red with link to feedback memory. |
| **Status today** | NOT IMPLEMENTED as automated lint rule (rule is in memory, not enforced in code). Planned in PR 3. |

---

## 4. Quality gates inventory

The complete matrix of every gate, where it runs, what it blocks, and how to bypass.

| # | Gate | Runs | Layer | Threshold | Blocks | Bypass path |
|---|---|---|---|---|---|---|
| 1 | TypeScript type-check | PR + pre-commit | All | Zero errors | Merge | None (must fix) |
| 2 | ESLint | PR | All | Zero warnings | Merge | None (must fix or `// eslint-disable-next-line` with comment) |
| 3 | Unit tests (Vitest) | PR + pre-commit | L1 | 100% pass | Merge | None |
| 4 | Unit coverage | PR | L1 | ≥80% lines, ≥75% branches | Merge | Drop in coverage allowed if test added (ratchet logic) |
| 5 | Integration tests | PR (NEW) | L2 | 100% pass | Merge | None |
| 6 | E2E smoke (chromium desktop) | PR | L3 | 100% pass, ≤2 min/shard | Merge | None |
| 7 | E2E smoke (mobile) | PR | L3 | 100% pass | Merge | None |
| 8 | E2E admin | PR | L3 | 100% pass | Merge | Currently `if: false` per FEAT-053 — re-enable when admin login fixed |
| 9 | Visual regression | PR (post-FEAT-055) | L5 | <0.1% pixel diff | Merge | Approve new baseline + commit |
| 10 | Bundle size | PR (PR 3) | Cross | ≤200KB initial JS gzip per route | Merge | Justify in PR description, mark `bundle-size-bypass` label |
| 11 | a11y (axe-core) | PR (PR 3) | Cross | Zero serious/critical violations | Merge | Mark element with `axe-ignore` + open issue + reviewer override |
| 12 | SAST (Semgrep) | PR (PR 3) | Cross | Zero critical findings | Merge | Triage as false positive in `.semgrepignore` (reviewer required) |
| 13 | npm audit | PR | Cross | No critical vulns | Merge | Add to `audit-ignore` with linked issue (review weekly) |
| 14 | Secret scanning (push protection) | Pre-push | Cross | Zero secrets detected | Push | Cannot bypass (GitHub blocks at wire) |
| 15 | Lint flow JSON | PR | All | Schema valid | Merge | None |
| 16 | Security gate (regex patterns) | PR | Cross | Zero forbidden patterns | Merge | Comment justification + reviewer approval |
| 17 | PR template check | PR | Cross | Required sections present | Merge | None (must fill in) |
| 18 | Test deletion guard | PR | Cross | No deleted tests without spec | Merge | Add justification in `<spec>` block of PR body |
| 19 | Build (next-build) | PR | All | Build succeeds | Merge | None |
| 20 | Smoke (Playwright vs deployed) | Post-deploy | L3 | 100% pass | Next merge | Manual override + open SEV issue |
| 21 | Schema contract (vitest vs deployed PB) | Post-deploy | L2 | 100% pass | Next merge | Manual override + SEV |
| 22 | Lighthouse CI | Post-deploy (PR 3) | Cross | LCP ≤2.5s p75, others per §3.2 | Next merge | Justify in PR; tighten budget incrementally |
| 23 | Health check (deployed) | Post-deploy | All | `/api/health` 200 + commit match | Next merge | None — failure = automatic rollback |
| 24 | Confirm-tst (aggregator) | Post-deploy | All | All upstream gates green | Next merge | None |
| 25 | API contract tests | Weekly cron | L4 | 100% match | Issue auto-filed | Triage + resolve drift |

**Bypass audit:** every bypass usage is logged in PR description (#16, #18) or via labels (#10, #11). Quarterly review of all bypasses to detect "always bypassed" gates that should be downgraded or removed.

---

## 5. Test data management

- **Factories over fixtures.** Each test creates its own tenant via `seed-tenant.ts`-style helper, then deletes in `afterEach`. No shared global state.
- **PII rules:** test data uses `*.example.test` emails, `+346000000XX` phone numbers, customer names from a fixed list (`Ana Test`, `Juan Test`, etc.). NO real customer data, NO production exports, NO names from real Spain auto-shop records.
- **Tenant isolation:** every integration / E2E test seeds its own tenant with a `test-iso-${Date.now()}` slug. Cleanup in `afterEach` deletes the tenant and cascades to all child rows.
- **No prod data in any test ever.** Lint rule `no-prod-data-in-tests` (PR 3) scans for likely-real emails (gmail.com without `+test`), real phone prefixes, etc.

---

## 6. Flakiness policy

| Layer | Flake budget | Action on flake |
|---|---|---|
| L1 Unit | 0% | Quarantine + fix immediately. Unit tests are deterministic by construction. |
| L2 Integration | <2% | First flake: re-run. Second flake in 7 days: quarantine via `it.skip` + open `BUG-flake-XXX` issue + linked test name in `tests/QUARANTINE.md`. |
| L3 E2E | <5% | `retries: 2` in Playwright config absorbs network blips. Beyond that: same quarantine flow as L2. |
| L4 Contract | <10% | External API blips expected. Auto-retry 1× before issue creation. |
| L5 Visual | <3% | Fonts, animations, async = common flake sources. Mitigations: stable selectors, `waitForLoadState('networkidle')`, animation disable, `mask` for dynamic regions. |

**Quarantine SLA:** quarantined test must be either fixed or deleted (with spec change per #18) within 14 days. Quarterly audit of `tests/QUARANTINE.md` to enforce.

**Flake budget enforcement:** weekly cron job (`flake-tracker.yml`) parses last 7 days of CI runs, computes flake rate per spec, posts to GitHub Issue if any spec exceeds budget.

---

## 7. Test review policy

- **New code path requires test in same PR.** Enforced by `test-deletion-guard` (existing) + new job `test-coverage-on-new-code` (PR 3) that asserts every new function in `src/**` is covered by ≥1 test in `tests/**` or `src/**/__tests__/**`.
- **Tests-only PRs allowed.** Type `test` (commit prefix `test:`) — bypass requirements that don't apply (e.g., spec deviations).
- **Test deletions require justification.** Existing `test-deletion-guard` enforces. Bypass path: add `<spec>` block in PR body justifying deletion (e.g., "test obsolete after refactor; coverage moved to X").
- **Test review is mandatory.** Reviewer (ricardoafo) reviews test changes with the same rigor as production code. Bad tests are worse than no tests (false confidence).

---

## 8. Tools registry

| Tool | Version | Purpose | Why this over alternatives |
|---|---|---|---|
| Vitest | ^3.1.3 | Unit + integration | Faster than Jest, native ESM, native TS, identical API |
| @vitejs/plugin-react | ^4 | React component test env | Standard with Vite |
| jsdom | bundled | DOM env for React tests | Faster than puppeteer/playwright for non-interactive component tests |
| Playwright | ^1.x | E2E + smoke + visual | First-party browser support; faster + more reliable than Cypress at scale |
| @playwright/test | ^1.x | Playwright runner | Bundled |
| @axe-core/playwright | ^4 (PR 3) | a11y assertions | Industry-standard accessibility engine |
| @lhci/cli | ^0.13 (PR 3) | Lighthouse CI for perf | Native CWV integration; runs in CI |
| size-limit | ^11 (PR 3) | Bundle size budget | Plugin for Next.js exists; budget per entry point |
| Semgrep | ^1.x (PR 3) | SAST | Free tier, OSS rule packs cover OWASP top 10, no GHAS dependency |
| GitHub Secret Scanning | native | Secret detection | Free for private repos as of 2024; push protection too |
| Dependabot | native | Dep updates + security | Free, integrated, supports grouping (config in `dependabot.yml`) |

**Locked versions** in `package.json` (and Dockerfile + `actions/setup-node` GH action). Upgrade is a deliberate PR per `Future improvement #9 in ADR-015` (single canonical pin location).

---

## 9. Compliance mapping

| Regulation | Requirement | Tested via | Layer |
|---|---|---|---|
| **LOPDGDD / GDPR** | Cookie consent before any analytics fires | E2E cookie-banner.spec.ts | L3 |
| LOPDGDD / GDPR | `consent_log.create()` BEFORE any other personal-data write (rubric F2) | Integration test (`tests/db/consent-ordering.integration.test.ts` — to be added) | L2 |
| LOPDGDD / GDPR | Right of access (data export endpoint) | E2E + integration | L2+L3 |
| LOPDGDD / GDPR | Right of erasure (account deletion anonymizes appointments, keeps invoice records per tax law) | Integration | L2 |
| LOPDGDD / GDPR | Cross-tenant PII leak prevention (rubric S1) | Tenant isolation contract + live probe | L1 + L2 |
| LOPDGDD / GDPR | No PII in logs (rubric S8) | Unit test (`src/actions/__tests__/chatbot.test.ts` "sanitizes error...") | L1 |
| **RD 1457/1986** | Quote/invoice IVA breakdown present (rubric F1) | Component test (`src/core/components/__tests__/service-grid-iva.test.ts`) | L1 |
| RD 1457/1986 | Warranty terms (3 mo / 2,000 km min) displayed (rubric F3) | E2E + component test | L1 + L3 |
| **EAA / WCAG 2.1 AA** | Best practice (AMG is microenterprise-exempt per Ley 11/2023) | axe-core integrated into E2E specs (PR 3); quarterly manual audit | L3 + manual |
| **Severity rubric** | Every SEV-1 path has a test annotated with the rubric row | Linter check on test files (`// SEV-1: <row>` comment present) | All |
| **PocketBase tenant_id** | Every PB query scoped by tenant_id (rubric S2) | Integration tests + grep-based security gate | L2 + L1 |

**EAA legal status verified 2026-04-28:** AMG is microenterprise-exempt per Spain's Ley 11/2023 (autónomo, <5 emp, <€2M turnover, services-only). WCAG 2.1 AA stays as best practice (per §3.1). If AMG grows past microenterprise threshold, re-verify and re-classify. Source: `project_amg_legal_status_eaa_exempt.md`.

---

## 10. DORA metrics tracking

Four classic + one 2025-added metric.

| Metric | Definition | Target (Elite) | Current (estimated) | Tracking source |
|---|---|---|---|---|
| Deployment frequency | Pushes to main → tst deploy | Multiple/day | ~5/week | GitHub Deployments API |
| Lead time for changes | First commit on a branch → merged + deployed | <1h | ~2-8h | GitHub PR API + Deployments |
| Change failure rate | Deployments resulting in incident | 0-15% | Unknown (≥5% est. given recent SEV-1) | Manual labeling: PRs with `caused-incident` label |
| Failed deployment recovery time | Time from failed deploy → restored | <1h | Recent SEV-1: ~hours | Manual: time between `caused-incident` PR merged and revert/fix merged |
| Rework rate (added 2025) | % of work that's reactive (bug fix vs planned feature) | <30% | Unknown | Label-based: `type:fix` PRs / total merged PRs over rolling 30d |

**Implementation:** simple weekly cron (`dora-metrics.yml`) hitting GitHub API, computing values, posting to GitHub Issue or to a static SVG widget on README. Alert thresholds:
- Change failure rate >20% in rolling 30d → manual review
- Failed deploy recovery time >24h on any incident → post-mortem required (existing `docs/bugs/wip-BUG-XXX-*.md` template)
- Rework rate >50% in rolling 30d → architectural review (probably scope creep or test debt)

**Status today:** NOT IMPLEMENTED. Planned in PR 4 (separate from QA work).

---

## 11. Local dev feedback loop

| Stage | Hook | Runs | Cost |
|---|---|---|---|
| **Save** | Editor (VS Code) | Vitest watch mode + ESLint inline | <1s per save |
| **Pre-commit** | Git hook | `npm run type-check && npm test` (existing) | ~10-15s |
| **Pre-push** | Git hook (PR 3) | `npm run lint && npm run flows:validate` | ~10-20s |
| **PR open** | GitHub Actions | Full CI matrix | ~3-5 min |
| **Merge** | GitHub Actions | CD pipeline + post-deploy gates | ~5-7 min |

**Editor integrations recommended:**
- Vitest VS Code extension — green/red gutter icons
- ESLint VS Code extension — autofix on save
- Playwright VS Code extension — record + replay specs
- TypeScript Error Translator — friendlier error messages

---

## 12. Failure & bypass protocol

When a gate fails, the response depends on the failure type:

| Failure type | Response | Audit |
|---|---|---|
| **Test bug** (test wrong, code right) | Fix test in same PR; commit `test: fix XYZ` | Reviewer flags pattern if recurrent |
| **Code bug** (test right, code wrong) | Fix code in same PR; do NOT change test to make it pass | Reviewer must approve test changes |
| **Infra blip** (network, runner) | Re-run job. If 3rd consecutive: open issue, treat as test infra problem | Track in `tests/QUARANTINE.md` |
| **Genuine false positive** (e.g., axe rule on third-party widget) | Add to ignore file (`.semgrepignore`, `.axe-ignore.json`) with comment + linked issue | Reviewer must approve ignore files; quarterly audit |
| **Schedule pressure** ("must merge today") | NOT a valid bypass. Either fix the gate failure or revert the change. Period. | If bypassed via admin-merge: post-mortem in `docs/bugs/wip-BUG-XXX-*.md` |

**No "schedule pressure" bypass.** That's how teams accumulate test debt and ship the next SEV-1. The merge queue + admin-bypass exists ONLY for emergency hotfixes (already broken in prod) and is auditable.

---

## 13. What we do NOT test

Explicit non-goals (so we don't drift into testing them later without a decision):

- **Load testing / stress testing.** AMG serves a single auto-shop with <100 customers/day. Load is not a constraint.
- **Third-party SDK internals.** We assume Resend, Twilio, Anthropic SDKs are correct. Contract tests (L4) verify our usage; we don't test their library.
- **PocketBase internals.** Same — we test our usage via integration tests, not PB's correctness.
- **Browser quirks beyond Chromium + WebKit.** No IE, no legacy Edge.
- **Multi-region failover.** Single VPS today. Multi-region is a future epic.
- **Chaos / fault injection.** Overkill at our scale.
- **Production data scenarios.** Tests use synthetic data; we never replay prod data in tests.

If any of the above becomes a need, that's an ADR amendment, not a quiet expansion.

---

## 14. Implementation roadmap

Maps every section above to current state and target milestone.

| Section / Gate | Current state | Target milestone |
|---|---|---|
| L1 Unit (570 tests, 8s) | ✓ Implemented; coverage NOT enforced | Add `--coverage` threshold in PR 1 |
| L2 Integration (PR-time) | ⚠️ Tests exist, NOT in PR CI | New `integration-tests` job in PR 1 |
| L2 Integration (post-deploy) | ✓ via schema-contract-tst (PR 1) | Implemented in PR 1 |
| L3 E2E PR-time (chromium desktop, sharded) | ✓ Implemented | — |
| L3 E2E PR-time (mobile shard) | ❌ Missing | PR 3 |
| L3 E2E admin (`if: false`) | ⚠️ Disabled per FEAT-053 | Re-enable in PR after admin login fix |
| L3 E2E post-deploy smoke | ✓ via smoke-tst (PR 1) | Implemented in PR 1 |
| L4 Contract tests (Twilio/Resend/Anthropic/PB) | ❌ Empty `tests/api/` | PR 3 + weekly cron |
| L5 Visual regression | ❌ Not implemented | FEAT-055 cutover (Week 5) |
| §3.1 a11y (axe-core in E2E) | ❌ Missing | PR 3 |
| §3.1 a11y manual audit | ❌ Process undefined | PR 3 — add `docs/runbooks/a11y-audit.md` |
| §3.2 Lighthouse CI | ❌ Missing | PR 3 |
| §3.2 Bundle size budget | ❌ Missing | PR 3 |
| §3.3 SAST (Semgrep) | ❌ Missing | PR 3 |
| §3.3 npm audit | ✓ at critical level | Raise to high after svix→uuid fix (per `project_npm_audit_vulns.md`) |
| §3.3 Secret scanning + push protection | ❌ Disabled today | Enable in PR 1 (admin toggles) |
| §3.3 Tenant isolation contract | ✓ Implemented | — |
| §3.3 Tenant isolation live probe | ✓ Implemented | — |
| §3.3 Prompt injection E2E | ❌ Missing | PR 3 |
| §3.4 Castilian Spanish lint | ⚠️ In memory, not enforced | PR 3 (custom ESLint rule) |
| §6 Flakiness budget enforcement | ❌ Manual | PR 4 (`flake-tracker.yml` cron) |
| §7 Test deletion guard | ✓ Implemented | — |
| §7 New-code-needs-test enforcement | ❌ Manual | PR 3 (`test-coverage-on-new-code` job) |
| §10 DORA metrics tracking | ❌ Missing | PR 4 |
| §11 Pre-push hook | ❌ Missing | PR 3 |

**Sequence:** PR 1 (CD-wiring + governance) → PR 2 (pre-pro env) → PR 3 (QA expansion: a11y/perf/SAST/contract tests/mobile shard) → PR 4 (operational: flakiness + DORA + pre-push). Each PR ratchets the bar without trying to land everything at once.

---

## 15. Review trigger

Revisit this ADR when:

- A 2nd developer joins (ownership splits, code review staffing, CODEOWNERS routing).
- Repo visibility changes (public → free GHAS unlocks CodeQL).
- AMG legal review confirms or refutes EAA exemption.
- A SEV-1 incident reveals a missing gate (post-mortem must propose ADR amendment).
- Three consecutive flake-tracker reports show a layer's budget exceeded.
- Major framework upgrade (Next.js major, React major, Playwright major).
- DORA metrics show change failure rate >20% rolling 30d.
- The "Implementation roadmap" §14 reaches 100% green (write a celebratory commit and add a new bar).

---

## Consequences

**Positive:**
- Single source of truth for "is this good enough" — no more recurring "did we cover X?" conversations.
- Compliance-ready: gaps are visible, dated, and have owners.
- Maintainable solo: every gate is automated, every threshold measurable.
- Onboarding-ready: a 2nd dev (or AI agent) reads this once and knows the QA system.
- Failures are loud: no silent flake, no silent regression, no silent compliance drift.

**Negative / tradeoffs:**
- Document length is high — must be maintained as practices evolve.
- Some gates (Lighthouse, axe) add CI minutes; covered in ADR-015 §6 (Dependency management cost analysis).
- Visual regression has a high false-positive rate; baseline-approval workflow is essential to keep it useful.
- a11y manual audits require quarterly time investment.

**Neutral:**
- Does NOT slow feature work; gates only fire on bad code.
- Does NOT mandate testing trivial code (UI render trivia, etc.).

---

## Alternatives Considered

| Option | Rejected because |
|---|---|
| Mock PocketBase in integration tests | BUG-003 / 2026-04-26 SEV-1 — mocks can stay green while real PB is broken |
| 90% unit coverage target | Marginal coverage points cost more than they catch; 80% lines + 75% branches captures the same business risk |
| GHAS CodeQL for SAST | License cost not justified at current scale; Semgrep free tier covers OWASP top 10 |
| One mega-spec per route in E2E | Unmaintainable; sharded chromium + targeted POM keeps specs <50 lines each |
| No flake budget (zero tolerance) | Flake budget = 0 is unrealistic for E2E; tighter budgets at L1/L2 do the work |
| Visual regression via Percy/Chromatic | Cost; Playwright native is sufficient at our scale |
| All gates blocking always | Gates with no bypass path become CI-rage rather than quality tools; explicit bypasses are healthier |
| QA gate exemption for "urgent fixes" | That's how SEV-1s ship; no schedule-pressure bypass |

---

## References

External (per ADR-015 §15 sources, fetched 2026-04-28):
- [Total Shift Left — Automated Testing in CI/CD: Complete Guide for DevOps Teams (2026)](https://totalshiftleft.ai/blog/automated-testing-in-ci-cd) — pyramid 70/20/10 ratios
- [Tekrecruiter — Top 10 CI/CD Pipeline Best Practices for Engineering Leaders in 2026](https://www.tekrecruiter.com/post/top-10-ci-cd-pipeline-best-practices-for-engineering-leaders-in-2026)
- [Testomat — Testing Pyramid 2026](https://testomat.io/blog/testing-pyramid-role-in-modern-software-testing-strategies/)
- [DX — DORA Metrics Complete Guide](https://getdx.com/blog/dora-metrics/) — Elite 0-15% CFR
- [Gitrecap — DORA Metrics Benchmarks 2026](https://www.gitrecap.com/blog/dora-metrics-benchmarks)
- [Sauce Labs — 20 Best Visual Regression Testing Tools of 2026](https://saucelabs.com/resources/blog/comparing-the-20-best-visual-testing-tools-of-2026)
- [ContextQA — WCAG Compliance for QA](https://contextqa.com/blog/what-is-accessibility-testing-wcag-compliance/) — EAA, WCAG 2.1 AA, automated 40-50% coverage
- [QATestLab — Software Quality Trends in 2026](https://blog.qatestlab.com/2025/12/24/software-quality-trends-in-2026-key-changes-shaping-modern-qa/)
- [Thinksys — QA Trends Report 2026](https://thinksys.com/qa-testing/qa-trends-report-2026/)
- European Accessibility Act (Directive 2019/882); Spain's transposition (Real Decreto-ley 6/2023)

AMG-internal:
- ADR-005 v1 (2026-04-18, this revision supersedes) — original 5-layer pyramid framing preserved
- ADR-015 (governance) — §2 Quality gates references this ADR
- `docs/contracts/severity-rubric.md` — severity assignment + axis mapping
- `feedback_castilian_spanish.md`, `feedback_aidlc_testing.md`, `project_npm_audit_vulns.md`, `project_environments.md`
- BUG-003 — mock/prod divergence root cause (the test-against-real-PB rule's origin)
