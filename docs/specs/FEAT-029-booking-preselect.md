# FEAT-029 — Booking Preselect from Service Card CTA

## Intent

When a customer clicks "Reservar" on a service card in the homepage `ServiceGrid`, the chatbot should open straight into the booking flow with that service already pre-checked — no welcome menu, no manual re-selection. Today the CTA opens the chat but drops the user on the welcome message; the user has to click "Reservar cita" then re-pick the same service. That is friction, and it loses the intent the user just expressed.

## Acceptance Criteria

1. [x] Clicking "Reservar" on a service card opens the chat drawer.
2. [x] The drawer skips the welcome menu and lands on the multi-select service node.
3. [x] The clicked service is pre-checked in the multi-select.
4. [x] The bot greeting names the chosen service: `¡Perfecto! Vas a reservar "<service name>"…`.
5. [x] The user can confirm to continue, or add more services before continuing.
6. [x] If the chat is opened without a serviceId (FAB click), the welcome flow runs as before — no regression.

## Constraints

- **Legal**: LOPDGDD consent flow remains intact — no shortcut around the consent node.
- **Performance**: No extra network round-trip; preselect is fully client-side state.
- **Compatibility**: Works on mobile (drawer) and desktop (panel). No reliance on browser-only APIs beyond `CustomEvent`.
- **Tenant**: No tenant data hardcoded — service IDs come from the loaded chatbot flow + config.

## Out of Scope

- Pre-filling other booking steps (plate, fuel, contact). Only the service selection is preselected.
- Deep-linking via URL (e.g. `?service=cambio-aceite`). Event-based only for now.
- Hero CTA preselect — Hero just opens the chat, no service intent attached.

## Test Cases

| Scenario | Input | Expected output |
|---|---|---|
| Happy path | Click "Reservar Cambio de Aceite" on service card | Chat opens, ask_service node active, "Cambio de aceite" pre-checked, greeting includes service name |
| FAB open (no preselect) | Click floating bot button | Welcome message renders normally — no regression |
| Unknown service id | Event fires with bogus serviceId | Falls back to welcome message; no crash |
| Confirm + continue | After preselect, click "Confirmar selección" → "Continuar" | Reaches plate input |

## Files to Touch

- [x] `src/core/chatbot/ChatEngine.tsx` — accept `initialService` prop, useEffect that primes `selectedServiceValues` and jumps `currentNodeId` to `ask_service` when set.
- [x] `src/core/components/ChatWidget.tsx` — listen on `amg:open-chat`, capture `detail.serviceId`, pass through as `initialService`.
- [x] `src/core/components/ServiceGrid.tsx` — Reservar button dispatches `CustomEvent('amg:open-chat', { detail: { serviceId } })`.
- [x] `e2e/chatbot-preselect.spec.ts` — new E2E covering preselect path.

## Builder-Validator Checklist

- [x] All PocketBase queries scoped to `tenant_id` (no DB queries added in this change)
- [x] LOPDGDD: consent flow unchanged — preselect skips the welcome menu only, not the consent node
- [x] No hardcoded IVA rate
- [x] No PII in `console.log`
- [x] No hardcoded tenant data
- [ ] `npm run type-check` → zero exit
- [ ] `npm test` → all pass
- [ ] `npm run lint` → zero errors
