# FEAT-016 — Admin: Customer & Vehicle Management

## Intent

Give the owner a complete view of every customer and their vehicles. A returning customer should be recognized immediately with their full history. The vehicle lookup (by plate) is essential for fleet customers and for ITV reminder campaigns.

## Acceptance Criteria

### Customers (`/admin/customers`)
1. [ ] Searchable, sortable list of all customers (by name, email, last visit)
2. [ ] Each row: name, email, phone, vehicle count, last visit date, total spend (€)
3. [ ] Click row → customer profile page

### Customer Profile (`/admin/customers/[id]`)
4. [ ] Shows: contact info, marketing consent status, first seen, total visits, total spend
5. [ ] Vehicles section: all vehicles for this customer with plate, brand/model/year, last km, ITV expiry
6. [ ] Service history: all appointments (paginated, 10/page) with date, service, cost, status
7. [ ] Quick actions: "Enviar SMS", "Nueva cita", "Editar cliente"
8. [ ] Edit modal: update name, phone, notes, preferred contact, marketing consent

### Vehicles (`/admin/vehicles`)
9. [ ] Search by plate (primary use case)
10. [ ] List shows: plate, brand/model, customer name, last service date, ITV expiry (red if expired or < 30 days)
11. [ ] Click → vehicle detail: full service history for that vehicle

### Vehicle Detail
12. [ ] Edit vehicle: update km, ITV expiry date, fuel type, notes
13. [ ] ITV countdown widget (reuse `ItvCountdown` logic)

## Customer 360 Layout

```
┌──────────────────────────────────────────────────┐
│ Carlos García                     [SMS] [+ Cita] │
│ 📧 carlos@mail.com  📞 600-123-456               │
│ Primera visita: 12 Mar 2024 · Última: 2 Abr 2026 │
│ 12 visitas · €1.247 total                        │
├──────────────────────────────────────────────────┤
│ VEHÍCULOS                                        │
│ 🚗 1234-ABC  Seat León  2019  ITV: Jun 2026 ⚠️  │
│ 🚗 5678-XYZ  Toyota Yaris 2022  ITV: Nov 2027 ✓ │
├──────────────────────────────────────────────────┤
│ HISTORIAL                                        │
│ 02 Abr 2026  Cambio aceite         €48  ✓ Hecho │
│ 15 Ene 2026  Pre-ITV + frenos     €95  ✓ Hecho  │
└──────────────────────────────────────────────────┘
```

## Constraints

- **Pagination**: max 50 customers per page; cursor-based pagination in PB
- **Search debounce**: 300ms before firing PB query
- **Tenant**: all queries scoped; customer edit validates ownership
- **LOPDGDD**: edit form shows current marketing consent status; changing requires user confirmation

## Files to Touch

- `src/app/(admin)/admin/customers/page.tsx`
- `src/app/(admin)/admin/customers/[id]/page.tsx`
- `src/app/(admin)/admin/vehicles/page.tsx`
- `src/core/components/admin/CustomerTable.tsx`
- `src/core/components/admin/CustomerProfile.tsx`
- `src/core/components/admin/VehicleTable.tsx`
- `src/actions/admin/customers.ts` — new: `getCustomers()`, `getCustomer()`, `updateCustomer()`, `deleteCustomer()`
- `src/actions/admin/vehicles.ts` — new: `getVehicles()`, `getVehicle()`, `updateVehicle()`
