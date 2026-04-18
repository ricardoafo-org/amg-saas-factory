---
paths:
  - "src/actions/**/*.ts"
  - "src/app/api/**/*.ts"
---

# Server Action Rules

Applied automatically to all files in `src/actions/` and `src/app/api/`.

## Mandatory patterns

- Mark file with `'use server'` at top
- Every PocketBase query MUST include `tenant_id` in filter — never query without it
- IVA rate MUST be fetched from `config` collection — never hardcode `0.21` or `1.21`
- Log LOPDGDD consent BEFORE saving any appointment or personal data
- Do not log PII (email, phone, name) to console

## LOPDGDD order of operations (booking flows)

1. `consent_log.create()` — if this fails, throw — do NOT save appointment
2. `appointments.create()` — only after consent is logged

## Error handling

- Catch PocketBase errors at the boundary, return typed error shapes to client
- Never expose raw PocketBase error messages to the client (may contain schema details)
