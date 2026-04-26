# FEAT-037 — Admin Back-Office Umbrella ("Blow the Client's Mind")

> Umbrella spec. Coordinates 8 sub-FEATs (FEAT-043..050) that turn the existing admin (FEAT-013..020) into a 2026-class back-office for a small Spanish auto-workshop owner and 1–2 mechanics on tablets.
> Status: PLANNING.

## Vision

Today's admin (FEAT-013..020) is a competent CRUD dashboard. It does the job, but it does not *delight*. The owner still tabs through pages, types in search inputs, and reads modal forms one field at a time. The mechanics on tablets are second-class citizens — the UI was designed for a desk.

FEAT-037 turns the admin into a **command-driven, real-time, touch-first cockpit** that small Spanish workshops have never seen outside enterprise SaaS. The "wow" moments:

1. **Press `Cmd+K` from anywhere** and type "garcia 1234" — jump straight to that customer's profile, or "nueva cita carlos lunes 10" — book a slot, all by keyboard. (Linear / Stripe / Vercel pattern, applied to a workshop.)
2. **Open a customer record while a mechanic on a tablet has it open** — see their avatar, see the field they are editing, and changes flow live without anyone clicking "save" or "refresh". (Figma-style presence on a CRM record.)
3. **Open a vehicle's history and see the full timeline** — every appointment, every quote, every SMS, every photo, every status change, with one-tap undo for the last 30 minutes of edits. (Linear-style activity feed with audit replay.)
4. **The mechanic taps "siguiente trabajo" on the tablet** — and the right work order opens in a thumb-friendly layout, with a single-finger status flow and voice notes. Big targets, no modals.
5. **The owner clicks "Nueva cita" without picking a slot** — the system suggests three slots based on service duration, mechanic skills, current load, and customer history. (AI-assisted scheduling.)
6. **Every quote, every warranty, every consent has a signed legal trail** — a tamper-evident hash chain the owner can show to a Hacienda / Consumer Affairs inspector. (RD 1457/1986 + LOPDGDD compliance theatre, made real.)
7. **A new tenant starts demoing in 60 seconds** — `npm run seed:tenant -- --preset=loaded` creates a complete realistic shop with 6 months of data; `--preset=empty` showcases the empty states. Demos and tests share fixtures.

The umbrella is delivered as 8 independent sub-FEATs, each shippable on its own and behind a per-tenant feature flag.

## Sub-FEATs Index

| ID | Title | Depends on | Ship order | Est. PRs | Risk |
|---|---|---|---|---|---|
| FEAT-043 | Test Data Fixtures (`seed:tenant`) | FEAT-013 schema | 1 | 3 | Low |
| FEAT-044 | Command Palette (Cmd+K) | FEAT-043, FEAT-013 | 2 | 4 | Low |
| FEAT-045 | Universal Data Table primitive | FEAT-043 | 2 (parallel with 044) | 4 | Med |
| FEAT-046 | Customer 360 + Activity Feed + Audit Trail | FEAT-045, FEAT-016 | 3 | 5 | Med |
| FEAT-047 | Real-time Presence + Optimistic Inline Editing | FEAT-046 | 4 | 4 | High |
| FEAT-048 | Tablet Ergonomics (shop-floor mode) | FEAT-014, FEAT-015 | 4 (parallel with 047) | 4 | Med |
| FEAT-049 | AI-Assisted Smart Scheduling | FEAT-015, FEAT-020 | 5 | 4 | Med |
| FEAT-050 | Signed Records & Legal Trail | FEAT-017, FEAT-018, FEAT-046 | 6 | 3 | High |

**Total**: 31 PRs across 8 sub-FEATs. ~10–12 weeks of work at ~3 PRs/week.

## Cross-Cutting Decisions

### CCD-1 — Command Palette tech: `cmdk` (pacocoursey/cmdk)

