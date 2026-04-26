# `tests/security/` — Layer 4: Security tests

> **Status:** placeholder. Configs land in FEAT-042 PR 8.

Holds configurations (not tests) for the security stack:

- **Semgrep** (SAST) — custom rules tuned for this codebase.
- **Trivy** (containers + IaC) — image and config scanning.
- **GitLeaks** (secrets) — pre-commit and CI.
- **OWASP ZAP** (DAST) — baseline scan against deployed tst.
- **`npm audit`** (SCA) — already wired in `ci.yml`.

The deterministic project-specific gate stays at `scripts/ci-security-gate.sh` + `.github/workflows/security-gate.yml`.

See [docs/specs/FEAT-042-enterprise-qa-strategy.md](../../docs/specs/FEAT-042-enterprise-qa-strategy.md) §1 row 4.
