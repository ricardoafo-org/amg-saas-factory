# FEAT-049 — AI-Assisted Smart Scheduling

> Sub-FEAT of FEAT-037. Slot suggestions that feel intelligent, computed deterministically.

## Intent

In FEAT-015's "Nueva cita" flow, the owner opens a calendar and finds a slot. That works for a 5-customer-per-day shop and breaks the moment two services contend for a mechanic with the right skill, or the owner wants to balance load across two techs, or wants to honour a returning customer's morning preference.

FEAT-049 ships a deterministic ranker that, given a service request (service type + duration + customer ID + preferred window), returns the **top 3 ranked slot suggestions** with a transparent reason for each ("Martes 10:00 — Manuel disponible, especialidad eléctrica, taller con baja carga"). The owner accepts one or rejects all and picks manually.

No LLM in v1. The "AI feel" comes from a clear weighted scorer the owner trusts. The architecture leaves room for Phase 2 to layer an LLM explanation on top, but the scoring stays deterministic for legal + audit reasons.

## Acceptance Criteria

1. [ ] New server action `suggestSlots(input)` where input = `{ serviceIds: string[], customerId?: string, preferredWindow?: { from: ISO, to: ISO }, durationMinutes: number }`. Returns `Suggestion[]` of up to 3 ranked options.
2. [ ] Each `Suggestion` = `{ slotId, scheduledAt, mechanicStaffId, score, reasons: ReasonChip[] }` where `ReasonChip` = `{ kind, label, weight }`.
3. [ ] Scorer dimensions:
   - `proximity_to_requested` — closer to `preferredWindow.from` ranks higher (negative exponential).
   - `mechanic_skill_match` — service has tag list `electrical | mechanical | itv | brakes | suspension`; mechanic has `skills` array; overlap fraction × weight.
   - `load_balance` — fewer appointments already on that tech that day = higher score.
   - `customer_preference` — if customer has ≥ 3 past appointments, prefer their historical mode (morning/afternoon, weekday vs weekend, same mechanic if any).
   - `availability_buffer` — penalize back-to-back with no buffer (< 15 min).
4. [ ] Scorer weights configurable per tenant in `config.scheduling.weights` with defaults `{ proximity: 0.40, skill: 0.25, load: 0.15, customer: 0.15, buffer: 0.05 }`.
5. [ ] Scorer is **deterministic**: same input + same tenant state → same output. Pure function over (slot pool, mechanic staff, past appointments). Inputs and outputs hashable for test assertions.
6. [ ] "Nueva cita" modal in FEAT-015 is updated: after the user selects services and (optionally) a customer, a new "Sugerencias inteligentes" section shows the 3 cards. Each card: scheduledAt, mechanic name + avatar, total reasons (chips), one-tap "Reservar este hueco".
7. [ ] If `customerId` is missing or `serviceIds` is empty, the suggestion section is hidden and the manual calendar-pick remains.
8. [ ] If 0 viable slots match the constraints, show a clear message: "No hay sugerencias en la ventana elegida. Amplía el rango o reserva manualmente."
9. [ ] Each reason chip is human-friendly Spanish: "Manuel · electricista", "Carga baja", "Tu horario habitual: mañanas".
10. [ ] Reservation from a suggestion writes the appointment exactly like manual booking — same server action, same audit_log, same conflict detection.
11. [ ] Conflict guard: between suggestion render and "Reservar", the slot may have been taken; the action returns 409 and the suggestion list re-fetches.
12. [ ] Owner-side toggle "Sugerencias en cada nueva cita" persists in `staff.prefers_suggestions` (default `true`).
13. [ ] Performance: `suggestSlots` returns in < 250 ms p95 on the loaded preset (5 mechanics, 200 appointments in next 14 days).
14. [ ] Feature flag `config.feature_flags.smartScheduling` (default `true` for `talleres-amg`).
15. [ ] Castilian Spanish for all labels, reasons, and copy.
16. [ ] Audit: every suggestion **acceptance** writes an `audit_log` row with `action: 'transition'`, `before: { scheduled_at: null }`, `after: { scheduled_at, mechanic_staff_id }`, `delta.reasons` for replay.

## Constraints

- **Deterministic scorer only**. No LLM call in v1. No PII leaves the tenant.
- **Tenant**: all queries scoped to `tenantId`; mechanic skill tags + service tags from `config`.
- **Cap candidate pool**: scorer evaluates at most 200 candidate slots; if more match, pre-filter by `proximity_to_requested` first.
- **Stable rank**: ties broken by `(scheduledAt ASC, mechanicStaffId ASC)` for determinism.
- **Audit-friendly**: every reason chip has a `kind` enum so the audit trail can be queried.
- **WCAG**: suggestions readable by screen reader; reason chips marked up as `<ul><li>` with `aria-label="Motivos"`.

