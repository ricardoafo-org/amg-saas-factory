# `tests/perf/` — Layer 5: Performance tests

> **Status:** placeholder. Lighthouse CI lands in FEAT-042 PR 7; k6 lands in PR 9.

- **Lighthouse CI**: PR gate against built artifact. Budgets: LCP < 2.5s, INP < 200ms, CLS < 0.1, TTFB < 800ms.
- **k6**: nightly load test against tst API.

See [docs/specs/FEAT-042-enterprise-qa-strategy.md](../../docs/specs/FEAT-042-enterprise-qa-strategy.md) §1 row 5.
