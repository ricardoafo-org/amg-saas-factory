# FEAT-041 — Test Strategy & Pyramid

> Status: DRAFT — awaiting review before implementation.

## Intent

We have shipped 16 bugs (BUG-001 through BUG-016) since project start. Most of them — including five SEV-1s — were preventable with the right test at the right layer. Our current test suite (359 Vitest unit tests, no Playwright in CI, no contract layer, no post-deploy verification) is biased toward **what's easy to test**, not toward **what actually breaks in production**.

This spec defines the canonical test pyramid for the AMG SaaS Factory: which layer catches what, what gates run when, and what the minimum viable critical-path E2E suite is. It is the testing manifesto every PR must align with.

It supersedes FEAT-036 (QA framework rebuild) and FEAT-022 (QA full suite) — both of which were partial sketches without the layer-by-layer mapping that makes a strategy actionable.

## Acceptance Criteria

1. [ ] Every layer in the pyramid has a documented **purpose**, **tooling**, **trigger** (PR / pre-commit / post-deploy), and **coverage target**.
2. [ ] Every bug filed since project start (BUG-001 through BUG-016) is mapped to the layer that *should* have caught it. A new bug entering the system MUST add a regression test at that layer before merge.
3. [ ] The canonical critical-path E2E suite (Section 7) is implemented in Playwright, runs on every PR, and blocks merge on failure.
4. [ ] Post-deploy health check runs after every `deploy-tst.yml` run, asserts 200 + a tenant-config-derived text marker, and fails loud if not green.
5. [ ] Pre-commit hook runs the local gate (type-check + lint + unit + contract). Pre-PR adds E2E. Post-deploy adds health check. No PR bypasses these.
6. [ ] `docs/decisions/` entry documents the integration-branch + local-gate workflow as the project default.

## Constraints

- **Performance**: Full PR-gate must run in under 8 minutes (current: ~3 min for unit + lint + type-check). Playwright budget: 4 min for the canonical suite.
- **Tooling lock-in**: Vitest for unit/contract, Playwright for E2E, no third tool unless this spec is amended.
- **Tenant**: All integration tests that touch PocketBase MUST scope by `tenant_id`. No exceptions.
- **Legal**: E2E tests touching consent flows MUST assert the consent checkbox defaults to `false` (LOPDGDD).

## Out of Scope

- Visual regression testing (Playwright snapshots) — defer until brand stabilises post-FEAT-038
- Mutation testing — too expensive at this stage
- Load/stress testing — defer to pro-launch readiness
- Synthetic monitoring on pro — separate spec when pro environment exists
- Coverage reports as merge-blocking — we target meaningful coverage, not numerical thresholds

---

## 1. The Pyramid

```
         ┌─────────────────────────┐
         │   Post-deploy (smoke)   │  ← Layer 7: real env, after merge
         ├─────────────────────────┤
         │       E2E browser       │  ← Layer 6: critical user journeys
         ├─────────────────────────┤
         │      Integration        │  ← Layer 5: server actions + PB
         ├─────────────────────────┤
         │       Contract          │  ← Layer 4: cross-module IDs/shapes
         ├─────────────────────────┤
         │         Unit            │  ← Layer 3: pure logic
         ├─────────────────────────┤
         │    Static (grep + lint) │  ← Layer 2: forbidden patterns
         ├─────────────────────────┤
         │     Type-check (tsc)    │  ← Layer 1: type safety
         └─────────────────────────┘

   Cheaper / Faster / More tests ↑
   Slower / More valuable per test ↓
```

| # | Layer | Tool | Triggers | Target count | Avg runtime |
|---|-------|------|----------|--------------|-------------|
| 1 | Type-check | `tsc --noEmit` | pre-commit, PR | N/A (compiler) | <30s |
| 2 | Static | grep checks + ESLint custom rules | pre-commit, PR | ~10 grep rules | <15s |
| 3 | Unit | Vitest | pre-commit, PR | ~400 tests | <30s |
| 4 | Contract | Vitest + custom matchers | pre-commit, PR | ~30 tests | <10s |
| 5 | Integration | Vitest + PB test instance | PR only | ~20 tests | <90s |
| 6 | E2E | Playwright | PR only | ~5 scenarios | <240s |
| 7 | Post-deploy | curl + grep + scripted assertion | post-merge to main | 1 scenario | <30s |

