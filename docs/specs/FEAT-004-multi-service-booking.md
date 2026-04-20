# FEAT-004 — Multi-Service Booking

## Intent

Allow customers to book multiple services in a single appointment. Currently only one service per booking is possible. A customer wanting an oil change + brake inspection must make two separate bookings. This reduces conversions and creates unnecessary friction.

## Acceptance Criteria

1. [ ] Chatbot `ask_service` step allows selecting multiple services (multi-select with confirm step)
2. [ ] Total duration is summed across selected services and shown before slot selection
3. [ ] Total price (base + IVA) is summed and shown in booking summary before LOPDGDD consent
4. [ ] `appointments` collection stores `service_ids` as JSON array (schema migration in `db-setup.js`)
5. [ ] `saveAppointment()` accepts `serviceIds: string[]` and stores correctly
6. [ ] Email confirmation lists all selected services
7. [ ] At least one service must be selected — empty selection shows validation message
8. [ ] `npm run type-check` → zero exit with new types

## Constraints

- **LOPDGDD**: consent flow unchanged — still after email collection, before save
- **IVA**: each service price fetched dynamically; IVA from config — never hardcoded
- **Tenant isolation**: all queries scoped to `tenant_id`
- **Schema change**: `appointments.service_id` (text) → `appointments.service_ids` (JSON text); handle migration in `db-setup.js` collection definition
- **Backwards compatibility**: existing appointment records with single `service_id` are not affected (new field added alongside, or collection redefined with new field name)

## Out of Scope

- Slot duration-aware filtering based on total duration (nice to have, deferred)
- Quantity per service (1 of each maximum)
- Admin UI for multi-service appointment management

## Test Cases

| Scenario | Input | Expected |
|---|---|---|
| Single service | Select oil change only | Works as before |
| Multi-service | Select oil change + brake check | Both shown in summary, prices summed |
| Empty selection | Confirm with no services | Validation: "Selecciona al menos un servicio" |
| Email | Book multi-service | Email lists both services |
| Type check | After schema change | `npm run type-check` zero exit |

## Schema Change

```
appointments collection:
  BEFORE: service_id (text, required)
  AFTER:  service_ids (json, required)  ← array of service ID strings
```

## Files to Touch

- `scripts/db-setup.js` — update appointments collection schema: `service_ids` JSON field
- `src/actions/chatbot.ts` — `AppointmentPayload.serviceIds: string[]`; update create call; update email summary
- `src/core/chatbot/ChatEngine.tsx` — multi-select UI for service options; summary step before LOPD
- `clients/talleres-amg/chatbot_flow.json` — `ask_service` node updated for multi-select pattern
- `src/core/types/adapter.ts` — `Service` type unchanged; update any payload types
