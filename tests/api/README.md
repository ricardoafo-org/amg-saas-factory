# `tests/api/` — Layer 1: API contract tests

> **Status:** placeholder. Tests land in FEAT-042 PR 5.

Playwright `APIRequest` + Zod schema assertions for every server action and `/api/*` route. Runs on PR. Asserts response shape and status codes (≤ 500ms, shape matches Zod).

See [docs/specs/FEAT-042-enterprise-qa-strategy.md](../../docs/specs/FEAT-042-enterprise-qa-strategy.md) §1 row 1.

## Conventions

- One spec per server action / route.
- Tag with `@smoke` (must-pass) or `@regression`.
- Fixture tenant scope; never leak across tenants.
- LOPDGDD consent ordering verified here AND at the DB layer.
