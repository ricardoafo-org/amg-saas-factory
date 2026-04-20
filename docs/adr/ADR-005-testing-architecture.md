---
title: ADR-005 — Testing Architecture & Patterns
status: Accepted
date: 2026-04-18
authors: AMG Talleres / Claude QA Strategy
affects: All test code, CI/CD pipeline, Sprint 4+
---

# ADR-005 — Testing Architecture & Patterns

## Context

Before this ADR, testing lacked consistent patterns for:
- E2E tests were brittle (hardcoded selectors, manual waits)
- No integration test isolation strategy (risk of test interference or slow shared environments)
- No visual regression baseline approval workflow
- No local pre-commit testing feedback

This led to maintenance overhead and unclear ownership.

## Decision

Implement a **5-layer testing pyramid** with locked patterns and ownership:

### 1. Unit Tests (90% coverage target)
- **Pattern:** Vitest + Arrange-Act-Assert
- **Scope:** Pure functions only (NLP classifier, oil calc, ITV calc)
- **Owner:** Developer (TDD)
- **When:** Before commit (pre-commit hook)

### 2. Integration Tests (100% business logic paths)
- **Pattern:** Vitest + real PocketBase (never mock)
- **Isolation:** Mostly isolated (each test owns its tenant/data) + shared scenarios for multi-booking/concurrent booking
- **Owner:** Developer + QA engineer review
- **Cleanup:** Mandatory after-each to prevent test data leakage

### 3. E2E Tests (Playwright)
- **Pattern:** Page Object Model (reusable abstractions, no hardcoded selectors)
- **Owner:** QA engineer maintains page objects + fixtures
- **Desktop + Mobile:** Pixel 5 + Desktop Chrome viewports
- **Network:** 3G throttling profile for realistic rural conditions

### 4. API Contract Tests
- **Pattern:** TypeScript types ↔ PocketBase schema sync
- **Owner:** Developer (automated check in CI)
- **Fail condition:** Schema drift = build failure

### 5. Visual Regression Tests (Playwright screenshots)
- **Pattern:** Baseline comparison, approved by design system owner
- **Owner:** Design system owner (baseline approval) + QA engineer (validation + bug reporting for unexpected changes)
- **Scope:** Hero, ServiceGrid, ChatEngine, Email templates

### Test Data Isolation Strategy

**Mostly isolated:**
- Each E2E test creates its own tenant + slots → prevents interference
- Faster individual tests, but slower overall suite

**Shared scenarios:**
- Multi-booking (customer books same service twice in different days)
- Cross-tenant data checks (admin sees only their tenant)
- Concurrent booking conflicts
- Use fixture registry to select isolation mode per test

### Coverage Targets

| Layer | Target | Rationale |
|-------|--------|-----------|
| Unit | 90% lines | Catches pure logic bugs early; cheaper than E2E |
| Integration | 100% business logic paths | Every server action, every filter, every auth check |
| E2E | All happy + error paths | User-facing behavior matters most |
| Network | 3G + offline | Rural market reality |

### Visual Regression Approval Workflow

1. Screenshot captured by Playwright
2. Design system owner reviews diff against baseline
3. If expected (design changed): approve new baseline
4. If unexpected (regression): QA engineer files bug, blocks merge
5. Baseline lives in version control for audit trail

### Local Feedback Loop

**Pre-commit hook** runs:
```bash
npm run type-check && npm test:unit
```

Developers see unit test failures in < 2 seconds locally before pushing. Catches ~70% of issues before CI.

**CI pipeline** runs full suite:
```bash
npm test:unit (90% coverage enforced)
npm test:integration (against real PocketBase)
npm run e2e (Desktop + Mobile)
npm run lighthouse (LCP < 2.5s)
npm run axe (WCAG 2.1 AA)
```

## Consequences

### ✅ Benefits

- **Brittleness eliminated:** Page Object Model = reusable, maintainable E2E tests
- **Speed:** Pre-commit hook catches issues in < 2 min locally vs waiting for CI
- **Isolation:** Test data cleanup prevents flakiness; mostly isolated = safer than shared
- **Ownership clear:** Developer writes unit/integration, QA maintains E2E, design system owner approves visuals
- **Compliance:** 100% business logic paths ensures LOPDGDD, IDOR, tenant isolation never regress

### ⚠️ Tradeoffs

- **Isolated tests slower overall:** Each test's own data = more setup/teardown. Mitigated by <2 min target
- **Pre-commit hook adds ~2 sec:** Small price for catching issues early
- **Visual baseline approval overhead:** But essential for design regressions; owner has approval authority

## Alternatives Considered

1. **Shared test database** — faster (single setup), but high risk of test interference and false negatives
   - Rejected: "mock/prod divergence burned us on BUG-003"

2. **No pre-commit hook** — simpler, but developers wait for CI feedback
   - Rejected: violates AIDLC Phase 4 goal of "test behavior, not implementation"

3. **Auto-approve visual diffs** — faster CI, but design regressions slip through
   - Rejected: design system owner veto'd; baselines are audit trail

## Implementation

1. Retrofit existing Playwright tests → Page Object Model pattern
2. Add Vitest integration tests for server actions (slots.ts, chatbot.ts)
3. Configure pre-commit hook (`.git/hooks/pre-commit`)
4. Add visual regression baselines to git (`.playwright/snapshots/`)
5. Update CI workflow (`.github/workflows/test.yml`)

## References

- `.claude/skills/qa-testing-patterns/STRATEGY.md` — concrete code examples
- `docs/decisions/2026-04-18-aidlc.md` Phase 4 — testing philosophy
- BUG-003 (mock/prod divergence) — why we test against real PocketBase
