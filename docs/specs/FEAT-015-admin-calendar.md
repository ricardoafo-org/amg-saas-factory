# FEAT-015 — Admin: Appointment Calendar

## Intent

A visual calendar showing all appointments, allowing the owner to see workload at a glance and drag-to-reschedule. The calendar is the operational heart of the management website. Inspired by Shop-Ware's calendar view, it must work well on both desktop and tablet.

## Acceptance Criteria

1. [ ] Calendar at `/admin/calendar` with Day / Week / Month views (toggle in topbar)
2. [ ] Each appointment shown as a colored block (color = status from status color system)
3. [ ] Appointment block shows: customer name, plate, service name(s), time
4. [ ] Clicking an appointment opens a side panel with full detail + quick actions
5. [ ] "Nueva cita" button opens a create modal with: date/time, customer (search or create new), service(s), notes
6. [ ] Week view shows all technicians as columns (if multiple staff in `staff` collection)
7. [ ] Month view shows appointment count per day; clicking a day goes to day view
8. [ ] Keyboard navigation: arrow keys move between days/weeks
9. [ ] Today highlighted in all views
10. [ ] Availability slots (`availability_slots` collection) shown as background shading — grey = unavailable
11. [ ] Mobile (≤768px): Day view only; swipe left/right to navigate days

## Calendar Design (Week View)

```
      Mon 14    Tue 15    Wed 16    Thu 17    Fri 18
08:00 ─────────────────────────────────────────────
09:00 [Carlos·  [        [Pending  [         [
      oil chg]   ──────   2-ITV]            ──────
10:00           María·            [Ana·      Pre-ITV]
                brake]             elect.]
```

## Constraints

- **Custom calendar**: no external calendar library (adds 200KB+); build custom with CSS Grid
- **No drag-to-reschedule in MVP**: add in post-Sprint 6 (complex UX, deferred)
- **Tenant**: all appointment queries scoped to tenantId
- **Timezone**: always `Europe/Madrid` (Cartagena, Murcia)

## Files to Touch

- `src/app/(admin)/admin/calendar/page.tsx` — calendar page
- `src/core/components/admin/Calendar.tsx` — custom calendar (day/week/month)
- `src/core/components/admin/AppointmentModal.tsx` — create/edit appointment modal
- `src/actions/admin/appointments.ts` — add `getAppointmentsByRange()`, `createAppointment()`
