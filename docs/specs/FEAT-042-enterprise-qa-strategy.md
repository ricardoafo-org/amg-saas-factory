# FEAT-042 — Enterprise QA Strategy (Multi-Layer)

> Status: DRAFT — awaiting review before implementation.
> Builds on: FEAT-041 (test pyramid manifesto). Where FEAT-041 defined *what layers*, this spec defines *what tooling, what folders, what gates* — and extends coverage beyond browser/unit into API, DB, real-device, security, and performance.

## Intent

The current test suite is browser-and-unit only. We have ~359 Vitest tests, a Playwright smoke suite, and zero coverage for: REST API contracts hit directly, PocketBase schema integration, real Android Chrome, automated security scanning (SAST/DAST/SCA/secrets/containers), or Core Web Vitals budgets. A blank-screen mobile bug shipped to tst because nothing tested mobile end-to-end against the deployed environment.

This spec establishes the AMG SaaS Factory enterprise QA framework as a **portable standard** for every future SaaS we ship from this factory. Five testing layers, each with a deliberately-chosen tool, a specific folder, a CI trigger, and a measurable gate. Zero-cost open-source where possible; paid services only where free alternatives leave a real gap.

The framework follows ISTQB Foundation v4.0 test-level vocabulary, Kent C. Dodds' Testing Trophy weighting, risk-based prioritization (BUG-001..016 retrospective), and shift-left/shift-right DevOps practice.

## Acceptance Criteria

1. [ ] Repository folder structure matches Section 2 (`tests/api/`, `tests/db/`, `tests/perf/`, `tests/security/`; existing `e2e/` → `tests/e2e/`; unit tests stay co-located in `src/**/__tests__/`).
2. [ ] **Layer 1 — API**: Playwright `APIRequest` suite under `tests/api/` covers every server action and `/api/*` route. Runs on PR. Asserts response shape (Zod) and status codes.
3. [ ] **Layer 2 — DB integration**: Real PocketBase binary spun up per test run under `tests/db/`. Asserts migrations apply cleanly, schemas match `src/schemas/`, tenant isolation holds, consent-log ordering enforced. Runs on PR.
4. [ ] **Layer 3 — Browser E2E**: 3-device matrix under `tests/e2e/` — `chromium` (desktop), `Pixel 5` (Android Chrome), `iPhone 13` via real WebKit binary (closest to iOS we get on Windows). PR runs chromium; post-deploy tst runs full matrix.
5. [ ] **Layer 4 — Security**: Semgrep (SAST), Trivy (containers + IaC), GitLeaks (secrets), `npm audit` (SCA), OWASP ZAP baseline (DAST against deployed tst). All five wired into CI; existing deterministic `security-gate.yml` retained.
6. [ ] **Layer 5 — Performance**: Lighthouse CI as PR gate against built artifact with budgets (LCP < 2.5s, INP < 200ms, CLS < 0.1, TTFB < 800ms). k6 nightly load test against tst API.
7. [ ] **Tag-based test categories** (orthogonal to folders): every test tagged `@smoke`, `@regression`, `@a11y`, or `@flaky`. CI gates select by tag, not folder.
8. [ ] **Per-bug regression policy**: every closed bug ships with a regression test at the layer that *would have* caught it. Enforced by PR template checkbox + reviewer.
9. [ ] **Risk register**: `docs/qa/risk-register.md` lists each user-facing flow with likelihood × impact score; coverage prioritization derives from this.
10. [ ] **Manual checklist**: `docs/qa/manual-pre-prod-checklist.md` — real-iPhone smoke + real-Android smoke + accessibility spot-check, signed before pro deploy.
11. [ ] CI matrix in Section 5 implemented: pre-commit, PR, post-deploy tst, nightly. Each gate documented in the workflow file with a comment explaining what it catches that the others can't.
12. [ ] Existing FEAT-041 pyramid mapping updated to reference the layers and tools in this spec.

## Constraints

- **Cost**: Layers 1, 2, 4, 5 must be zero-spend. Real-device cloud (BrowserStack) deferred until pro budget approves it.
- **Performance**: PR gate end-to-end ≤ 12 minutes. Post-deploy gate ≤ 8 minutes. Nightly is unconstrained.
- **Tenant**: Every API/DB/E2E test scopes to a fixture tenant; tests must not leak across tenants.
- **Legal**: LOPDGDD consent ordering verified at API + DB + E2E layers. No personal data in test fixtures committed to git — synthetic data only.
- **Portability**: Folder structure, tags, and CI gate names must be project-agnostic — copy-paste into the next SaaS without rename.

