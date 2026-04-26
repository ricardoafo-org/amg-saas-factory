# FEAT-043 — Test Data Fixtures (`seed:tenant`)

> Sub-FEAT of FEAT-037. Ships first — every other sub-FEAT depends on realistic data to demo, test, and validate.

## Intent

Today, demoing the admin requires manually creating customers, vehicles, appointments, and consent rows in PocketBase admin. Tests fight the same problem: each Vitest/Playwright run rebuilds a thin slice of fixtures, and Empty State UX is never seen by anyone except the developer who first opens the page. We need a single, repeatable script that wipes a designated test tenant and rebuilds it into one of two presets:

- `amg-talleres-empty` — a brand-new shop, all tables empty except `staff` (one owner) and `services` (the catalog).
- `amg-talleres-loaded` — six months of realistic Spanish workshop data: 60 customers, ~110 vehicles, ~280 past appointments, 18 future appointments, full `consent_log` trail, 35 quotes across all statuses, 95 SMS log entries.

Same seed is used by Playwright E2E suites, the design team's demo, the QA pipeline, and any developer who wants to see Customer 360 with real-looking content. No real PII — every name, phone, email is synthetic but Spanish-realistic.

## Acceptance Criteria

1. [ ] `npm run seed:tenant -- --tenant=amg-talleres-loaded --preset=loaded` wipes the named tenant and rebuilds it as the loaded preset, idempotently (rerunning produces the identical state).
2. [ ] `npm run seed:tenant -- --tenant=amg-talleres-empty --preset=empty` wipes and produces the empty preset.
3. [ ] The script REFUSES to run if `tenant_id` does not end in `-empty` or `-loaded`. Production tenant IDs are rejected with a clear error.
4. [ ] The script reads an allowlist of seedable tenant IDs from `scripts/seed/seedable-tenants.json` and rejects anything else (defence in depth).
5. [ ] Loaded preset produces ≥ 60 customers with synthetic Spanish names from `scripts/seed/data/spanish-names.json`. No name appears in real Spain population top-100 surnames + given names combos (avoids accidental real-person collision).
6. [ ] Loaded preset produces vehicles spanning all five service categories: electronics (ECU, ADAS, diagnostics), mechanics (oil, distribution, clutch), ITV (pre-ITV, post-ITV repair), brakes (pads, discs, fluid), suspension (shocks, alignment).
7. [ ] Loaded preset appointment timeline: 220 past (mixed completed/cancelled/no-show), 30 today and last 7 days (mixed in_progress/ready/delivered), 18 future (mixed pending/confirmed). Distributions match production-realistic ratios documented in `scripts/seed/data/distributions.md`.
8. [ ] Every customer with a phone number AND `marketing_consent: true` has a corresponding `consent_log` row created BEFORE the customer write (LOPDGDD order).
9. [ ] 35 quotes created across statuses: 8 draft, 12 sent, 10 approved, 5 rejected. Each has 2–6 line items, IVA computed from `config.iva_rate`, validity = created + 12 business days.
10. [ ] 95 `sms_log` entries paired to appointments (reminder 24h, reminder 2h, vehicle ready) + standalone (ITV reminders).
11. [ ] Empty preset: only `staff` (one owner with email `owner@amg-talleres-empty.test`, password from `scripts/seed/.env.example`), `services` catalog (the same 12 services), and `config` (default values). Zero rows in customers/vehicles/appointments/quotes/sms_log/consent_log.
12. [ ] Script completes in < 30 seconds for loaded preset on a developer laptop with local PocketBase.
13. [ ] Script outputs a summary: `✓ Seeded amg-talleres-loaded: 60 customers, 112 vehicles, 268 appointments, 35 quotes, 95 SMS, 60 consent rows.`
14. [ ] Playwright E2E suite (`tests/e2e/admin/`) replaces its current ad-hoc fixture creation with a `beforeAll` that runs the seed script for `amg-talleres-loaded`.
15. [ ] CI (`security-gate.yml` or new `seed-fixtures.yml`) runs the seed script against an ephemeral PocketBase, asserts the summary numbers match expected, and fails on drift.

## Constraints

- **Legal**: synthetic data only. No real names, phones, emails. Phone numbers use `+34 6XX XXX XXX` Spanish mobile format with the second-third digits in `[0-9][0-9]` but the full number checked against a deny-list of real numbers.
- **Tenant isolation**: every row written includes `tenant_id` matching the `--tenant` argument; assert no cross-tenant rows exist after seed.
- **Order**: the script writes `consent_log` BEFORE the customer it belongs to (FK is logical, but the temporal order satisfies the LOPDGDD invariant in F2 of the rubric).
- **Idempotency**: re-running the seed wipes first via PocketBase's collection API, scoped by `tenant_id`. Other tenants are untouched.
- **Performance**: bulk PB writes batched in groups of 50 to stay under PocketBase's request size limits.
- **No real auth**: the seeded owner password is `seed-only-do-not-deploy` and the tenant config has `is_demo: true` to block accidental email/SMS sends.

## Out of Scope

