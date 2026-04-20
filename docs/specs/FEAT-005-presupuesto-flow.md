# FEAT-005 — Presupuesto (Quote) Flow

## Intent

Add a quote request flow to the chatbot and a `quotes` PocketBase collection. Under RD 1457/1986, workshops must provide a written quote before performing any repair. Making this digitally available increases trust, compliance, and conversion for complex jobs (mechanics, electronics) where the customer doesn't know the price upfront.

## Acceptance Criteria

1. [ ] Chatbot welcome options include "Solicitar presupuesto"
2. [ ] Quote flow collects: service type, vehicle description, problem description, customer name, phone, email
3. [ ] LOPDGDD consent collected before saving quote request
4. [ ] Quote request saved to `quotes` PocketBase collection (new)
5. [ ] Confirmation email sent to customer: "Hemos recibido tu solicitud. Te contactaremos en 24h con el presupuesto."
6. [ ] `quotes` collection includes: `tenant_id`, `customer_name`, `customer_email`, `customer_phone`, `vehicle_description`, `problem_description`, `service_type`, `status` (pending/sent/accepted/rejected), `created`
7. [ ] Quote request clearly labelled as non-binding: "Este presupuesto es orientativo y sin compromiso"
8. [ ] `npm run flows:validate` passes

## Constraints

- **LOPDGDD**: consent BEFORE saving any personal data — same pattern as appointments
- **RD 1457/1986**: quote validity must be communicated (we state "válido 12 días hábiles" per law)
- **Tenant isolation**: all queries to `quotes` scoped to `tenant_id`
- **IVA**: quote is pre-IVA; IVA applied when final invoice issued (state this in the confirmation)
- **No hardcoded prices**: quote is open-ended — no price committed at this stage

## Out of Scope

- Quote PDF generation
- Quote approval workflow with pricing (admin sets price later via PocketBase admin UI)
- WhatsApp quote delivery

## Test Cases

| Scenario | Input | Expected |
|---|---|---|
| Happy path | User completes quote flow | Record in `quotes`, email sent |
| LOPD consent | User rejects consent | Flow stops, no data saved |
| Email | Quote submitted | Customer receives "Te contactaremos en 24h" |
| Flow validation | `npm run flows:validate` | OK |

## Files to Touch

- `scripts/db-setup.js` — add `quotes` collection schema + seed
- `src/actions/chatbot.ts` — add `saveQuoteRequest()` server action
- `clients/talleres-amg/chatbot_flow.json` — add quote flow nodes + welcome option
- `src/core/chatbot/ChatEngine.tsx` — add `save_quote` action handler
