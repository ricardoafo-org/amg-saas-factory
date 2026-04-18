# FEAT-019 — Admin: Reports & Analytics

## Intent

Give the owner a clear picture of business health: monthly revenue, most popular services, customer retention, and slot utilization. This is the "how are we doing?" page that a shop owner checks weekly. Inspired by Tekmetric's reporting and Stripe's dashboard charts.

## Acceptance Criteria

1. [ ] Date range picker: Last 7 days / Last 30 days / This month / Last month / Custom range
2. [ ] Revenue chart: bar chart showing daily revenue (base excl. IVA + IVA + total) for selected range
3. [ ] Service breakdown: pie/donut chart showing revenue by service category
4. [ ] Top customers: table of top 10 customers by spend in the period
5. [ ] Appointment volume: count by status (completed/cancelled/no-show) for the period
6. [ ] Quote conversion rate: (approved quotes / total quotes) × 100 for the period
7. [ ] Slot utilization: (booked slots / total available slots) × 100 by week
8. [ ] All charts server-side computed (aggregation in PocketBase query); client-side rendering only
9. [ ] Export to CSV: revenue data and appointment list for selected range
10. [ ] Mobile: charts scroll horizontally; table collapses to key columns

## Revenue Chart Design

```
€ Revenue — Abril 2026
800┤         ▄
600┤    ▄   ██  ▄
400┤  ▄ ██ ███ ██  ▄
200┤▄ ██ ██ ███ ██ ██
   └─────────────────────
    L  M  X  J  V  S  D
    ■ Base  ■ IVA  ■ Total
```

## KPI Summary Row

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Ingresos   │  │  Citas      │  │  Tasa conv. │  │  Nuevo cli  │
│  €4.280     │  │  89         │  │  68%        │  │  12         │
│  ↑15% vs mes│  │  ↓3 vs mes  │  │  ↑5%        │  │  ↑4         │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

## Constraints

- **Recharts**: for all charts (added in ADR-005); lazy-loaded per page
- **Server aggregation**: heavy queries run server-side; client receives computed totals
- **IVA**: show both base and total in revenue charts (transparency)
- **No PII in charts**: reports show aggregated data only (no individual customer names except top-customers table)
- **CSV export**: generate server-side with `Content-Disposition: attachment` header

## Files to Touch

- `src/app/(admin)/admin/reports/page.tsx`
- `src/core/components/admin/RevenueChart.tsx` (Recharts bar chart)
- `src/core/components/admin/ServiceBreakdown.tsx` (Recharts pie chart)
- `src/core/components/admin/TopCustomers.tsx`
- `src/actions/admin/reports.ts` — new: `getRevenueByDay()`, `getServiceBreakdown()`, `getTopCustomers()`, `exportRevenueCSV()`
- `package.json` — add `recharts`