- Seeding production tenants. Forbidden by allowlist.
- A UI for triggering the seed. CLI only.
- Localized fixtures for non-Spanish locales. Castilian Spanish only.
- Realistic invoice/PDF generation. Plain quote rows are enough.
- Snapshot/restore-from-backup. The seed always rebuilds from code.

## Test Cases

| Scenario | Input | Expected output |
|---|---|---|
| Happy path — loaded | `--tenant=amg-talleres-loaded --preset=loaded` | Tenant wiped, preset built, summary printed, exit 0 |
| Happy path — empty | `--tenant=amg-talleres-empty --preset=empty` | Tenant wiped, only staff + services + config populated, exit 0 |
| Idempotency | Run loaded seed twice | Second run produces identical row counts and entity IDs (deterministic seed) |
| Production tenant rejected | `--tenant=talleres-amg --preset=loaded` | Exits 1 with `Error: tenant 'talleres-amg' not in seedable allowlist` |
| Unknown preset | `--tenant=amg-talleres-loaded --preset=middle` | Exits 1 with `Error: preset must be 'empty' or 'loaded'` |
| PocketBase down | PB at :8090 unreachable | Exits 1 with `Error: cannot reach PocketBase at <url>`; no partial writes |
| LOPDGDD order broken | Manually disable consent_log step | Test asserts every customer with `marketing_consent: true` has a corresponding row in `consent_log` with `created < customer.created` (off by ms is allowed) |
| Tenant isolation | Loaded seed run; query other tenants | Other tenants' rows untouched (count diff = 0) |
| CI drift detection | Add a customer to fixture file | CI seed-summary check fails because expected counts changed without spec update |

## Files to Touch

- [ ] `scripts/seed/seed-tenant.ts` — main entry, parses args, dispatches to preset
- [ ] `scripts/seed/presets/empty.ts` — empty preset builder
- [ ] `scripts/seed/presets/loaded.ts` — loaded preset builder (orchestrates the helpers below)
- [ ] `scripts/seed/builders/customers.ts` — generates synthetic customers + consent_log
- [ ] `scripts/seed/builders/vehicles.ts` — generates vehicles, plates (formato `0000-AAA`), KM, ITV expiries
- [ ] `scripts/seed/builders/appointments.ts` — generates the 268-appointment timeline
- [ ] `scripts/seed/builders/quotes.ts` — generates 35 quotes with line items
- [ ] `scripts/seed/builders/sms-log.ts` — generates 95 SMS log entries
- [ ] `scripts/seed/data/spanish-names.json` — synthetic name pool (≥ 200 entries)
- [ ] `scripts/seed/data/vehicle-models.json` — Spanish-market vehicle distribution (Seat, Renault, Citroën, Toyota, Volkswagen, Ford, Peugeot, Nissan, Hyundai, Kia)
- [ ] `scripts/seed/data/distributions.md` — documented status / category / age ratios
- [ ] `scripts/seed/seedable-tenants.json` — allowlist `["amg-talleres-empty", "amg-talleres-loaded"]`
- [ ] `scripts/seed/lib/pb-wipe.ts` — tenant-scoped collection wiper
- [ ] `scripts/seed/lib/random.ts` — seeded PRNG (deterministic from a fixed seed)
- [ ] `scripts/seed/.env.example` — seeded staff credentials
- [ ] `package.json` — add `"seed:tenant": "tsx scripts/seed/seed-tenant.ts"` script
- [ ] `.github/workflows/seed-fixtures.yml` — CI job that runs seed against ephemeral PB
- [ ] `tests/e2e/admin/_setup.ts` — replace ad-hoc fixtures with seed call in Playwright global setup
- [ ] `docs/contracts/test-fixtures.md` — short contract describing the two presets

## PR Sequencing

1. **PR 1** — `feat(seed): scaffold seed:tenant CLI + empty preset + allowlist guard`. Branch: `feature/feat-043-seed-empty`. Files: CLI entry, allowlist, empty preset, package.json script.
2. **PR 2** — `feat(seed): loaded preset with customers, vehicles, consent_log`. Branch: `feature/feat-043-seed-loaded-customers`. Files: customer/vehicle/consent builders, name/model data files, distributions doc.
3. **PR 3** — `feat(seed): loaded preset appointments, quotes, sms_log + CI drift check`. Branch: `feature/feat-043-seed-loaded-history`. Files: remaining builders, CI workflow, Playwright global setup swap, contracts doc.

## Dependencies

- Depends on FEAT-013 (PB schema) being deployed.
- Required by FEAT-044, FEAT-045, FEAT-046, FEAT-047, FEAT-048, FEAT-049, FEAT-050.

## Builder-Validator Checklist

- [ ] All PB queries / writes scoped to `tenant_id` from CLI arg
- [ ] LOPDGDD: every consenting customer has a `consent_log` row with `created` strictly before customer row
- [ ] No hardcoded IVA rate — read from `config.iva_rate`
- [ ] No real PII in fixtures (verified by name + phone deny-list)
- [ ] No production tenant ID in seedable allowlist
- [ ] Idempotent — running twice produces identical state
- [ ] `npm run type-check` → zero exit
- [ ] `npm test` → all pass (unit tests for builders + allowlist guard)
- [ ] CI seed-fixtures workflow green
