# FEAT-001 — Electronics Services

## Intent

Add two new automotive electronics services to the platform: Diagnóstico Electrónico (OBD scan + diagnostic report) and Escáner OBD (quick fault code read). These are among the most requested services in modern workshops and are currently absent from the service catalog.

## Acceptance Criteria

1. [ ] `Diagnóstico Electrónico` and `Escáner OBD` appear in the ServiceGrid with correct pricing, duration, and IVA breakdown
2. [ ] Both services appear as options in the chatbot `ask_service` node
3. [ ] PocketBase seed (`scripts/db-setup.js`) includes both services so a fresh DB setup includes them
4. [ ] Chatbot flow `clients/talleres-amg/chatbot_flow.json` `ask_service` options include both new services
5. [ ] Selecting either service in the chatbot routes correctly to the matricula/booking flow
6. [ ] `npm run flows:validate` passes with new nodes

## Constraints

- **Tenant**: all PocketBase queries scoped to `tenant_id`
- **IVA**: prices defined as `base_price` (excl. IVA) — IVA applied dynamically from config
- **No hardcoded prices in chatbot flow** — use `{{config.key}}` or generic message
- **Compatibility**: icons from `lucide-react` only

## Out of Scope

- Payment processing
- Service-specific booking duration slot filtering (that is FEAT-003)

## Test Cases

| Scenario | Input | Expected |
|---|---|---|
| Happy path | User clicks "Diagnóstico Electrónico" in chatbot | Routes to matricula collection |
| Service grid | Page loads with PocketBase running | Both services visible with IVA breakdown |
| Seed | Fresh `node scripts/db-setup.js` | Both services exist in `services` collection |
| Flow validation | `npm run flows:validate` | OK, no errors |

## Services to Add

| Service | base_price | duration | category |
|---|---|---|---|
| Diagnóstico Electrónico | 45.00 | 60 min | electronica |
| Escáner OBD | 25.00 | 30 min | electronica |

## Files to Touch

- `scripts/db-setup.js` — add two services to seed array
- `clients/talleres-amg/chatbot_flow.json` — add options to `ask_service` node
- `src/core/components/ServiceGrid.tsx` — add `cpu` and `scan` icon mappings for category `electronica`
