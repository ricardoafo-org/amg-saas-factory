# Decision: Schedule Depth — Standard (Rules + Generator + Manual Override)

**Date:** 2026-04-27
**Owner:** ricardoafo
**Status:** Decided
**Phase:** FEAT-051.5 Discovery #3
**Implements:** Week 4 of [backend-foundation rebuild](../../../.claude/plans/humble-yawning-forest.md)

## Problem

The admin needs a usable, complete schedule management system. Today: 84 manually-seeded `availability_slots` records on tst — no rules, no capacity, no vacation handling, no way to add a phone booking. Going forward, AMG needs to:

1. **See the next 7-14 days** of appointments with a multi-day calendar view.
2. **Add bookings manually** for phone calls and walk-ins (with LOPDGDD-compliant verbal-consent recording).
3. **Capacity per service** — e.g., we can do 2 oil changes simultaneously but only 1 ITV inspection.
4. **Recurring weekly slots** — Mon-Fri 9-13 + 16-19, no Sundays — defined once, generates forward.
5. **Vacation / closure blocking** — admin marks date ranges as closed (Christmas week, owner vacation, holiday).

Cal.com, Booksy, and Square Appointments solve this with rules + generated slots + per-instance overrides. The decision is what data model to adopt and where the sophistication boundary sits.

## Options Considered

### Option A — Pre-generated slots (current)
Today's model: `availability_slots` rows are seeded directly. Admin manages individually.

- **Pros:** simple to query; fast; current state.
- **Cons:** every rule change requires re-seeding; no capacity model; vacation blocking is manual one-by-one; doesn't scale beyond a few weeks.
- **Disqualified:** doesn't satisfy capability #3 (capacity) or #4 (recurring) without bolt-ons.

### Option B — Rules + generator (RECOMMENDED — "Standard")
Three data layers:
1. **Rules** (`business_hours`, `service_capacity`, `holidays`) define WHAT schedule is open.
2. **Generator** (script + nightly cron) produces `availability_slots` for the next 30 days from the rules.
3. **Overrides** (`slot_overrides` table) let admin block/unblock individual slots without changing rules.

- **Pros:** the de-facto industry pattern (Booksy, Square Appointments, even Cal.com event types reduce to this); fast queries (slots are indexed); rule changes regenerate forward; handles vacations cleanly.
- **Cons:** more schemas (4 vs 1); generator job is one more thing to monitor.

### Option C — Computed on-demand ("Advanced")
No `availability_slots` table. Compute availability at query time from rules + appointments.

- **Pros:** rules are the only source of truth; no regeneration; rule changes take effect instantly.
- **Cons:** slower (query computes per-call); harder to optimize for large date ranges; clashes with the current chatbot's slot caching; doesn't fit our PB schema-as-code direction.
- **Disqualified for v1:** premature optimization. Revisit if rule-change cadence becomes high.

### Option D — Cal.com-style event types ("Advanced+")
Each service is a "scheduling object" with its own buffers, working hours, durations, multi-availability windows. Cal.com's model.

- **Pros:** ultimate flexibility (service-specific availability windows, per-service buffers).
- **Cons:** ~10 days implementation; over-engineered for one shop with consistent hours; user requirements don't justify this level.
- **Disqualified for v1:** parked as future option if AMG-the-product gains tenants with very different scheduling needs.

## Recommendation

**Option B — Standard depth: rules + generator + per-instance overrides.**

Schema sketch (locks Week 1 schema-as-code authoring):

```text
business_hours
  tenant_id, weekday (0=Sun..6=Sat), open_time, close_time,
  lunch_break_start, lunch_break_end, is_open

service_capacity
  tenant_id, service_id, max_concurrent (default 1),
  slot_duration_minutes (default 60, can override per-service)

holidays
  tenant_id, date_start, date_end, reason
  -- e.g., {"date_start": "2026-12-24", "date_end": "2026-12-26", "reason": "Christmas"}

slot_overrides
  tenant_id, slot_date, slot_time, action (BLOCK | EXTRA_CAPACITY),
  staff_id (who set this), note

availability_slots (generated, NOT manually edited)
  tenant_id, slot_date, start_time, end_time, capacity, booked,
  service_id (if service-specific), generated_at
```