---

## 2. Layer-by-layer detail

### Layer 1 — Type-check

- **Catches**: structural mismatches, missing fields, wrong shapes, NextJS `PageProps` violations.
- **Trigger**: pre-commit hook + PR `ci.yml` job + `next-build` job.
- **Status**: already in place, no changes needed.

### Layer 2 — Static checks (grep + ESLint)

- **Catches**: forbidden patterns at the lexical level. The cheapest test always wins.
- **Trigger**: pre-commit + `security-gate.yml` on PR.
- **Required rules** (each a separate grep pattern in `security-gate.yml` or a custom ESLint rule):
  | Rule | Pattern | Bugs it would have caught |
  |------|---------|---------------------------|
  | No raw filter interpolation in PB queries | `pb\.collection\([^)]+\)\.\w+\([^)]*\$\{` | BUG-015, BUG-016 |
  | No hardcoded IVA rate | `\b0\.21\b\|\b1\.21\b\|21%` outside `config/` | BUG-004, BUG-009 |
  | No hardcoded tenant slug | `'talleres-amg'` outside `clients/talleres-amg/` | BUG-008 |
  | No tenant data in components | string literal addresses/phones in `src/**/*.tsx` | BUG-014 |
  | No PB query without `tenant_id` filter | flagged by reviewer + custom ESLint | BUG-003 |
  | No `console.log` of PII fields | `console\.log.*(email\|phone\|name)` | preventive |
  | No `'use client'` import of `server-only` | already in components rule | preventive |
- **Implementation**: extend `.github/workflows/security-gate.yml` with the above rules. Currently it has 4; this brings it to 7.

### Layer 3 — Unit

- **Catches**: pure logic, boundary cases, formulas, formatters.
- **Trigger**: pre-commit + PR.
- **What goes here**: `groupHours`, `computeOpenStatus`, `getItvSchedule`, IVA math, NLP classifier scoring, plate validation, slot-cache eviction.
- **What does NOT go here**: anything that requires a fake DOM, a fake PocketBase, or coordinated module state.
- **Status**: 359 tests already exist. Strong layer. Maintain by writing a unit test for every new pure function.

### Layer 4 — Contract

- **Catches**: implicit agreements between modules — config keys vs component reads, chatbot flow node IDs vs ServiceGrid IDs, ZodSchema vs runtime payload shape, JSON-LD vs schema.org.
- **Trigger**: pre-commit + PR.
- **What goes here** (some already exist as ad-hoc tests; this layer formalizes them):
  | Contract | Existing test | Bugs it would have caught |
  |----------|---------------|---------------------------|
  | Component reads tenant data from `config`, never literals | `tenant-config-keys.test.ts`, `VisitSection.test.tsx` BUG-014 block | BUG-002, BUG-014 |
  | ServiceGrid service IDs match chatbot flow node IDs | `service-flow-contract.test.ts`, `flow-action-references.test.ts` | BUG-007, BUG-013 |
  | Chatbot flow has no dead-end nodes (every node reaches an exit) | `flow-node-references.test.ts` (extend) | BUG-012 |
  | IVA contract: NET in DB → GROSS at render → no double-IVA | `service-grid-iva.test.ts` (extend with booking-side assertion) | BUG-009 |
  | JSON-LD assertions match the rendered prop tree | `json-ld.test.ts` | preventive |
  | All `'use client'` files are reachable only from server boundary | new test | preventive |
- **Coverage target**: every `src/lib/` cross-module boundary has at least one contract test.

### Layer 5 — Integration

