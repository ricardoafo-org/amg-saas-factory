---
id: ADR-005
title: Owner dashboard — full management website architecture
status: accepted
date: 2026-04-18
---

## Context

Sprint 6 requires an owner-facing management website at `/admin`. Research of best-in-class automotive shop management UIs (Shop-Ware, Tekmetric, AutoLeap, Mitchell1 Manager SE) identifies the following MVP requirements: today's command center, appointment calendar, customer/vehicle management, work orders, quotes, SMS communications, and reporting. This is effectively a second product co-located in the same Next.js app.

## Decision

Build the owner dashboard as a Next.js App Router route group `(admin)` with its own layout, sidebar navigation, and Server/Client component split. Use PocketBase real-time subscriptions for live "today" view. Add `recharts` for analytics charts. No additional UI framework — extend the existing design system.

## Route Structure

```
src/app/(admin)/
├── layout.tsx                    # AdminLayout: sidebar + topbar + auth guard
├── admin/
│   ├── page.tsx                  # Today's command center (live data)
│   ├── login/page.tsx            # Staff login
│   ├── calendar/page.tsx         # Appointment calendar (day/week/month)
│   ├── appointments/
│   │   ├── page.tsx              # All appointments table
│   │   └── [id]/page.tsx         # Appointment detail + work order
│   ├── customers/
│   │   ├── page.tsx              # Customer list
│   │   └── [id]/page.tsx         # Customer 360 (vehicles, history, spend)
│   ├── vehicles/
│   │   └── page.tsx              # Vehicle lookup by plate
│   ├── quotes/
│   │   ├── page.tsx              # Quote pipeline (kanban by status)
│   │   ├── new/page.tsx          # Create quote
│   │   └── [id]/page.tsx         # Quote detail + approve/reject actions
│   ├── comms/page.tsx            # SMS communication center
│   ├── reports/page.tsx          # Revenue + service breakdown charts
│   └── settings/page.tsx         # Business settings (hours, services, pricing)
```

## UI Design Principles (research-based)

- **Sidebar navigation** (collapsible, icon+label): mirrors Linear/Vercel pattern — fastest spatial memory
- **Top command bar**: global search (by customer name or plate), quick "Nueva cita" CTA, notification bell
- **Status color system**: pending=amber, confirmed=sky, in_progress=violet, ready=emerald, completed=slate, cancelled=rose
- **Today view**: bay status grid (n bays, each showing current appointment), KPI cards (revenue today, appointments today, queue length), mini calendar with today highlighted
- **Mobile**: sidebar collapses to bottom nav (5 tabs: Home, Calendar, Appointments, Customers, More)
- **Typography**: Geist Sans (already in stack); tabular numbers for revenue
- **Dark mode**: respects existing `next-themes` ThemeProvider

## New Collections Required

| Collection | Purpose |
|---|---|
| `staff` | Auth collection for dashboard users |
| `customers` | Deduplicated customer profiles |
| `vehicles` | Vehicles linked to customers |
| `work_orders` | Repair orders (status: intake→diagnosis→repair→ready→delivered) |
| `quotes` | Presupuestos (ADR-002) |
| `sms_log` | SMS delivery audit trail |
| `cookie_consents` | LSSI-CE consent log (ADR-003) |

## New npm packages

| Package | Purpose | Bundle impact |
|---|---|---|
| `recharts` | Revenue + service charts in reports page | ~120KB gzip (lazy-loaded) |
| `date-fns` | Calendar arithmetic, slot display | ~20KB gzip (tree-shaken) |
| `twilio` | SMS reminders (server-side only) | 0KB client |

## Alternatives Considered

| Option | Rejected because |
|---|---|
| Separate Next.js app for admin | Two repos, two deploys, shared auth complexity |
| Admin in PocketBase built-in UI | Not brandable; can't add custom views/charts; not multi-tenant |
| React Admin framework | Heavy dependency (600KB+); opinionated styling conflicts with design system |
| Retool / low-code | Not self-hosted; data leaves the stack; no code ownership |

## Consequences

- Positive: Single deploy, shared auth, shared PocketBase instance
- Positive: Design system consistency between customer-facing and owner-facing UIs
- Positive: Server Components for data-heavy pages (tables, reports) = fast TTFB
- Negative: Route group `(admin)` adds complexity to App Router structure
- Negative: `recharts` adds ~120KB to admin bundle (acceptable; lazy-loaded per page)
- Neutral: Auth middleware must distinguish admin routes from public routes

## Review trigger

When multi-location support (multiple bays/technicians across branches) is needed, or when a mobile native app is considered.
