# FEAT-046 — Customer 360 + Activity Feed + Audit Trail

> Sub-FEAT of FEAT-037. The "open one record, see everything" surface — the most-visited admin page after the daily Today view.

## Intent

FEAT-016 already gives a customer profile. It shows contact info, vehicles, and a paginated service history. What it does **not** show: the SMS that went out yesterday, the quote that was emailed last Friday, the consent change the customer made last month, who edited which field, when, and how to undo a mistake from 5 minutes ago.

FEAT-046 turns the customer page into a true 360°: every change to the customer, their vehicles, their appointments, their quotes, their SMS log, their consents — all unified into a single chronological **Activity Feed** powered by a new `audit_log` collection. Owners get instant context ("ah, the SMS bounced because we changed the phone yesterday"). Inspectors get the LOPDGDD trail. Mistakes get undone in one click for 30 minutes after the action.

The same audit infrastructure feeds the Vehicle 360 (history of one car) and the Appointment detail (history of one booking). Build the audit primitive once; reuse three places in this sub-FEAT alone.

## Acceptance Criteria

1. [ ] New PocketBase collection `audit_log` with fields: `tenant_id`, `actor_id` (staff), `actor_kind` (staff/system/customer), `entity_type`, `entity_id`, `action` (create/update/delete/transition/send), `before` (JSON), `after` (JSON), `delta` (JSON, computed field-level diff), `request_id` (UUID), `created`. Indexed on `(tenant_id, entity_type, entity_id, created DESC)`.
2. [ ] Helper `withAudit(serverAction)` wraps any server action: it captures the entity before/after, computes the delta, and writes one `audit_log` row per mutation. All existing admin server actions in `src/actions/admin/**` are migrated to use it.
3. [ ] Customer profile page (`/admin/customers/[id]`) re-implemented with three columns on desktop, stacked on mobile:
   - **Left**: identity card (name, contact, consent badges, lifetime value)
   - **Centre**: tabbed content (Vehículos, Historial de citas, Presupuestos, Comunicaciones, Consentimientos)
   - **Right**: Activity Feed (chronological, last 90 days by default, "Ver más" loads older)
4. [ ] Vehicle detail page (`/admin/vehicles/[id]`) gets the same right-column Activity Feed scoped to that vehicle.
5. [ ] Appointment detail (slide-over from FEAT-015) grows an Activity Feed tab.
6. [ ] Each activity feed entry shows: actor avatar + name, action verb in Spanish ("editó", "envió", "marcó como Listo", "creó cita"), affected entity type, summary delta (≤ 80 chars), relative time ("hace 3 minutos"), absolute timestamp on hover.
7. [ ] Field-level diffs render inline for `update` actions: e.g. "📞 Teléfono: 600-111-222 → 600-333-444".
8. [ ] System events (cron jobs, automated SMS, hash-chain anchors) appear with a robot avatar and `actor_kind: 'system'`.
9. [ ] **Undo last action**: any activity entry whose `created` is within the last 30 minutes AND whose action is `update` or `transition` shows an "Undo" button. Clicking it replays the inverse mutation, writing a new `audit_log` row with `action: 'undo'` and a back-reference to the original `request_id`.
10. [ ] Undo respects business invariants: if undoing would violate a constraint (e.g. undoing a status from `delivered` back to `ready` after a SMS was sent), the user gets a confirmation dialog explaining the side effects before proceeding.
11. [ ] Customer page Vehicle list, Service history, and Quotes list use the `<DataTable>` primitive from FEAT-045. The old `CustomerProfile.tsx` and `CustomerTable.tsx` are deleted in PR 5 of this sub-FEAT.
12. [ ] Empty states per tab match the empty-state design contract: illustration + 1 line + 1 CTA. Tab "Comunicaciones" with no SMS shows: "Aún no has enviado SMS a este cliente. Crear nuevo SMS →".
13. [ ] Activity feed loads first 30 entries server-side (no spinner on initial paint); pagination cursor-based; "Ver más" appends 30 more.
14. [ ] All audit_log queries scoped by `tenant_id`. Collection rules deny direct write/edit from any client — writes only via server actions.
15. [ ] Performance: customer 360 page TTFB < 300 ms with 200 historical activity entries; activity column virtualized via `@tanstack/react-virtual` for > 100 entries.
16. [ ] Castilian Spanish for all action verbs, deltas, relative times.
17. [ ] LOPDGDD: changing `marketing_consent` writes both an `audit_log` row AND a `consent_log` row (the legal trail and the audit trail are kept separate intentionally).
18. [ ] Feature flag `config.feature_flags.activityFeed` (default `true` for `talleres-amg`).

## Constraints

- **Audit writes are unconditional** from the moment this ships. The flag only hides the UI; the trail is always captured.
- **`before`/`after` JSON max 8 KB** per row. Larger entities (e.g. a quote with 30 line items) get a compressed delta only.
- **No PII in `audit_log` indexes**. Indexed columns are tenant_id, entity_type, entity_id, created — not customer name or email.
- **Tenant**: every `audit_log` query filters by tenant_id; cross-tenant scan is impossible by collection rule.
- **Undo window**: 30 minutes by clock; configurable per tenant in `config.audit.undo_window_minutes` (default 30).
- **Inverse mutations** are only defined for `update` and `transition`. `create` undo = soft-delete; `delete` undo = restore; both confirmed by user.
- **WCAG 2.1 AA** on all new screens.

## Out of Scope

- Audit log for customer-facing actions (booking, consent on the public site). Out of scope; future work.
- Search inside audit log. Filtered views per entity only in v1; global audit search is a future feature.
- Compare-two-points-in-time. Future work.
- Exporting audit trail as legal document. FEAT-050 ships the inspector-grade verification endpoint.