## Out of Scope

- Mutation testing (Stryker etc.) — defer until coverage stabilizes.
- Visual regression baselines — defer until brand redesign FEAT-038 lands.
- Native iOS testing on Windows — physically impossible; covered by manual checklist + WebKit emulation.
- Pen-test by external firm — defer to pre-pro launch.
- Synthetic uptime monitoring on pro — separate spec when pro env exists.
- Test impact analysis / selective test execution — wait for full suite to land first.

---

## 1. Five-Layer Tooling Matrix

| # | Layer | Tool | Folder | Trigger | Gate |
|---|---|---|---|---|---|
| 1 | API contract | Playwright `APIRequest` + Zod | `tests/api/` | PR | All endpoints respond ≤ 500ms, shape matches Zod |
| 2 | DB integration | Real PB binary (Testcontainers-equivalent) | `tests/db/` | PR | Migrations apply, schemas sync, tenant isolation holds |
| 3 | Browser E2E | Playwright (chromium + Pixel 5 + iPhone 13 webkit) | `tests/e2e/` | PR (chromium) + post-deploy (3-device) | Critical paths green, zero `console.error` |
| 4 | Security | Semgrep + Trivy + GitLeaks + ZAP + `npm audit` | `tests/security/` (configs) | PR + post-deploy | Zero high/critical findings |
| 5 | Performance | Lighthouse CI + k6 | `tests/perf/` | PR (LHCI) + nightly (k6) | Budgets respected, p95 latencies under threshold |

Unit tests stay co-located: `src/**/__tests__/*.test.ts(x)` (Vitest convention; do not move).

## 2. Folder Structure

```
src/
  **/__tests__/        ← unit tests, Vitest, co-located (UNTOUCHED)
tests/
  api/                 ← Layer 1: Playwright APIRequest, Zod assertions
  db/                  ← Layer 2: real PB binary integration
  e2e/                 ← Layer 3: browser tests (renamed from /e2e/)
    pages/             ←   Page Object Models
    fixtures/          ←   shared setup, auth, seeded data
    *.spec.ts          ←   tests tagged @smoke / @regression / @a11y
  perf/                ← Layer 5: Lighthouse + k6 configs
  security/            ← Layer 4: ZAP rules, Semgrep custom rules
docs/qa/
  risk-register.md     ← flow × likelihood × impact
  manual-pre-prod-checklist.md
  test-strategy.md     ← summary doc linking all layers
```

Folders by **engine** (Vitest vs Playwright vs LHCI vs k6). Categories by **tag** (`@smoke`, `@regression`, `@a11y`, `@flaky`). Never both.

## 3. Tag Conventions

- `@smoke` — must pass on every PR and post-deploy. ≤ 5 minutes total.
- `@regression` — bug-specific tests; full suite runs on PR + nightly.
- `@a11y` — axe-core assertions; runs on PR.
- `@flaky` — quarantined with linked open issue. Runs nightly only. PR gate ignores.

CI gate selection uses `--grep @smoke` etc. — never folder paths.

## 4. CI Gate Matrix

| Trigger | Layers run | Time budget | Blocks merge? |
|---|---|---|---|
| Pre-commit | Unit (Vitest) + type-check + lint | ≤ 60 s | Yes (local hook) |
| PR (`ci.yml`) | Unit + API + DB + E2E `@smoke` chromium + LHCI + Semgrep + GitLeaks + `npm audit` | ≤ 12 min | Yes |
| Post-deploy tst | E2E `@smoke` 3-device + ZAP baseline + health check | ≤ 8 min | Yes (rolls back tst) |
| Nightly | Full E2E `@regression` 3-device + k6 + Trivy full | unlimited | No (issues filed) |

Each workflow file MUST include a header comment explaining what its gate catches that the others can't (shift-left documentation).

## 5. Per-Bug Regression Policy

Every bug-fix PR MUST add at least one test at the layer that *would have caught the bug*. PR template adds:

```
- [ ] Regression test added at layer: [API | DB | E2E | Security | Performance | Unit]
- [ ] Test fails on the broken commit (verified locally)
```

Reviewer rejects PR if either box unchecked.

Retroactive sweep: BUG-001..016 mapped to layers in `docs/qa/risk-register.md`; each gets a regression test added in PRs separate from this spec's implementation.

