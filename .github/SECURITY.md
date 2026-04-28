# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in AMG SaaS Factory (`amg-saas-factory`), please report it privately. **Do NOT open a public GitHub issue.**

**Contact:** `r.afonsomontero@gmail.com`

When reporting, please include:

- A clear description of the vulnerability and its impact
- Steps to reproduce (proof-of-concept code is welcome)
- Affected components (file paths, routes, or commit SHAs)
- Any suggested mitigations or fixes
- Your contact details and whether you wish to be credited

We commit to:

1. Acknowledge receipt within **48 hours**
2. Provide a preliminary assessment within **7 days**
3. Disclose coordinated fix details within **90 days** of the original report (industry-standard window — extendable by mutual agreement for complex issues)
4. Credit the reporter publicly (with permission) once the fix is shipped

## Scope

In scope:
- The application code in this repository (`src/`, `scripts/`, `infra/`, workflow files)
- Deployed environments under `*.178-104-237-14.sslip.io`
- The `pocketbase` database schemas defined in `src/schemas/`

Out of scope:
- Third-party services (PocketBase upstream, Twilio, Resend, Anthropic, GitHub, Hetzner) — report to the relevant vendor directly
- Social engineering attacks against the maintainer
- DoS attacks against the deployed environments

## Severity classification

We follow the AMG severity rubric documented in [`docs/contracts/severity-rubric.md`](../docs/contracts/severity-rubric.md). Reporters should expect:

- **SEV-1 (critical):** acknowledged within 24h, fixed within 24h. Cross-tenant PII leak, auth bypass, LOPDGDD violation, hardcoded secret, filter injection, prompt injection.
- **SEV-2 (high):** acknowledged within 48h, fixed within 72h. PII in logs, client-side secret exposure, missing security headers.
- **SEV-3 (medium):** acknowledged within 7 days, fixed within 7 days. Permissive CORS/CSP, verbose error messages.
- **SEV-4 (low):** addressed in next sprint.

## Safe harbor

We support good-faith security research. If you act in good faith, comply with applicable laws, and do not exploit the vulnerability beyond what is necessary to demonstrate the issue, we will:

- Not pursue legal action against you
- Treat your activity as authorized testing
- Work with you on coordinated disclosure

Please do NOT:
- Access, modify, or delete data belonging to other users
- Perform actions that disrupt service availability
- Exfiltrate data beyond what is needed to demonstrate the vulnerability
