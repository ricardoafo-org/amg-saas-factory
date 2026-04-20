# FEAT-020 — Admin: Business Settings

## Intent

Allow the owner to manage all business configuration directly from the dashboard without touching PocketBase admin or config files. This includes: business info, operating hours, service catalog (add/edit/remove services with pricing), availability slot generation, staff management, and notification preferences.

## Acceptance Criteria

### Business Info
1. [ ] Edit: business name, tagline, address, phone, email, WhatsApp
2. [ ] Edit: opening hours per day (open/closed toggle + time range)
3. [ ] Save writes to PocketBase `config` collection (tenant_id scoped)
4. [ ] Changes reflected on public-facing site within 60 seconds (ISR revalidation)

### Service Catalog
5. [ ] Table of all services with: name, category, base price (excl. IVA), duration, active toggle
6. [ ] Add service: name, category, base price, duration (minutes), description
7. [ ] Edit service inline (click row)
8. [ ] Deactivate service (soft delete — hidden from public site but preserved in appointment history)
9. [ ] IVA rate shown next to each price (read-only, from config)

### Availability Slots
10. [ ] "Generar huecos" tool: select date range + time range + interval (e.g., 9am–6pm every 30 min on weekdays)
11. [ ] Preview grid of slots to be created before confirming
12. [ ] Batch create slots in `availability_slots` collection
13. [ ] Delete individual slots (single-day exceptions)
14. [ ] View slots calendar for next 30 days

### Staff Management
15. [ ] List of staff (name, role, active status)
16. [ ] Add staff: name, email, role (owner/technician/admin), phone
17. [ ] Deactivate staff account (sets `active: false`)
18. [ ] Change own password

### Notification Preferences
19. [ ] Toggle per notification type: email confirmation, SMS reminder 24h, SMS reminder 2h, SMS vehicle ready
20. [ ] Preferences stored in `config` collection

## Constraints

- **Role guard**: only `owner` role can access settings; `technician` sees read-only
- **IVA rate change**: warn owner that changing IVA rate affects all new appointments (does not retroactively change historical records)
- **Slot generation**: cap at 500 slots per batch (prevent accidental overgeneration)
- **Tenant isolation**: all config reads/writes scoped to tenantId from staff session

## Files to Touch

- `src/app/(admin)/admin/settings/page.tsx` — settings page (tabbed: Negocio, Servicios, Horarios, Personal, Notificaciones)
- `src/core/components/admin/ServiceCatalogEditor.tsx`
- `src/core/components/admin/SlotGenerator.tsx`
- `src/core/components/admin/StaffManager.tsx`
- `src/actions/admin/settings.ts` — new: `updateBusinessConfig()`, `createService()`, `updateService()`, `generateSlots()`, `addStaff()`
