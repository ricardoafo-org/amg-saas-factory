# FEAT-003 — Calendar Slot Picker

## Intent

Replace the free-text `ask_date` node in the chatbot with a visual calendar that shows only available days. Currently users type a date string ("dd/mm/aaaa") which is error-prone and disconnected from real availability. The slot grid already exists for the oil flow — extend it to all booking paths.

## Acceptance Criteria

1. [ ] All booking paths (service booking, not just oil) show the slot picker after service selection
2. [ ] Calendar displays available days — unavailable days visually disabled
3. [ ] Selecting a day shows available time slots for that day
4. [ ] Free-text `ask_date` node is removed from all chatbot flows
5. [ ] Selected slot is stored as `fecha_preferida` + `selected_slot_id` in chatbot variables
6. [ ] If no slots available, bot message says "No hay huecos disponibles — llámanos" with phone number
7. [ ] Slot picker loads within 500ms on a reasonable connection
8. [ ] Mobile-usable: slots displayed in 2-column grid, tap targets ≥ 44px

## Constraints

- **No new npm packages**: use the existing slot grid UI pattern from ChatEngine — do not add react-day-picker or similar
- **Tenant isolation**: `getAvailableSlots()` already scoped — do not change its signature
- **LOPDGDD**: slot selection itself collects no personal data — consent is later
- **Compatibility**: must work in the existing ChatEngine flow graph

## Out of Scope

- Duration-aware slot filtering based on combined service duration (that is FEAT-004)
- Admin slot management UI

## Test Cases

| Scenario | Input | Expected |
|---|---|---|
| Happy path | User selects service → slots load | 2-col grid of available slots |
| No slots | All slots booked | Bot says call us |
| Select slot | User taps a slot | Variables updated, flow advances |
| Mobile | 375px viewport | Grid fits, tap targets ≥ 44px |

## Files to Touch

- `clients/talleres-amg/chatbot_flow.json` — remove `ask_date` free-text node; route service selection directly to slot loading
- `src/core/chatbot/ChatEngine.tsx` — trigger `getAvailableSlots()` after service selection (not only in oil flow); remove free-text date input path
- `src/actions/slots.ts` — verify `getAvailableSlots` handles all booking contexts (no changes expected, just verify)
