# FEAT-023 — Security (OWASP Top 10 + SAST + DAST)

## Intent

Harden the AMG SaaS Factory against the OWASP Top 10 (2021) for the Next.js 15 + PocketBase stack. Establish SAST in CI and DAST as a pre-release gate. All findings rated Critical or High must be resolved before MVP goes to production.

## OWASP Top 10 — Stack-Specific Assessment

### A01 — Broken Access Control
**Attack surface:** PocketBase queries, server actions, admin routes.

Mitigations required:
- [ ] Every PocketBase query in `src/actions/**` includes `tenant_id` filter at query layer (`getFirstListItem` — never post-fetch comparison)
- [ ] Admin middleware (`src/middleware.ts`) checks valid PocketBase auth cookie on every `/admin/**` route — unauthenticated → redirect to `/admin/login`
- [ ] No PocketBase `superuser` credentials exposed to client-side code
- [ ] Server actions in `src/actions/admin/**` call `getAdminContext()` which validates session — no action callable without valid session
- [ ] Cross-tenant IDOR test: authenticated as tenant A, attempt to fetch/update tenant B record → `RecordNotFoundError` (verified by DB integration tests in FEAT-022)

### A02 — Cryptographic Failures
**Attack surface:** PocketBase auth tokens, PII in transit.

Mitigations required:
- [ ] TLS enforced on all production traffic (HTTPS only — enforced at reverse proxy)
- [ ] No secrets in `process.env` values committed to git (`.env` in `.gitignore` — verified by `git log --all -S "PB_SUPERADMIN"`)
- [ ] PocketBase auth token stored as HttpOnly cookie — not accessible via `document.cookie`
- [ ] No PII (name, phone, email, plate) logged to console or Sentry breadcrumbs without masking

### A03 — Injection
**Attack surface:** PocketBase filter strings, SMS templates, chatbot input.

Mitigations required:
- [ ] All PocketBase filter strings use parameterised interpolation or encoded values — no raw user input concatenated into filter strings
- [ ] SMS template interpolation uses allowlist variables only (`{name}`, `{date}`, `{plate}`) — no arbitrary field injection
- [ ] Chatbot user input sanitised before passing to NLP classifier — no eval, no dynamic require
- [ ] Zod validation on all server action inputs — parse before any DB operation

### A04 — Insecure Design
**Attack surface:** Consent flow, chatbot trust boundary.

Mitigations required:
- [ ] `consent_log.create()` fires BEFORE `marketing_consent` write in `updateCustomer()` — enforced by code review and DB integration test
- [ ] Presupuesto disclosure shown BEFORE LOPD checkbox in chatbot flow — enforced by chatbot engine node order
- [ ] No server action trusts caller-supplied `tenant_id` — always derived from server-side session context

### A05 — Security Misconfiguration
**Attack surface:** Next.js headers, PocketBase API rules, environment.

Mitigations required:
- [ ] `next.config.ts` sets security headers: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
- [ ] PocketBase collection rules reviewed: `cookie_consents`, `consent_log`, `appointments`, `customers` — no collection allows public write without `tenant_id`
- [ ] `robots.txt` does NOT block `/politica-de-privacidad` or `/politica-de-cookies`
- [ ] No PocketBase admin UI exposed on public port in production
- [ ] `NODE_ENV=production` in production — disables Next.js dev overlays

### A06 — Vulnerable and Outdated Components
**Attack surface:** npm dependencies, PocketBase version.

Mitigations required:
- [ ] `npm audit --audit-level=high` → zero high/critical findings (run in CI)
- [ ] Dependabot or Renovate configured for automated dependency updates
- [ ] PocketBase version pinned in `package.json` scripts — upgrade documented in ADR
- [ ] `next`, `pocketbase`, `zod`, `resend`, `twilio` on latest stable (checked quarterly)

### A07 — Identification and Authentication Failures
**Attack surface:** Admin login, PocketBase auth, session management.

Mitigations required:
- [ ] Admin login rate-limited: ≤ 5 failed attempts per IP per minute → 429 (reverse proxy or middleware)
- [ ] PocketBase auth token expires in ≤ 30 days (PocketBase default — verify config)
- [ ] No `rememberMe: true` without explicit user opt-in
- [ ] Admin login page does NOT reveal whether email exists ("Invalid credentials" for both wrong email and wrong password)
- [ ] Session invalidated on explicit logout (`pb.authStore.clear()`)

### A08 — Software and Data Integrity Failures
**Attack surface:** Build pipeline, npm scripts, chatbot flow JSON.

