# FEAT-013 — Admin Core (Auth, Layout, Navigation, New Collections)

## Intent

Establish the foundation for the owner management website: authentication middleware, the admin shell layout (sidebar + topbar), and all new PocketBase collections required by Sprints 5–6. Everything else in the dashboard builds on this foundation.

## Acceptance Criteria

1. [ ] `staff` auth collection created in PocketBase with fields: `tenant_id`, `role` (owner/technician/admin), `display_name`, `phone`, `active`
2. [ ] `customers` collection created with fields per ADR-008
3. [ ] `vehicles` collection created with fields per ADR-008
4. [ ] `work_orders` collection created with fields: `tenant_id`, `appointment_id`, `customer_id`, `vehicle_id`, `status` (intake/diagnosis/repair/quality_check/ready/delivered), `tech_notes`, `estimated_ready`, `actual_cost`, `labor_minutes`
5. [ ] `sms_log` collection created with fields: `tenant_id`, `to_phone`, `message`, `status` (sent/delivered/failed), `provider_id`, `appointment_id`
6. [ ] `middleware.ts` at project root protects all `/admin/**` routes; unauthenticated → redirect `/admin/login`
7. [ ] `src/app/(admin)/admin/login/page.tsx` — login form with email + password, PocketBase staff auth
8. [ ] `src/app/(admin)/layout.tsx` — AdminLayout with collapsible sidebar + topbar
9. [ ] Sidebar navigation items: Hoy, Calendario, Citas, Clientes, Vehículos, Presupuestos, Comunicaciones, Informes, Configuración
10. [ ] Sidebar collapses to icon-only on desktop; bottom tab bar on mobile (≤768px)
11. [ ] Topbar: breadcrumb, global search input (by customer name or plate), "Nueva cita" button, user avatar + logout
12. [ ] Admin routes return 401/redirect for unauthenticated requests
13. [ ] `src/lib/auth.ts` — add `getStaffCtx()` function (reads `pb_auth` httpOnly cookie)
14. [ ] `scripts/db-setup.js` — seed initial owner staff account + all new collections
15. [ ] `npm run type-check` → zero exit

## Admin Shell Design

```
┌─────────────────────────────────────────────┐
│  [≡] AMG Talleres            [🔍] [+ Cita]  │  ← Topbar
├──────────┬──────────────────────────────────┤
│          │                                  │
│  🏠 Hoy  │         Page content             │
│  📅 Cal  │                                  │
│  📋 Citas│                                  │
│  👤 Cli  │                                  │
│  🚗 Veh  │                                  │
│  💰 Pres │                                  │
│  💬 Com  │                                  │
│  📊 Info │                                  │
│  ⚙️  Conf│                                  │
│          │                                  │
│ [Avatar] │                                  │
└──────────┴──────────────────────────────────┘
```

## Status Color System (CSS custom properties)

```css
--status-pending:    theme(colors.amber.500)
--status-confirmed:  theme(colors.sky.500)
--status-in-progress: theme(colors.violet.500)
--status-ready:      theme(colors.emerald.500)
--status-completed:  theme(colors.slate.400)
--status-cancelled:  theme(colors.rose.500)
```

## Constraints

- **Auth**: httpOnly cookie `pb_auth` — no localStorage for auth tokens (XSS protection)
- **Middleware**: must NOT interfere with public routes (`/`, `/politica-*`, `/admin/login`)
- **Tenant isolation**: `getStaffCtx()` returns `{ pb, tenantId, staffId, role }`
- **Mobile**: bottom tab bar shows only top 5 items; "Más" opens sheet for rest

## Files to Touch

- `middleware.ts` — new file at project root
- `src/app/(admin)/layout.tsx` — new AdminLayout
- `src/app/(admin)/admin/login/page.tsx` — new login page
- `src/app/(admin)/admin/page.tsx` — placeholder "Hoy" page (FEAT-014 fills it)
- `src/lib/auth.ts` — add `getStaffCtx()`
- `src/core/components/admin/Sidebar.tsx` — new sidebar component
- `src/core/components/admin/Topbar.tsx` — new topbar component
- `pb_migrations/` — new migrations for staff, customers, vehicles, work_orders, sms_log
- `scripts/db-setup.js` — seed all new collections
- `src/app/globals.css` — add status color tokens
