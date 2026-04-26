# FEAT-047 — Real-time Presence + Optimistic Inline Editing

> Sub-FEAT of FEAT-037. The "two people on the same record without stepping on each other" surface — Figma-style presence applied to a CRM.

## Intent

Workshops have 2–3 staff often touching the same customer or appointment within minutes (the owner takes a phone call and updates the address while the mechanic on the tablet updates the work-order status). The current admin has no awareness — last write wins silently, surprises happen ("who changed the phone?"), and conflicting edits are discovered only when something breaks downstream.

FEAT-047 adds two coordinated capabilities:

1. **Presence**: when two staff have the same record open, each sees a small avatar of the other in the header, plus a coloured outline on the field the other is currently editing. No collaboration cursors (overkill for a CRM); just enough signal to not double-edit.
2. **Optimistic inline editing**: replace modal-based editing on the customer / vehicle / appointment pages with click-to-edit fields. The change applies optimistically, validates client-side via Zod, persists via a server action wrapped in `withAudit` (FEAT-046), and rolls back on error. Conflict detection: if another staff updated the same field between read and write, the user sees a "Cambio de {actor}: ..." prompt and chooses to keep theirs or accept the other's.

This unlocks the "feels alive" sensation that's absent from a 2018-era admin.

## Acceptance Criteria

1. [ ] New PB collection `presence` with fields: `tenant_id`, `staff_id`, `entity_type`, `entity_id`, `field` (optional), `last_seen` (datetime). TTL: rows older than 60 seconds considered stale.
2. [ ] Client-side hook `usePresence(entityType, entityId)` opens one PocketBase realtime subscription per tenant per page, sends a heartbeat every 20 seconds, and returns the list of *other* staff currently on the same entity.
3. [ ] Customer 360, Vehicle detail, and Appointment slide-over render a **PresenceStrip** in the header showing up to 4 avatars; >4 collapses to "+N".
4. [ ] When another staff is actively editing a field, that field shows a coloured outline (per-staff colour, deterministic from staff_id hash) and a tiny "Manuel está editando" caption below.
5. [ ] InlineEdit primitive `<InlineField>`: accepts `value`, `onSave`, `validate` (Zod schema), `displayFormat`, `editFormat`. Click → input appears with current value, Esc cancels, Enter or blur saves. Visual states: idle, hover, editing, saving, error.
6. [ ] Inline-editable fields on Customer 360: name, phone, email, notes, marketing_consent toggle.
7. [ ] Inline-editable fields on Vehicle detail: km, ITV expiry, fuel type, notes.
8. [ ] Inline-editable fields on Appointment slide-over: scheduled_at (date+time picker), assigned_tech, status (segmented control), tech_notes.
9. [ ] Optimistic update: UI shows new value immediately; on server error, value rolls back and a toast shows the error in Castilian Spanish.
10. [ ] Conflict detection: server action receives `if_unmodified_since` (the timestamp the client read). If the row was modified after that, the action returns `409 Conflict` with the new value; the client shows a `<ConflictDialog>` offering "Mantener mi cambio" or "Aceptar el cambio de {actor}".
11. [ ] Conflict dialog uses the audit_log to identify the other actor (queries the most recent audit_log row for that field).
12. [ ] Presence respects per-tenant connection cap: max 1 subscription per browser tab; closed tabs release subscriptions immediately via `beforeunload`.
13. [ ] Presence does not fire if `config.feature_flags.presence` is `false` (default `false` for new tenants; `true` for `talleres-amg`).
14. [ ] WCAG: every inline field is reachable by keyboard (Tab to focus, Enter to enter edit, Esc to cancel). Screen reader announces "{label}: {value}, editable" then "{label}, edición, valor actual {value}".
15. [ ] LOPDGDD: changing `marketing_consent` via inline edit still writes a `consent_log` row before the customer write, exactly as in FEAT-046.
16. [ ] Performance: PresenceStrip renders within 100 ms of subscription open. Inline edit save round-trip < 250 ms p95 on local PB.

## Constraints

- **PocketBase realtime only**. No external services (Liveblocks, Pusher, Ably).
- **One subscription per tab**. Capped by `usePresence` hook's lifecycle.
- **Heartbeat interval 20s**, TTL 60s. Stale rows pruned by a daily cron in `pb_hooks/presence-prune.pb.js`.
- **No live cursors, no live text streaming**. Only "who is here" + "who is editing what field" + conflict resolution on save.
- **Tenant**: presence rows scoped by tenant_id; collection rules deny cross-tenant read.
- **Security**: presence does not expose any data the staff can't already see (it's "who is on this customer" — they already have access to the customer).
- **Castilian Spanish copy** in conflict dialogs and field captions.

## Out of Scope

- Field-level locking (prevent simultaneous edits). Out of scope; we use conflict detection + dialog instead.
- Live-typing collaboration (Google Docs style). Out of scope.
- Presence on list pages (e.g. "3 people are looking at /admin/customers"). Out of scope.
- Mobile/tablet presence display. Tablet ergonomics in FEAT-048 will adopt presence after this ships.