## Test Cases

| Scenario | Input | Expected output |
|---|---|---|
| Customer page renders | Loaded preset, customer with 12 visits | Page renders < 300 ms, all three columns populated |
| Activity feed groups | Customer with edits + SMS + quote | Feed shows entries chronologically with correct verbs |
| Field delta | Edit phone via inline edit | Activity entry shows "📞 Teléfono: old → new" |
| Undo within window | Edit phone, then click Undo within 30 min | Phone restored, two audit_log rows present (update + undo with back-ref) |
| Undo expired | Edit phone, wait 31 min, refresh | Undo button no longer visible |
| Undo cascading consequence | Try undoing status from delivered → ready after SMS sent | Confirmation dialog explains "Se enviará un SMS de cancelación al cliente. Continuar?" |
| Cross-tenant guard | Try to fetch audit_log for an entity_id from another tenant | Server returns empty array (no leak), no error message reveals existence |
| Audit on every server action | Run all admin server actions in test | Vitest coverage asserts each writes exactly one audit_log row |
| Consent change writes both trails | Toggle marketing_consent | One row in audit_log (UI trail) + one row in consent_log (legal trail) |
| Empty state per tab | New customer with no SMS yet | "Aún no has enviado SMS..." with CTA |
| Performance | Customer with 500 audit entries | Feed virtualizes; initial paint loads first 30 only |
| LOPDGDD: PII not in error logs | Trigger an audit write failure | Error logged without name/email/phone in message |

## Files to Touch

- [ ] `pb_migrations/2026XX_create_audit_log.json` — new collection
- [ ] `pb_migrations/2026XX_audit_log_rules.json` — collection rules deny direct client writes
- [ ] `src/lib/audit/withAudit.ts` — server-action wrapper
- [ ] `src/lib/audit/diff.ts` — field-level delta computer
- [ ] `src/lib/audit/inverse.ts` — inverse mutation registry per entity_type/action
- [ ] `src/actions/admin/audit.ts` — `getActivityFeed(filter, cursor)`, `undoAction(audit_log_id)`
- [ ] `src/actions/admin/customers.ts` — wrap all mutations with `withAudit`
- [ ] `src/actions/admin/vehicles.ts` — wrap all mutations with `withAudit`
- [ ] `src/actions/admin/appointments.ts` — wrap all mutations with `withAudit`
- [ ] `src/actions/admin/quotes.ts` — wrap all mutations with `withAudit`
- [ ] `src/actions/admin/sms.ts` — wrap all mutations with `withAudit`
- [ ] `src/app/(admin)/admin/customers/[id]/page.tsx` — replaced 3-column Customer 360
- [ ] `src/app/(admin)/admin/vehicles/[id]/page.tsx` — add ActivityFeed column
- [ ] `src/core/components/admin/Customer360.tsx` — new layout component
- [ ] `src/core/components/admin/ActivityFeed.tsx` — feed renderer
- [ ] `src/core/components/admin/ActivityEntry.tsx` — single entry with undo
- [ ] `src/core/components/admin/EmptyState.tsx` — new shared empty-state primitive
- [ ] `src/core/components/admin/CustomerProfile.tsx` — DELETE in PR 5
- [ ] `src/core/components/admin/CustomerTable.tsx` — DELETE in PR 5 (after verifying DataTable migration)
- [ ] `tests/unit/audit/withAudit.test.ts` — wrapper tests
- [ ] `tests/unit/audit/inverse.test.ts` — undo correctness
- [ ] `tests/e2e/admin/customer-360.spec.ts` — Playwright suite
- [ ] `clients/talleres-amg/config.json` — `feature_flags.activityFeed: true`

## PR Sequencing

1. **PR 1** — `feat(audit): audit_log collection + withAudit wrapper + diff/inverse libs`. Branch: `feature/feat-046-audit-core`. Files: migration, libs, unit tests.
2. **PR 2** — `feat(audit): wrap all admin server actions with withAudit`. Branch: `feature/feat-046-wrap-actions`. Files: every `src/actions/admin/*.ts` updated. No UI yet.
3. **PR 3** — `feat(admin): ActivityFeed component + getActivityFeed action`. Branch: `feature/feat-046-feed-component`. Files: feed component, entry, virtualization wiring, server action.
4. **PR 4** — `feat(admin): Customer 360 three-column layout + tabs migration to DataTable`. Branch: `feature/feat-046-customer-360`. Files: page, layout component, DataTable consumers, empty states.
5. **PR 5** — `feat(admin): undo within 30 min + consequence dialog + delete legacy components`. Branch: `feature/feat-046-undo`. Files: undo action, consequence dialog, deletion of legacy `CustomerProfile.tsx` / `CustomerTable.tsx`, Playwright E2E.

## Dependencies

- Depends on FEAT-043 (fixtures), FEAT-045 (DataTable primitive), FEAT-016 (existing customer schema).
- Required by FEAT-047 (presence overlays on top of activity feed entries), FEAT-050 (signed records read from `audit_log`).

## Builder-Validator Checklist

- [ ] All `audit_log` queries scoped to `tenant_id`
- [ ] All admin mutations write exactly one `audit_log` row (test coverage asserts this)
- [ ] LOPDGDD: consent changes write both trails
- [ ] No PII in `audit_log` index keys or error responses
- [ ] Undo window respects `config.audit.undo_window_minutes`
- [ ] Castilian Spanish action verbs and relative times
- [ ] Old components deleted in PR 5; test-deletion guard satisfied (FEAT-035)
- [ ] WCAG 2.1 AA on Customer 360
- [ ] `npm run type-check` / `npm test` / `npm run lint` / Playwright clean