## 6. Risk Register (governance)

`docs/qa/risk-register.md` shape:

| Flow | Likelihood | Impact | Score | Owner | Coverage |
|---|---|---|---|---|---|
| Booking submission | High | SEV-1 | 9 | QA | E2E + API + DB |
| ITV calculator | Medium | SEV-3 | 4 | QA | E2E + Unit |
| ... | ... | ... | ... | ... | ... |

Updated whenever a flow is added, removed, or a SEV-1 bug ships.

## 7. Test Cases (illustrative)

| Layer | Scenario | Input | Expected |
|---|---|---|---|
| API | Booking POST without consent | `consent:false` | 400, no record in `appointments` |
| DB | Tenant A reads tenant B's appointment | filter without `tenant_id` | Test fails — guard required |
| E2E (Pixel 5) | Homepage on Android Chrome | navigate to `/` | Brand visible, zero `console.error`, no SW poisoning |
| Security (ZAP) | DAST scan of tst | full crawl | Zero High/Critical alerts |
| Performance (LHCI) | Built homepage | local build | LCP < 2.5s, INP < 200ms, CLS < 0.1 |

## 8. Files to Touch

> Implementer fills during planning. Likely surface area:

- [ ] `tests/api/**` — new
- [ ] `tests/db/**` — new (PB harness)
- [ ] `tests/e2e/**` — moved from `e2e/`, restructured with `pages/` + `fixtures/`
- [ ] `tests/perf/**` — new (LHCI config, k6 scripts)
- [ ] `tests/security/**` — new (ZAP config, Semgrep custom rules)
- [ ] `playwright.config.ts` — add 3-device project matrix, tag-based filtering
- [ ] `.github/workflows/ci.yml` — add api/db/lhci/semgrep/gitleaks jobs
- [ ] `.github/workflows/deploy-tst.yml` — add ZAP baseline + 3-device E2E
- [ ] `.github/workflows/nightly.yml` — new (k6 + full regression + Trivy)
- [ ] `package.json` — scripts: `test:api`, `test:db`, `test:perf`, `test:security`
- [ ] `docs/qa/risk-register.md` — new
- [ ] `docs/qa/manual-pre-prod-checklist.md` — new
- [ ] `docs/qa/test-strategy.md` — new (summary doc)
- [ ] `.github/pull_request_template.md` — add regression-test checkbox
- [ ] `docs/specs/FEAT-041-test-strategy-pyramid.md` — cross-link to this spec

## 9. Migration Plan (PR sequence)

8–10 PRs, each independently mergeable, in this order:

1. **Folder restructure**: `e2e/` → `tests/e2e/`, add `tests/{api,db,perf,security}/` with READMEs; update `playwright.config.ts` + `ci.yml` paths. No new tests yet.
2. **3-device matrix + tags**: add Pixel 5 + iPhone 13 webkit projects; tag existing smoke tests `@smoke`; PR runs chromium-only, post-deploy runs full matrix.
3. **Console-error fail rule**: every E2E test asserts zero `console.error` and zero `pageerror` (would have caught the mobile blank-screen).
4. **Real-browser post-deploy gate**: replace curl-based homepage probe with Playwright run against tst URL.
5. **API layer**: `tests/api/` Playwright APIRequest + Zod assertions for every server action.
6. **DB layer**: real PB binary harness; migration + schema-sync + tenant-isolation tests.
7. **Lighthouse CI**: PR gate with budgets.
8. **Security stack**: Semgrep + GitLeaks + Trivy jobs; ZAP baseline post-deploy.
9. **k6 nightly**: load test against tst API.
10. **Governance**: risk register + manual pre-prod checklist + per-bug regression policy in PR template.

## 10. Builder-Validator Checklist

> Validator fills after each migration-plan PR.

- [ ] Folder structure matches Section 2
- [ ] No tests in moved files were deleted (test-deletion-guard passes)
- [ ] Tag conventions applied; CI selects by tag, not path
- [ ] All new gates have header comment explaining what they catch
- [ ] Performance budgets enforced as gate, not warning
- [ ] Tenant isolation verified at API + DB + E2E layers
- [ ] LOPDGDD consent ordering verified at API + DB layers
- [ ] No PII in fixtures; all test data synthetic
- [ ] `npm run type-check` → zero exit
- [ ] All PR-gate jobs green
- [ ] Existing FEAT-041 spec cross-references this spec
