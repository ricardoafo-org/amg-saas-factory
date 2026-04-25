# Severity Rubric — AMG SaaS Factory

Derived from Microsoft's MSRC AI Bug Bar (https://www.microsoft.com/en-us/msrc/aibugbar) and extended
with AMG-specific functional and legal rows.

Every severity assignment MUST cite the axis and row that justified it (e.g. "Security axis, row S1").
No vibes-based severity. If you cannot cite a row, default to SEV-2 and note "row unclear".

---

## Security Axis (MSRC-derived)

Severity escalates when the bug allows an attacker to affect users OTHER than themselves.
Attacker-only impact is generally out of scope for severity escalation.

| ID  | Condition                                                                          | Severity |
|-----|------------------------------------------------------------------------------------|----------|
| S1  | Cross-tenant PII leak — one tenant reads another tenant's personal data             | SEV-1    |
| S2  | Tenant-isolation IDOR — a PocketBase query lacks `tenant_id` guard                 | SEV-1    |
| S3  | LOPDGDD / GDPR breach — personal data stored, transmitted, or logged without consent | SEV-1  |
| S4  | Filter injection — user-controlled input interpolated raw into a PocketBase filter  | SEV-1    |
| S5  | Prompt injection — attacker manipulates chatbot system prompt via user input        | SEV-1    |
| S6  | Hardcoded secret or credential in source / committed to git                        | SEV-1    |
| S7  | Auth bypass — unauthenticated access to a protected route or server action         | SEV-1    |
| S8  | PII returned in API error response or logged in `console.log`                      | SEV-2    |
| S9  | Client-side secret exposure (secret in browser bundle / env var without NEXT_PUBLIC_ restriction) | SEV-2 |
| S10 | Missing HTTPS redirect or insecure cookie flag (non-httpOnly, non-Secure)          | SEV-2    |
| S11 | Overly permissive CORS or CSP header                                               | SEV-3    |
| S12 | Informational — verbose error message reveals internal stack trace to user         | SEV-3    |

**Rule**: Any bug touching a tenant-scoped PocketBase query is assumed SEV-1 until `security-auditor` clears it.

---

## Functional Axis (AMG-specific)

| ID  | Condition                                                                          | Severity | Legal reference |
|-----|------------------------------------------------------------------------------------|----------|-----------------|
| F1  | Quote / invoice emitted without IVA breakdown or with hardcoded `0.21` / `1.21`   | SEV-2    | RD 1457/1986 Art. 16; IVA rounding rule |
| F2  | Appointment booked without recording LOPD consent first (consent_log.create order) | SEV-1   | LOPDGDD |
| F3  | Warranty badge absent or shows wrong duration / mileage                            | SEV-2    | RD 1457/1986 (3-month / 2,000 km minimum) |
| F4  | Chatbot flow regression — a previously-working intent no longer routes correctly   | SEV-2    | — |
| F5  | Calendar / slot conflict — double-booking a slot for the same tenant               | SEV-2    | — |
| F6  | `config` collection value overridden by hardcoded constant in component            | SEV-2    | CLAUDE.md invariant |
| F7  | Broken link / 404 on a navigable page (dead anchor, missing route)                 | SEV-3    | — |
| F8  | Wrong address, phone, or Maps URL displayed to the user                            | SEV-3    | — |
| F9  | NLP misroute on a valid input (user intent not matched)                            | SEV-3    | — |
| F10 | Copy error, visual artefact, or layout regression not blocking user flow           | SEV-4    | — |
| F11 | JSON-LD / SEO metadata wrong or missing (LocalBusiness schema, OpenGraph)          | SEV-3    | — |
| F12 | Cookie consent pre-ticked or analytics fires before user consent                  | SEV-1    | LOPDGDD / ePrivacy |

---

## Severity Definitions

| Level | Label    | Merge block? | SLA        | Description |
|-------|----------|--------------|------------|-------------|
| SEV-1 | Critical | Yes          | Fix in 24h | Security breach, LOPDGDD violation, data loss, auth bypass. No release with open SEV-1. |
| SEV-2 | High     | Yes          | Fix in 72h | Feature broken, wrong legal output, serious UX regression. |
| SEV-3 | Medium   | No           | Fix in 7d  | Degraded experience, wrong non-critical data, broken secondary link. |
| SEV-4 | Low      | No           | Next sprint | Cosmetic, copy error, minor visual inconsistency. |

---

## Usage by bug-triager

1. Read the bug report.
2. Match the described symptom against Security Axis rows first, then Functional Axis.
3. Assign the highest-matching severity.
4. Cite the exact row ID (e.g. "Security axis S2" or "Functional axis F8").
5. If no row matches, assign SEV-3 and note "no row matched — default".
6. Any bug that mentions tenant queries → flag SEV-1 pending `security-auditor` review (rule S2).
7. Any bug that mentions personal data → flag SEV-1 pending LOPDGDD review (rule S3).

## Usage by qa-engineer

Tests that cover a SEV-1 path MUST be annotated `// SEV-1: <rubric row>` above the test block.
A quarantined test that covers a SEV-1 path blocks release until re-validated.
