# `tests/db/` — Layer 2: DB integration tests

> **Status:** placeholder. Tests land in FEAT-042 PR 6.

Real PocketBase binary spun up per test run. Asserts migrations apply cleanly, schemas match `src/schemas/`, tenant isolation holds, consent-log ordering is enforced. Runs on PR.

See [docs/specs/FEAT-042-enterprise-qa-strategy.md](../../docs/specs/FEAT-042-enterprise-qa-strategy.md) §1 row 2.

## Conventions

- Spin up PB binary fresh per suite — no shared state.
- All filters use `pb.filter(template, params)` — never string interpolation.
- Tenant isolation guard: a test that drops `tenant_id` MUST fail.
- No PII in fixtures — synthetic data only.