- **Catches**: server actions + PB writes + consent ordering + retry semantics.
- **Trigger**: PR only (slower, requires PB test instance).
- **What goes here**: `saveAppointment` happy path with consent_log ordering, `bookSlot` tenant scoping, `chatbot.ts` server action under load.
- **Setup needed**: ephemeral PocketBase instance per test run via the existing `npm run pb:serve` plus seed fixtures. Ship as `npm run test:integration`.
- **Status**: ~5 tests exist (`chatbot.test.ts`, `filter-injection-contract.test.ts`). Need ~15 more to cover all server actions.

### Layer 6 — E2E (Playwright)

- **Catches**: real-browser regressions, dead links, focus management, mobile viewport behaviour, end-to-end form submission.
- **Trigger**: PR only. Blocks merge on failure.
- **Status**: removed from CI (per `ci.yml:94` comment) — must reintroduce.
- **Canonical critical-path suite** (see Section 7 below).
- **Performance budget**: under 4 minutes for all scenarios combined.
- **Parallelism strategy**:
  - **Local**: `playwright.config.ts` sets `workers: '100%'` and `fullyParallel: true` — use every available core. The dev server runs alongside, so on low-RAM machines a developer can override with `npx playwright test --workers=4` if needed.
  - **CI**: GitHub-hosted runners are 4-CPU. Shard the suite across N parallel jobs via a matrix strategy rather than cranking workers per job past 100%. Target shard config: 4 shards × `workers: '100%'` per shard. Use `--shard=${{ matrix.shard }}/${{ matrix.total }}`. This is the implementation contract for task #66 — do NOT add the Playwright job without sharding.
- **When to prune vs parallelize**: parallelism is the first lever. Only prune scenarios if a) sharding still exceeds the 4-minute budget, or b) a scenario is flaky and not load-bearing for any SEV-1 path.

### Layer 7 — Post-deploy health check

- **Catches**: deploy-time failures, env-var drift, container start failures, broken assets in real Docker context.
- **Trigger**: after `deploy-tst.yml` SSH step succeeds.
- **Implementation**: shell step in `deploy-tst.yml` post-SSH that runs:
  ```
  curl -sSf -o /tmp/page.html https://tst.<domain>/
  grep -q "Talleres AMG" /tmp/page.html || exit 1
  ```
  The asserted text comes from the tenant config (`businessName`), not a hardcoded literal.
- **Status**: missing — tracked as task #67 (CI/CD P1).

---

## 3. Bug → Layer mapping (regression matrix)

Every bug filed gets its regression test at the layer below — this is what "the layer that should have caught it" means in practice.