`cmdk` (already used by Vercel, Linear's open-source clone, Radix). 9 KB gzipped, headless, accessible (WAI-ARIA combobox), keyboard-first. We do **not** roll our own — the accessibility surface is a minefield (focus trap, virtual list, screen-reader announcements). Tradeoff: one new dependency vs. weeks of accessibility bugs. The existing stack (Radix-style headless primitives) makes `cmdk` a natural fit.

### CCD-2 — Data table tech: TanStack Table v9 (headless) + custom Tailwind shell

TanStack Table v9 is headless, framework-agnostic, ships zero CSS, supports column virtualization via `@tanstack/react-virtual`, and is the de-facto 2026 standard. We pair it with a thin AMG shell for sticky headers, density toggles, column visibility, sort/filter chips, and keyboard navigation. Tradeoff: TanStack does not do styling — we own ~400 lines of shell code, but every page that needs a table reuses the same primitive (Customers, Vehicles, Quotes, Reports, Audit Log).

### CCD-3 — Real-time tech: PocketBase realtime subscriptions (existing) + tab-local presence channel

PocketBase already exposes realtime subscriptions over SSE. We use them for both data sync and presence — presence "who is viewing what" is just a `presence` collection with a 30-second TTL, scoped by `tenant_id`. No external service (Liveblocks, Pusher, Ably) — keeps the stack pure and avoids a per-tenant SaaS bill. Tradeoff: presence-on-PocketBase is a custom build (~150 lines), but we own it.

### CCD-4 — Audit trail strategy: append-only `audit_log` collection + materialized activity views

Every mutating server action writes one `audit_log` row before returning: `{ tenant_id, actor_id, entity_type, entity_id, action, before, after, request_id, created }`. Activity feeds (Customer 360, Vehicle history, etc.) read from `audit_log` filtered + joined. Undo (last 30 minutes) replays the inverse mutation if the row's `request_id` is still within the window. Tradeoff: every server action gains 3 lines of code (helper) and one PB write — accepted for the legal + UX value.

### CCD-5 — Signed records: SHA-256 hash chain in `audit_log` + WORM verification endpoint

Each `audit_log` row stores `prev_hash` + `entry_hash = sha256(prev_hash || row_json)`. A daily cron stamps the chain head into a separate `audit_anchor` collection. Inspector-facing endpoint `/admin/legal/verify` recomputes the chain and shows ✅ / ❌. This is *evidentially defensible* without a blockchain, without a third-party notary, and without leaving the stack.

### CCD-6 — AI-assisted scheduling: deterministic ranker first, LLM-optional later

Slot suggestions in v1 are a deterministic scorer: `score = w1 * proximity_to_requested + w2 * mechanic_skill_match + w3 * load_balance + w4 * customer_pref_history`. No LLM call, no API cost, no PII leaves the tenant. Phase 2 (post-Sprint) can add an LLM explanation ("sugerimos el martes porque..."), but the core ranking stays deterministic for legal/audit reasons.

### CCD-7 — Feature flags: per-tenant `config.feature_flags` JSON

Every sub-FEAT ships behind a flag in `config.feature_flags`: `{ commandPalette: true, presence: false, smartScheduling: false, ... }`. Default OFF for new sub-FEATs; we flip ON per-tenant after smoke testing. This lets `talleres-amg` get features first while we onboard new tenants on the proven baseline.

### CCD-8 — Castilian Spanish locked in

Every sub-FEAT must pass the Castilian-Spanish lint (no voseo, no Rioplatense). Copy review is part of each sub-FEAT's Definition of Done. Mechanic-facing copy in particular gets a usability review with a real mechanic before merge.

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Real-time presence creates N×M PB connections, overloads server | Med | High | Cap presence subscriptions to 1 per browser tab; TTL-based cleanup; load test at 50 concurrent staff |
| R2 | Audit log fills DB and slows queries | High over time | Med | Partition by month; archive > 24 months to cold storage; index `(tenant_id, entity_type, entity_id, created)` |
| R3 | Cmd+K becomes a "dumping ground" — every action lands there and discovery degrades | Med | Med | Strict information architecture: only navigation, top-5 entity types, and "Nueva cita / Nuevo cliente / Nuevo presupuesto" actions in v1 |
| R4 | Tablet UX diverges from desktop UX → two codebases | Med | High | Single codebase, responsive primitives; a dedicated "shop-floor mode" route is a *layout variant*, not a fork |
| R5 | Smart-scheduling misranks and frustrates the owner | Med | Med | Always show top 3 + "elegir manualmente"; never auto-book without confirmation; weights tunable per tenant |
| R6 | Hash-chain audit log is corrupted by a manual PB edit | Low | High | `/admin/legal/verify` endpoint surfaces the break; daily cron alerts owner; PB collection rules deny edits except via server actions |
| R7 | Seed script destroys real tenant data | Low | Critical | Script refuses to run unless `tenant_id` ends in `-empty` or `-loaded`; production tenants protected by env-var allowlist |
| R8 | Spanish copy review bottlenecks every PR | Med | Low | Castilian-Spanish lint runs in CI; flagged words block merge; manual review only on net-new flows |

## Migration Plan from FEAT-013..020 to FEAT-037

The umbrella does **not** rewrite the existing admin. It adds primitives and progressive enhancement:

1. **No URL changes**. `/admin/customers` keeps working as built in FEAT-016. FEAT-046 *replaces* the page implementation with a new one mounted at the same URL.
2. **New components live alongside old**. `CustomerTable.tsx` (FEAT-016) stays until `DataTable.tsx` (FEAT-045) is proven on the Customers page, then we delete the old one in the FEAT-046 PR. Same pattern for every other table.
3. **Feature flags gate the new behaviour**. Default OFF in `config.feature_flags`. Flip ON per-tenant after manual smoke. `talleres-amg` is the canary.
4. **Activity feed is opt-in via flag, but `audit_log` writes are unconditional** from the moment FEAT-046 ships — we want the historical trail even if the UI is hidden.
5. **Deletion cleanup**: each sub-FEAT's PR sequence ends with a "remove old XYZ" PR. Test-deletion guard (FEAT-035) ensures we don't lose test coverage during the swap.
6. **Sub-FEAT order** (see index table) is dependency-driven. FEAT-043 (fixtures) ships first because every other sub-FEAT needs realistic data to demo and test.

## Out of Scope (umbrella-level)

- Mobile-native apps (iOS/Android). Tablet support is web-PWA only (FEAT-048).
- Multi-language UI. Castilian Spanish only; i18n infrastructure deferred.
- Customer-facing changes. The umbrella is admin-only; the booking site is unchanged.
- Multi-tenant tenant management UI. Tenant onboarding stays a manual ops task.
- Native PDF generation for quotes/invoices. Plain text + HTML email is sufficient for MVP (FEAT-017 already deferred PDF).
- Payment processing. Out of scope for the entire admin track; revisit post-FEAT-050.

## Builder-Validator Checklist (umbrella-level — applies to every sub-FEAT)

- [ ] All PocketBase queries scoped to `tenant_id`
- [ ] LOPDGDD: consent logged before any personal-data write
- [ ] No hardcoded IVA rate (`0.21` / `1.21` / `21%`)
- [ ] No PII in `console.log` / error responses
- [ ] No hardcoded tenant data (names, prices, config)
- [ ] Every mutating server action writes one `audit_log` row (FEAT-046+)
- [ ] Castilian Spanish only — no voseo, no Rioplatense
- [ ] Feature flag gate present in `config.feature_flags`
- [ ] `npm run type-check` → zero exit
- [ ] `npm test` → all pass
- [ ] `npm run lint` → zero errors
- [ ] WCAG 2.1 AA: keyboard nav + screen-reader on all new flows
