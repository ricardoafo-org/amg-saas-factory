# FEAT-014 — Admin: Today's Command Center

## Intent

The default admin landing page gives the owner an instant overview of what's happening right now: today's appointments, bay status, revenue, and any urgent alerts. Inspired by Tekmetric's "Dashboard" and Shop-Ware's "Today" view. This is the page the owner sees first every morning on their phone or tablet.

## Acceptance Criteria

1. [ ] Page at `/admin` shows real-time appointments for today (refresh every 30s via polling or PB subscription)
2. [ ] KPI row: "Citas hoy" (count), "En taller" (in_progress count), "Listas" (ready count), "Ingresos hoy" (€ sum of confirmed+completed appointments, base amount × (1 + iva_rate))
3. [ ] Each KPI card shows delta vs. yesterday (↑3 / ↓1 format)
4. [ ] Appointment timeline for today: sorted by `scheduled_at`; each card shows: customer name, plate, service(s), status badge, assigned tech
5. [ ] One-tap status update on appointment card (swipe or button: Confirmar → En taller → Listo → Entregado)
6. [ ] "Próximas 48h" section: appointments tomorrow + day after (collapsed by default, expandable)
7. [ ] Alert banner if any appointment has no phone number (can't send SMS reminder)
8. [ ] Empty state: "No hay citas programadas para hoy. ¡Disfruta el día! ☕"
9. [ ] Page renders in < 500ms (server component fetch, no loading spinner on initial paint)

## KPI Card Design

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Citas hoy  │  │  En taller  │  │    Listas   │  │ Ingresos hoy│
│     12      │  │      3      │  │      2      │  │   €847,00   │
│   ↑4 vs ayer│  │             │  │             │  │  ↑12% vs ayer│
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

## Appointment Card Design

```
┌────────────────────────────────────────────────────────┐
│ 09:30  Carlos García · 1234-ABC             [Confirmar]│
│        Cambio de aceite + Revisión frenos              │
│        👤 Técnico: Manuel    ⏱ ~90 min                │
└────────────────────────────────────────────────────────┘
```

## Constraints

- **Real-time**: 30s polling via `setInterval` + `router.refresh()` (Server Component cache revalidation)
- **Performance**: Server Component fetches today's data; Client Component handles status updates
- **Tenant**: all queries scoped to `tenantId` from `getStaffCtx()`
- **Mobile-first**: KPI row scrolls horizontally on mobile (no wrap); cards full-width

## Files to Touch

- `src/app/(admin)/admin/page.tsx` — today's command center
- `src/core/components/admin/KpiCard.tsx` — new reusable KPI card
- `src/core/components/admin/AppointmentCard.tsx` — today appointment card with status update
- `src/actions/admin/appointments.ts` — new: `getTodayAppointments()`, `updateAppointmentStatus()`
- `src/actions/admin/kpis.ts` — new: `getTodayKpis()`, `getYesterdayKpis()`
