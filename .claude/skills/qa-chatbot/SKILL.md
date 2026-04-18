# QA Skill — Chatbot Testing

Domain: Testing the rule-based chatbot engine, flow JSON integrity, and LOPDGDD compliance of the booking assistant.

---

## Architecture context

The chatbot is fully client-side driven from `clients/{tenant}/chatbot_flow.json`. The engine (`src/lib/chatbot/engine.ts`) is stateless. State lives in React `useState`. Server calls happen only at `save_appointment` and `getAvailableSlots`.

Key files:
```
clients/talleres-amg/chatbot_flow.json   — flow definition
src/lib/chatbot/engine.ts               — flow runner (pure, testable)
src/core/chatbot/ChatEngine.tsx         — React UI + action handlers
src/actions/chatbot.ts                  — save_appointment server action
src/actions/slots.ts                    — availability slot fetcher
src/lib/oil.ts                          — oil change calculator (pure)
```

---

## Flow integrity checks

Run for every `chatbot_flow.json` change:

```sh
npm run flows:validate
```

Manual checks (read the JSON):
1. `start` → exists in `nodes`
2. Every `options[].next` → exists in `nodes`
3. Every `collect` node has a `next`
4. Every `action` → one of: `collect_lopd_consent`, `save_appointment`, `calc_oil_change`
5. `save_appointment` is only reachable AFTER `lopd_consent` in every path
6. No orphan nodes (nodes never reachable from `start`)

---

## LOPDGDD compliance checklist

| Check | How to verify |
|---|---|
| Consent is not pre-ticked | Grep `ChatEngine.tsx` for `consentChecked` initial state — must be `false` |
| Consent log saved FIRST | In `chatbot.ts`, `consent_log.create()` must precede `appointments.create()` |
| Email collected for consent log | `subject_email` field in consent_log must be populated (not empty string) |
| Policy version and hash in consent_log | Verify `policy_version` and `policy_hash` are passed through |
| User agent captured | `user_agent: payload.userAgent` must be present |

---

## Unit test coverage matrix

| Module | Test file | Cases |
|---|---|---|
| `getItvSchedule` | `__tests__/itv.test.ts` | <4y, 4-10y, >10y, exact boundaries |
| `calcOilRecommendation` | `__tests__/oil.test.ts` | all oil types, urgent/overdue/ok, message content |
| `stepFlow` + `createSession` | `__tests__/engine.test.ts` | welcome, terminal, action dispatch, unknown node |

For every new chatbot node type or calculator, a corresponding unit test is required before merge.

---

## Manual chatbot test script

Run through this script against the live UI (http://localhost:3000):

```
BOOKING FLOW — full golden path
================================
1. Open http://localhost:3000
2. Scroll to chatbot section
3. Click "Iniciar conversación"
   ✓ Typing indicator appears
   ✓ Welcome message appears with 3 options
4. Click "Reservar cita"
   ✓ Service options appear
5. Click "Cambio de aceite"
   ✓ Matricula input appears
6. Type "1234ABC" → Enter
   ✓ Fuel type options appear
7. Click "Gasolina"
   ✓ Slot picker appears (fetched from PocketBase)
   ✓ At least 2 slots shown
8. Click first available slot
   ✓ Name input appears
9. Type "Test User" → Enter
   ✓ Phone input appears
10. Type "600000000" → Enter
    ✓ Email input appears
11. Type "test@example.com" → Enter
    ✓ LOPD consent step appears
    ✓ Checkbox is NOT pre-ticked
    ✓ "Confirmar y continuar" is DISABLED
12. Tick checkbox
    ✓ Button becomes ENABLED
13. Click "Confirmar y continuar"
    ✓ "Guardando tu cita…" spinner appears
    ✓ Confirmation message appears
14. Check PocketBase admin:
    ✓ New record in `appointments` collection
    ✓ New record in `consent_log` collection
    ✓ Consent record has email = "test@example.com"

OIL CHANGE FLOW
===============
1. Click "Iniciar conversación"
2. Click "Calcular cambio aceite"
   ✓ Oil type options appear
3. Click "Sintético"
   ✓ Km input for last change appears
4. Type "50000" → Enter
   ✓ Current km input appears
5. Type "64000" → Enter
   ✓ Bot calculates: "Te quedan 1.000 km..."
   ✓ Slot picker appears
6. Verify slots are from near future (km is almost up)
```

---

## Regression scenarios to always check

- [ ] LOPD checkbox never starts checked (critical)
- [ ] Booking without email still works (email field can be skipped? — check flow)
- [ ] Chatbot restart (scroll back up, start again) — no state bleed
- [ ] Slot picker on mobile — no overflow
- [ ] Oil change → "Ya tocaba" path (set km now > km last + interval)