## Out of Scope

- LLM-generated explanations. Layer 2, future spec.
- Re-suggesting after initial booking ("a better slot opened up"). Future work.
- Customer-facing smart suggestions on the booking site. Out of scope; admin only.
- Multi-objective optimisation (e.g. globally re-pack the calendar). Out of scope; per-request only.

## Test Cases

| Scenario | Input | Expected output |
|---|---|---|
| Happy path | brake service + customer with 5 past Friday-AM appointments | Top 3 suggestions, all Fridays AM, with "Tu horario habitual: viernes mañana" chip |
| Skill-matched | electrical service requested | Only mechanics with `electrical` skill suggested |
| Load-balanced | tech A booked 6 times tomorrow, tech B booked once | Tech B ranks higher despite slightly later time |
| No customer history | New customer | `customer_preference` weight contributes 0; no error |
| 0 viable slots | request 8 PM on Sunday | Empty list + "No hay sugerencias..." message |
| Determinism | Same input twice | Identical output (snapshot test) |
| Concurrency | Two staff accept the same suggestion | First wins, second gets 409 + refresh |
| Tenant isolation | Tenant A's data | No mechanics or slots from tenant B in scorer's candidate pool |
| Performance | Loaded preset, 200 candidate slots | < 250 ms p95 (assertion in Vitest perf) |
| Feature flag off | `smartScheduling: false` | Suggestions section hidden; manual booking unchanged |
| Audit on accept | Accept a suggestion | audit_log row contains scheduled_at, mechanic, reasons.kinds |
| A11y | Tab through suggestion cards | Reachable, screen reader announces "Sugerencia 1 de 3, martes 10:00, Manuel, electricista, carga baja" |

## Files to Touch

- [ ] `src/lib/scheduling/score.ts` — pure scorer
- [ ] `src/lib/scheduling/dimensions/proximity.ts`
- [ ] `src/lib/scheduling/dimensions/skill-match.ts`
- [ ] `src/lib/scheduling/dimensions/load-balance.ts`
- [ ] `src/lib/scheduling/dimensions/customer-preference.ts`
- [ ] `src/lib/scheduling/dimensions/availability-buffer.ts`
- [ ] `src/lib/scheduling/types.ts`
- [ ] `src/actions/admin/scheduling.ts` — `suggestSlots(input)`
- [ ] `src/core/components/admin/SuggestionCards.tsx` — 3-card display
- [ ] `src/core/components/admin/ReasonChip.tsx`
- [ ] `src/core/components/admin/NewAppointmentModal.tsx` — wire suggestions section
- [ ] `pb_migrations/2026XX_add_skills_to_staff.json` — add `skills` array field to `staff`
- [ ] `pb_migrations/2026XX_add_tags_to_services.json` — add `tags` array field to `services`
- [ ] `clients/talleres-amg/config.json` — `feature_flags.smartScheduling: true`, `scheduling.weights` defaults
- [ ] `scripts/seed/builders/staff.ts` — populate skills in fixtures (FEAT-043 update)
- [ ] `scripts/seed/data/services-tags.json` — service-tag mapping
- [ ] `tests/unit/scheduling/score.test.ts` — snapshot determinism + dimension tests
- [ ] `tests/e2e/admin/smart-scheduling.spec.ts`

## PR Sequencing

1. **PR 1** — `feat(scheduling): scorer dimensions + types + unit tests`. Branch: `feature/feat-049-scorer`. Files: dimensions, types, unit tests with snapshot determinism. No UI yet.
2. **PR 2** — `feat(scheduling): suggestSlots server action + skills/tags migrations + seed update`. Branch: `feature/feat-049-action`. Files: action, migrations, seed updates.
3. **PR 3** — `feat(admin): SuggestionCards + reason chips + NewAppointmentModal wiring`. Branch: `feature/feat-049-ui`. Files: UI components, modal integration.
4. **PR 4** — `test(e2e): smart scheduling Playwright + determinism + perf assertions`. Branch: `feature/feat-049-e2e`. Files: Playwright suite, perf assertions.

## Dependencies

- Depends on FEAT-015 (NewAppointmentModal), FEAT-020 (slot generation infra), FEAT-046 (audit).
- Optional: FEAT-043 fixture extension to seed mechanic skills + service tags.

## Builder-Validator Checklist

- [ ] All scorer queries scoped to `tenant_id`
- [ ] Scorer is pure / deterministic (snapshot test asserts)
- [ ] Weights configurable per tenant
- [ ] No PII leaves the tenant; no external API calls
- [ ] Suggestion accept writes one audit_log row including reasons
- [ ] Castilian Spanish reason chips
- [ ] Feature flag respected
- [ ] WCAG 2.1 AA on suggestion cards
- [ ] `npm run type-check` / `npm test` / `npm run lint` / Playwright clean
