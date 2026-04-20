# FEAT-002 — Live Availability Display

## Intent

Show real-time appointment availability on the Hero section and ServiceGrid cards so users know immediately if they can book today. This reduces the friction of "I wonder if they have space" and increases CTA click-through.

## Acceptance Criteria

1. [ ] Hero CTA area shows "Próximo hueco disponible: [weekday] [time]" fetched from `availability_slots`
2. [ ] If no slots available in next 14 days, shows "Llámanos para disponibilidad"
3. [ ] Availability badge updates without full page reload (server component fetch on page render)
4. [ ] ServiceGrid cards optionally show availability indicator (green dot = slots today)
5. [ ] Fetch is server-side — no client-side waterfall, no loading spinner on initial paint
6. [ ] Graceful fallback if PocketBase is unreachable (badge simply hidden)

## Constraints

- **Performance**: availability data fetched server-side (Server Component) — LCP must not increase
- **Tenant**: query scoped to `tenant_id` from config
- **No mock data**: if PocketBase is down, hide badge — do not show fake data
- **Compatibility**: mobile-first, badge must not overflow Hero on 375px viewport

## Out of Scope

- Real-time WebSocket updates (static fetch on render is sufficient for MVP)
- Per-service availability filtering (that is FEAT-004)

## Test Cases

| Scenario | Setup | Expected |
|---|---|---|
| Slots available | PocketBase has future slots | Badge shows "Próximo hueco: Martes 10:00" |
| No slots | All slots fully booked | Shows "Llámanos para disponibilidad" |
| PocketBase down | DB unreachable | Badge hidden, Hero renders normally |
| Mobile 375px | Viewport narrow | Badge fits, no overflow |

## Files to Touch

- `src/actions/slots.ts` — add `getNextAvailableSlot(tenantId)` function
- `src/core/components/Hero.tsx` — add availability badge (server-side fetch via prop from page.tsx)
- `src/app/page.tsx` — fetch next slot server-side, pass as prop to Hero
- `src/core/components/ServiceGrid.tsx` — optional: green dot on cards with same-day slots