## Test Cases

| Scenario | Input | Expected output |
|---|---|---|
| Two staff open same customer | Manuel and Sara both open `/admin/customers/X` | Each sees the other's avatar in PresenceStrip within 100 ms |
| Field-level presence | Manuel clicks the phone field to edit | Sara sees a coloured outline on the phone field with caption "Manuel está editando" |
| Heartbeat | Sara closes tab | Manuel sees Sara disappear within ≤ 60 seconds |
| Inline edit happy path | Manuel edits phone, presses Enter | Value persists, audit_log row created, optimistic UI |
| Inline edit Zod validation | Manuel types "abc" in phone field | Local validation rejects with Castilian Spanish message; no server call |
| Conflict on save | Sara saves phone first, Manuel saves second | Manuel sees ConflictDialog with both values + actor names |
| Conflict resolution — keep mine | Manuel chooses "Mantener mi cambio" | Manuel's value wins; one more audit_log row for the override |
| Conflict resolution — accept other | Manuel chooses "Aceptar el cambio de Sara" | Sara's value remains; Manuel's edit discarded; UI updates |
| Tenant isolation | Subscribe with tenant A, attempt to subscribe to tenant B's entity | PB realtime denies; client shows no presence |
| Feature flag off | `presence: false` | Hook returns empty array; no subscriptions opened |
| LOPDGDD: consent inline-edit | Toggle marketing_consent off | consent_log row written before customer row updated |
| A11y inline edit | Tab to phone field, Enter to edit, type, Enter to save | All keyboard, screen reader announces transitions |

## Files to Touch

- [ ] `pb_migrations/2026XX_create_presence.json` — new collection
- [ ] `pb_hooks/presence-prune.pb.js` — daily TTL prune
- [ ] `src/core/hooks/usePresence.ts` — subscription + heartbeat hook
- [ ] `src/core/components/admin/PresenceStrip.tsx` — avatar strip
- [ ] `src/core/components/admin/PresenceFieldOutline.tsx` — coloured outline + caption
- [ ] `src/core/components/data-table/InlineField.tsx` — generic inline-edit primitive (lives near the data-table primitives)
- [ ] `src/core/components/admin/ConflictDialog.tsx` — conflict resolution dialog
- [ ] `src/lib/conflict/ifUnmodifiedSince.ts` — server-action helper for conflict detection
- [ ] `src/actions/admin/customers.ts` — extend update actions to support `if_unmodified_since`
- [ ] `src/actions/admin/vehicles.ts` — same
- [ ] `src/actions/admin/appointments.ts` — same
- [ ] `src/app/(admin)/admin/customers/[id]/page.tsx` — replace modal edits with InlineField; mount PresenceStrip
- [ ] `src/app/(admin)/admin/vehicles/[id]/page.tsx` — same
- [ ] `src/core/components/admin/AppointmentSlideOver.tsx` — same
- [ ] `clients/talleres-amg/config.json` — `feature_flags.presence: true`
- [ ] `tests/unit/conflict/ifUnmodifiedSince.test.ts`
- [ ] `tests/e2e/admin/presence.spec.ts` — multi-tab Playwright (uses `browser.newContext()` twice)
- [ ] `tests/e2e/admin/inline-edit-conflict.spec.ts`

## PR Sequencing

1. **PR 1** — `feat(admin): presence collection + usePresence hook + PresenceStrip`. Branch: `feature/feat-047-presence`. Files: migration, hook, strip, prune cron.
2. **PR 2** — `feat(admin): InlineField primitive + Zod inline validation + optimistic update`. Branch: `feature/feat-047-inline-edit`. Files: InlineField, Zod helper, customer page first.
3. **PR 3** — `feat(admin): conflict detection + ConflictDialog + if_unmodified_since on actions`. Branch: `feature/feat-047-conflict`. Files: server-action helper, dialog, action signatures.
4. **PR 4** — `feat(admin): presence outlines + inline edit on vehicle + appointment + multi-tab E2E`. Branch: `feature/feat-047-rollout`. Files: outline component, vehicle/appointment migration, Playwright multi-tab suites.

## Dependencies

- Depends on FEAT-043 (fixtures), FEAT-045 (data table primitive proximity for InlineField), FEAT-046 (audit_log for actor identity in ConflictDialog).
- Required by FEAT-048 (tablet UX inherits inline-edit + presence).

## Builder-Validator Checklist

- [ ] All presence + edit queries scoped to `tenant_id`
- [ ] LOPDGDD: marketing_consent inline change writes consent_log first
- [ ] No PII exposed via presence (presence row contains only IDs + entity refs)
- [ ] Conflict dialog never reveals data the user can't already see
- [ ] One subscription per tab cap
- [ ] WCAG 2.1 AA on inline edit and conflict dialog
- [ ] Castilian Spanish copy
- [ ] `npm run type-check` / `npm test` / `npm run lint` clean
- [ ] Playwright multi-tab suites green