Mitigations required:
- [ ] `chatbot_flow.json` validated by `npm run flows:validate` before deploy — malformed flow → build fail
- [ ] `package-lock.json` committed and verified in CI (`npm ci` not `npm install`)
- [ ] GitHub Actions: pin action versions by SHA, not tag
- [ ] No `eval()` or `new Function()` in application code (SAST rule)

### A09 — Security Logging and Monitoring Failures
**Attack surface:** Error tracking, consent audit trail.

Mitigations required:
- [ ] Sentry configured for unhandled errors in production — no PII in event titles
- [ ] `consent_log` collection in PocketBase retains records ≥ 3 years (LOPDGDD Art. 7)
- [ ] `cookie_consents` collection retains records ≥ 1 year
- [ ] Failed admin login attempts logged (timestamp, IP) — PocketBase auth logs
- [ ] PocketBase audit log enabled for `appointments`, `customers`, `consent_log` writes

### A10 — Server-Side Request Forgery (SSRF)
**Attack surface:** Any outbound HTTP from server actions.

Mitigations required:
- [ ] No server action makes outbound HTTP to a URL derived from user input
- [ ] Resend and Twilio calls use hardcoded API base URLs — not configurable at runtime by tenants
- [ ] PocketBase URL (`PB_URL`) is a server-side env var — not exposed to client or derived from request

## SAST — Static Analysis Tools

### Tools

| Tool | Purpose | Integration |
|---|---|---|
| `eslint-plugin-security` | JS/TS security patterns (injection, regex DoS, unsafe refs) | `npm run lint` — already in ESLint pipeline |
| `npm audit` | Known vulnerable packages | CI step, fail on high/critical |
| `semgrep` | Deep pattern matching (secrets, OWASP rules) | CI step, OSS ruleset `p/owasp-top-ten` |

### SAST acceptance criteria
- [ ] `eslint-plugin-security` added to `.eslintrc` — zero new warnings in `src/`
- [ ] `npm audit --audit-level=high` → exit 0 in CI
- [ ] `semgrep --config p/owasp-top-ten src/` → zero HIGH/CRITICAL findings
- [ ] CI pipeline (`qa.yml`) runs all three SAST steps before E2E

## DAST — Dynamic Analysis

### Tool: OWASP ZAP (Zed Attack Proxy)

Run against the staging environment (not production) before every MVP release.

### DAST scope

| Target | Scope |
|---|---|
| Public site (`/`) | Passive scan + active scan (authenticated = false) |
| Chatbot API (`/api/chat`) | Fuzz with malformed payloads |
| Admin login (`/admin/login`) | Brute-force protection test, session fixation |
| Admin pages (`/admin/**`) | Authenticated scan with valid session cookie |
| Legal pages | Information disclosure check |

### DAST acceptance criteria
- [ ] ZAP baseline scan (`docker run owasp/zap2docker-stable zap-baseline.py`) → zero HIGH/CRITICAL alerts on public site
- [ ] ZAP full scan on admin (authenticated) → zero HIGH/CRITICAL alerts
- [ ] No sensitive headers exposed: `Server`, `X-Powered-By` removed in production
- [ ] No directory listing on `/api/**` or `/_next/**`
- [ ] CSRF protection verified on all state-changing server actions (Next.js CSRF token or SameSite=Lax cookie)

### DAST run cadence
- Before every merge to `main` that touches `src/actions/**`, `src/app/api/**`, or `next.config.ts`
- As a manual pre-release gate before each sprint's production deploy

## Security Headers — Required Config

Add to `next.config.ts`:

```ts
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",  // Next.js requires unsafe-inline; tighten post-MVP with nonces
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://api.resend.com https://api.twilio.com",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];
```

Note: `unsafe-inline` for scripts is a temporary allowance for Next.js App Router — replace with nonces post-MVP (tracked as follow-up).

## Files to Create/Touch

- `next.config.ts` — add security headers
- `.github/workflows/qa.yml` — add `npm audit`, `semgrep` steps
- `.eslintrc` (or `eslint.config.mjs`) — add `eslint-plugin-security`
- `docs/adr/ADR-006-security-headers.md` — document CSP decisions
- `docs/qa-reports/dast-baseline-YYYY-MM-DD.md` — DAST run report (generated, not committed to source)

## Constraints

- **DAST against staging only** — never run active ZAP scan against production
- **SAST in CI** — must not block developer flow; warnings = informational, findings = blocking
- **No secrets in SAST output** — semgrep reports must not echo env var values
- **CSP nonces** — required post-MVP; `unsafe-inline` is a temporary allowance

## Out of Scope

- Penetration testing by third party (post-MVP)
- SOC 2 compliance (future)
- Bug bounty program (future)
- Runtime Application Self-Protection (RASP) (future)
- Load/DDoS protection (covered separately at infrastructure layer)