| Bug | Severity | Title (abbrev) | Layer that should have caught | Test added? |
|-----|----------|----------------|-------------------------------|-------------|
| BUG-001 | high | flows:validate doesn't discover flows | Layer 3 (unit on glob path) | ✅ existing |
| BUG-002 | high | hardcoded prices in chatbot node | Layer 2 (grep) | ✅ tenant-config-keys |
| BUG-003 | high | bookSlot without tenant_id guard | Layer 2 (grep) + Layer 5 | ⚠️ partial |
| BUG-004 | medium | IVA hardcoded fallback | Layer 2 (grep `\b0\.21\b`) | ❌ MISSING |
| BUG-005 | low | unused imports | Layer 2 (lint) | ✅ ESLint |
| BUG-006 | critical | tst deploy broken | Layer 7 (post-deploy) | ❌ MISSING (task #67) |
| BUG-007 | high | Service CTAs silent — ID mismatch | Layer 4 (contract) | ✅ service-flow-contract |
| BUG-008 | medium | Hardcoded tenant fallback | Layer 2 (grep) | ❌ MISSING |
| BUG-009 | sev-1 | Double IVA charge | Layer 4 (IVA contract) | ⚠️ display only — booking missing |
| BUG-010 | high | Chat UI off design v2 | Layer 6 (E2E or visual) | ❌ MISSING |
| BUG-011 | medium | Footer dead links | Layer 6 (E2E click-every-CTA) | ✅ existing |
| BUG-012 | high | Chatbot fuel-type dead-end | Layer 4 (no-dead-end-nodes) | ✅ bug-012-flow-advance |
| BUG-013 | sev-1 | €0 prices — config ID mismatch | Layer 4 (contract) | ✅ service-flow-contract |
| BUG-014 | sev-3 | Visit wrong address | Layer 4 (component-reads-config) | ✅ VisitSection BUG-014 block |
| BUG-015 | critical | Filter injection in saveAppointment | Layer 2 (grep) + Layer 5 | ✅ filter-injection-contract |
| BUG-016 | critical | Raw filter in other actions | Layer 2 (grep) | ✅ filter-injection-contract (extend) |

**Gaps to close** (these become tasks under Phase 3 of this spec):
- BUG-004 hardcoded IVA grep rule
- BUG-006 post-deploy health check (already task #67)
- BUG-008 hardcoded tenant slug grep rule
- BUG-009 booking-side IVA assertion
- BUG-010 E2E chat-UI scenario

---

## 4. Coverage targets

We do **not** chase a numerical coverage % — that gamifies the wrong thing. We target **layer-completeness**:

- Every `src/lib/` exported function: has a unit test (Layer 3)
- Every cross-module boundary: has a contract test (Layer 4)
- Every server action: has an integration test (Layer 5)
- Every critical user journey (Section 7): has an E2E test (Layer 6)
- Every bug: adds a regression test at the layer that should have caught it

A PR that adds new code without the appropriate layer test fails the local gate. The pre-commit hook does not enforce this directly — the reviewer (human or agent) does.

---

## 5. Gates — what runs when

| Stage | Trigger | Layers run | Blocks? |
|-------|---------|------------|---------|
| **Local pre-commit hook** | `git commit` | 1, 2, 3, 4 | Yes — won't commit |
| **Local pre-PR (manual)** | dev runs before pushing | 1, 2, 3, 4, 5, 6 | Yes — won't push to PR |
| **PR gate** | `pull_request` to main | 1, 2, 3, 4, 5, 6 | Yes — won't merge |
| **Deploy gate** | `push` to main | (none — trusts PR gate) + 7 | Yes — fails deploy |
| **Post-deploy** | after deploy SSH | 7 | Yes — alerts |

Pre-PR is enforced **culturally** in the integration-branch workflow: the dev (or agent) runs the full local suite before opening the PR. The PR gate re-runs everything to be safe.

---

## 6. Workflow integration (integration-branch model)

Per the new project workflow:

```
main (protected)
 └── integration/<batch-name>          ← run full local gate before PR
      ├── feature/A                    ← run local pre-commit gate before merge
      ├── feature/B                    ← run local pre-commit gate before merge
      └── feature/C                    ← run local pre-commit gate before merge
```

- Each feature branch: pre-commit gate (Layers 1-4) before merge into integration
- Integration branch: full local gate (Layers 1-6) before PR
- ONE PR at a time from integration → main
- PR runs Layers 1-6 in CI; deploy runs Layer 7 post-merge

The `npm run test:all` script (to be added) runs all layers in order with stop-on-fail. Devs use it pre-PR.

---

## 7. Canonical critical-path E2E suite

These five scenarios are the minimum viable E2E coverage. Every scenario must pass in under 60 seconds. Total budget: 240 seconds.

### Scenario 1 — Booking happy path (desktop)
1. Visit `/`
2. Click "Reservar" CTA in Hero
3. ChatWidget opens, asserts consent checkbox is `unchecked` by default
4. Walk through service selection → date/time → contact form
5. Tick consent, submit
6. Assert success state with appointment ID

### Scenario 2 — ITV calculator
1. Visit `/`, scroll to ITV countdown
2. Enter plate `1234 ABC` and a date 3 years ago
3. Assert the days-remaining counter renders, shows non-zero positive value
4. Enter a date 6 years ago (past expiry)
5. Assert the expired branch with red urgent state shows

### Scenario 3 — Mobile contact bar
1. Set viewport to 375x667 (iPhone SE)
2. Visit `/`
3. Assert MobileContactBar is visible at bottom
4. Click "Llamar" — assert `tel:` link is correct format
5. Click "WhatsApp" — assert `wa.me/` link uses the configured phone

### Scenario 4 — Footer navigation contract (click-every-CTA)
1. Visit `/`, scroll to Footer
2. For each link/button in Footer: click it, assert no 404, assert correct destination
3. Includes legal links (`/privacidad`, `/cookies`, etc.) and service rows

### Scenario 5 — Visit section maps + tap-to-call
1. Visit `/`, scroll to VisitSection
2. Assert "Cómo llegar" link points to `config.contact.googleMapsUrl` (not a search URL)
3. Assert phone number is wrapped in `<a href="tel:...">` with stripped whitespace
4. Click "Llamar ahora" — assert `tel:` link target

These five cover: booking flow (Scenario 1), domain logic (Scenario 2), mobile UX (Scenario 3), navigation contract (Scenario 4), tenant data wiring (Scenario 5).

---

## 8. Phased rollout (implementation plan)

### Phase 1 — Foundations (1 PR)
- Add `npm run test:contract` and `npm run test:integration` scripts
- Wire test-layer separation in `vitest.config.ts` (test path patterns)
- Document layer conventions in `docs/decisions/2026-04-26-test-layers.md`

### Phase 2 — Static layer (1 PR)
- Extend `security-gate.yml` with the missing grep rules from Section 2.2
- Add ESLint custom rule for "no string-literal addresses/phones in components"
- Backfill regression coverage for BUG-004, BUG-008

### Phase 3 — Contract layer (1 PR)
- Add booking-side IVA assertion (BUG-009 closure)
- Add no-dead-end-nodes check for chatbot flows (formalise BUG-012 prevention)
- Add component-reads-config helper as a shared matcher

### Phase 4 — Integration layer (1 PR)
- Stand up ephemeral PB instance in CI via Docker compose
- Port existing chatbot.ts test patterns to integration-style tests
- Add `npm run test:integration` to PR gate

### Phase 5 — E2E reintroduction (1 PR)
- Reintroduce Playwright job in `ci.yml` as task #66 currently tracks
- Implement the 5 canonical scenarios from Section 7
- **Configure 4-shard matrix** with `workers: '100%'` per shard — see Layer 6 parallelism strategy. Total ≈ 16x parallelism vs single-job execution.
- Set 4-min budget; fail PR if exceeded

### Phase 6 — Post-deploy gate (1 PR — task #67)
- Add health-check step to `deploy-tst.yml`
- Tenant-config-derived assertion text
- Fail loud (workflow red) on miss

### Phase 7 — Workflow documentation
- ADR or `docs/decisions/` entry for the integration-branch model
- Update `CLAUDE.md` with the new flow + the layer cheat sheet

---

## Files to Touch

> Implementer fills this during planning per phase.

- [ ] `vitest.config.ts` — layer separation
- [ ] `package.json` — `test:contract`, `test:integration`, `test:all` scripts
- [ ] `.github/workflows/ci.yml` — add Playwright job, contract+integration jobs
- [ ] `.github/workflows/deploy-tst.yml` — post-deploy health check
- [ ] `.github/workflows/security-gate.yml` — additional grep rules
- [ ] `docs/decisions/2026-04-26-test-layers.md` — convention doc
- [ ] `docs/decisions/2026-04-26-integration-branch-workflow.md` — workflow doc
- [ ] `e2e/canonical/*.spec.ts` — the 5 critical-path scenarios
- [ ] `src/**/__tests__/*.contract.test.ts` — contract layer tests
- [ ] `src/**/__tests__/*.integration.test.ts` — integration layer tests

## Builder-Validator Checklist

> Validator fills this after each phase.

- [ ] All PocketBase queries scoped to `tenant_id`
- [ ] LOPDGDD: consent assertion in any test that touches consent
- [ ] No hardcoded IVA rate in tests or fixtures
- [ ] No hardcoded tenant data — use fixtures derived from `config`
- [ ] `npm run type-check` → zero exit
- [ ] `npm run test:all` → all layers green
- [ ] PR gate < 8 min wall clock
- [ ] Playwright suite < 4 min wall clock