**Generation contract:**
- `scripts/generate-slots.ts --tenant {id} --days 30` reads rules, applies overrides, writes/upserts `availability_slots` for the next N days. Idempotent.
- Runs nightly via cron (Vercel Cron / GitHub Actions schedule / VPS systemd timer — decided at deploy time).
- Also runs on-demand after admin saves business_hours, service_capacity, or holidays changes (Server Action triggers it).
- Generation respects `slot_overrides`: BLOCK overrides delete the slot; EXTRA_CAPACITY adds capacity to existing.

**Manual booking flow** (per user requirements + plan Week 4):
- Admin opens calendar → clicks empty slot OR "+ Manual booking" button.
- Modal: search existing customer by name/email/phone; create new if not found.
- Select services from active service catalog; select vehicle (existing or new).
- Select slot from generated `availability_slots` (or override outside business hours with admin warning).
- Mark `appointments.source = phone | walk-in | online`.
- **LOPDGDD verbal consent**: admin records `consent_log.context = 'verbal_admin'` (phone) or `'in_person_admin'` (walk-in) with admin `staff_id` as witness. Rubric F2 ordering: consent recorded BEFORE personal-data write.

**Multi-day view:**
- `/admin/calendar` shows next 7-14 days as a grid (rows = days, columns = time slots).
- Color-coded by service type or status (confirmed/pending/completed).
- Drag-to-reschedule (writes to `appointments.scheduled_at`, validates against capacity).
- Click slot → side panel with appointment detail / "+ Manual booking" if empty.

**Recurring slots and vacation:**
- Admin Settings → Schedule tab has tabs for: Business hours (table per weekday), Capacity per service (list with per-service input), Holidays (date-range list).
- Saving any of these triggers a regeneration via Server Action.

## Justification (References / Data)

**Industry references:**

| Service | Model | What we adopted |
|---|---|---|
| **Booksy** | Per-shop hours + per-service duration + admin override | All of it (Standard depth ≈ Booksy's model) |
| **Square Appointments** | Hours + buffer + capacity + closures | Buffer pattern not adopted (over-engineering) |
| **Cal.com** | Event types with rich availability rules | Adopted: rules → generator pattern. Did NOT adopt: per-event availability windows (overkill) |
| **Calendly** | Working hours + event durations + holidays | Same as Booksy |

**Why generator pattern (vs computed on-demand):**
- The chatbot's slot picker queries `availability_slots` 100x more often than the schedule changes. Pre-generation amortizes the cost.
- Slot caching in the chatbot ([src/core/chatbot/slot-cache.ts](../../src/core/chatbot/slot-cache.ts)) already assumes pre-generated slots.
- Backwards compatible with the 84 slots we manually seeded last night — those become the first generator output.

**LOPDGDD considerations for manual booking:**
- Verbal consent (phone) is acceptable under LOPDGDD if recorded with timestamp, witness (staff_id), and consent context (rubric F2). Not formal opt-in clickwrap, but legally sufficient for a service-purpose contract.
- Walk-in consent (in-person) is similarly acceptable.
- Both must surface in the customer's data export (right of access) and audit register.
- The `consent_log` row links the manual appointment to a specific staff member — protects against "I never gave consent" disputes.

## Files Affected

When implemented (Week 4):

**Schemas (Week 1 prep):**
- [src/schemas/business_hours.schema.json](../../src/schemas/business_hours.schema.json) — NEW
- [src/schemas/service_capacity.schema.json](../../src/schemas/service_capacity.schema.json) — NEW
- [src/schemas/holidays.schema.json](../../src/schemas/holidays.schema.json) — NEW
- [src/schemas/slot_overrides.schema.json](../../src/schemas/slot_overrides.schema.json) — NEW
- [src/schemas/availability_slots.schema.json](../../src/schemas/availability_slots.schema.json) — extend with `generated_at`, `service_id` (nullable for pre-FEAT-054 records)
- [src/schemas/appointments.schema.json](../../src/schemas/appointments.schema.json) — add `source: phone | walk-in | online`, `consent_context: web | verbal_admin | in_person_admin`, `created_by_staff_id` (nullable)

**Scripts (Week 1):**
- [scripts/generate-slots.ts](../../scripts/generate-slots.ts) — reads rules, writes `availability_slots`, idempotent.
- [scripts/seed-tenant.ts](../../scripts/seed-tenant.ts) — extend to seed default business_hours (Mon-Fri 9-13/16-19) + capacity rules + zero holidays.

**Server actions (Week 4):**
- [src/actions/admin/schedule.ts](../../src/actions/admin/schedule.ts) — `updateBusinessHours`, `upsertServiceCapacity`, `upsertHoliday`, `regenerateSlots`, `overrideSlot`.
- [src/actions/admin/appointments.ts](../../src/actions/admin/appointments.ts) — extend `createAppointmentManual({customer, vehicle, services, slot, source, consentContext})`.

**Components (Week 4):**
- [src/core/components/admin/CalendarView.tsx](../../src/core/components/admin/CalendarView.tsx) — multi-day grid, drag-to-reschedule.
- [src/core/components/admin/NewAppointmentModal.tsx](../../src/core/components/admin/NewAppointmentModal.tsx) — manual booking with source + verbal-consent UX.
- [src/core/components/admin/settings/ScheduleSettings.tsx](../../src/core/components/admin/settings/ScheduleSettings.tsx) — tabs for hours, capacity, holidays.

**Tests (Week 4):**
- [tests/lib/generate-slots.test.ts](../../tests/lib/generate-slots.test.ts) — unit-tests for rule application, holiday blocking, override merging, idempotency.
- [tests/api/admin-schedule-contract.spec.ts](../../tests/api/admin-schedule-contract.spec.ts) — Server Actions contract.

## Timeline Impact

**Within Week 4 budget (5 days).** Allocations:
- Day 1: schemas + generator script + seed-tenant extension
- Day 2: server actions for schedule rules + manual booking
- Day 3: CalendarView component (multi-day) + drag-to-reschedule
- Day 4: NewAppointmentModal + ScheduleSettings UI
- Day 5: tests + polish

**Schema work shifts to Week 1** (schemas live with the foundation). Generator script implementation stays in Week 4 (depends on rules being seeded by Week 4 anyway).

## Open Questions / Follow-ups

- **Cron infrastructure:** decision deferred to deploy-time. Options: VPS systemd timer (simplest), GitHub Actions schedule (free, depends on github), Vercel Cron (if we ever host on Vercel — not currently). VPS systemd is the right answer for our self-hosted setup; document in deploy runbook at Week 5.
- **Per-service slot-time rounding:** if oil change is 30 min and ITV is 60 min, do we generate 30-min slots or 60-min slots? **Decision:** generate at the smallest service duration granularity (30 min); admin booking validates against the specific service's required duration.
- **Buffer time between appointments:** not modeled in v1 (assumes services are scheduled back-to-back). Add `service_capacity.buffer_minutes` if customer-side bookings collide post-launch. Defer.
- **Multi-staff scheduling:** not modeled. v1 assumes "the shop" is the unit of capacity, not "this mechanic". When multiple staff need separate schedules, this becomes Cal.com Option D — a future epic.
- **Time zones:** assume Europe/Madrid throughout (single tenant, single location). Add `timezone` to `business_hours` if AMG-the-product gains tenants outside Spain. Deferred.
