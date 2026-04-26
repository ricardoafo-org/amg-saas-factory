# FEAT-044 — Command Palette (Cmd+K)

> Sub-FEAT of FEAT-037. The keyboard-first power-user surface that turns the admin from "click-through screens" into "type-and-go".

## Intent

In FEAT-013..020, every navigation step costs a click and a page transition. For an owner who opens the dashboard 30 times a day to find "the García appointment for next Tuesday", clicks compound into minutes. The 2026 standard for back-office UX (Linear, Stripe, Vercel, GitHub, Notion, Plaid) is a single global hotkey — **Cmd+K** (Ctrl+K on Windows/Linux) — that opens a fuzzy-search palette. Type, see ranked results across navigation, customers, vehicles, quotes, and actions; press Enter to jump or execute.

The palette is not a search box — it is a **command surface**. Three result groups:
1. **Navigation** — every admin route, fuzzy-matched ("hoy", "calendar", "settings/horarios").
2. **Entities** — top customers/vehicles/quotes by recent activity, fuzzy-matched on name/plate/email.
3. **Actions** — verbs the owner can execute without leaving the palette ("Nueva cita", "Nuevo cliente", "Nuevo presupuesto", "Cerrar sesión", "Cambiar a turno noche").

A mechanic on a tablet does NOT see Cmd+K (no keyboard); for them, FEAT-048 ships the touch equivalent.

## Acceptance Criteria

1. [ ] Pressing `Cmd+K` (macOS) / `Ctrl+K` (Windows/Linux) anywhere in `/admin/**` opens the palette as a centred dialog with a focused input.
2. [ ] Pressing `Esc` closes the palette and returns focus to the previously focused element.
3. [ ] Typing fuzzy-matches across the three groups; results re-rank as the user types (debounce 50 ms).
4. [ ] Up/Down arrows navigate results; Enter activates the highlighted item; mouse hover highlights as well.
5. [ ] Group order: Navigation first, then Entities, then Actions. Each group shows up to 5 results with a "Ver más" affordance that filters the palette to that group.
6. [ ] Empty query (palette just opened) shows: top 3 recent navigations (per-staff), top 5 recent entities (last 24h), all 4 quick actions. State stored in `localStorage` keyed by staff ID, capped at 20 entries.
7. [ ] Entity lookup hits PocketBase via a single server action `searchAdminEntities(query, limit)` that returns up to 15 results across customers, vehicles, quotes — debounced 200 ms after the last keystroke.
8. [ ] All entity queries scoped to `tenant_id`. Filter strings are parameterised (no string interpolation).
9. [ ] Action "Nueva cita" opens the existing `NewAppointmentModal` pre-focused on the date field.
10. [ ] Action "Nuevo cliente" opens an inline create-customer drawer (no full page nav).
11. [ ] Action "Nuevo presupuesto" navigates to `/admin/quotes/new`.
12. [ ] Action "Cerrar sesión" calls the existing logout server action.
13. [ ] Palette is fully keyboard navigable; passes `axe-core` with zero violations on screen-reader announcements (WAI-ARIA combobox role + `aria-activedescendant`).
14. [ ] Performance: palette opens in < 80 ms; first-keystroke result render in < 150 ms on the loaded preset (60 customers, 112 vehicles, 35 quotes).
15. [ ] Castilian Spanish copy throughout. No voseo. Empty-result message: `Sin coincidencias. Prueba con otro término o crea uno nuevo.`
16. [ ] Feature flag `config.feature_flags.commandPalette` (default `true` for `talleres-amg`, `false` for new tenants).
17. [ ] Hotkey discoverable: pressing `?` from anywhere in `/admin/**` shows a keyboard-shortcut sheet listing Cmd+K and others.

## Constraints

- **Library**: `cmdk` (pacocoursey/cmdk) — already battle-tested by Vercel and Radix. ≤ 10 KB gzipped.
- **Performance**: entity search is server-side (PB filter + limit); never load all customers into the client.
- **Tenant**: every search backed by `getStaffCtx().tenantId`.
- **Security**: server action `searchAdminEntities` rejects queries < 2 characters (prevents accidental table scans) and escapes user input via PB's `pb.filter()` parameterisation.
- **A11y**: WAI-ARIA combobox pattern. Tested with NVDA on Windows and VoiceOver on macOS.
- **No PII in URL**: palette state lives in component state; query string is not modified.
- **Hotkey conflict**: Cmd+K is reserved by some browsers for the address bar — we attach the listener with `event.preventDefault()` and document the conflict.

## Out of Scope

- AI / LLM-powered intent parsing. Deterministic fuzzy match only in v1; LLM intent layer can be added later behind a separate flag.
- Cross-tenant search (multi-tenant ops console). Out of scope.
- Search inside chat history, audit log, or SMS log. Out of scope for v1; FEAT-046 surfaces audit log via the activity feed instead.
- Mobile / tablet equivalent. Tablet UX ships in FEAT-048.

## Test Cases

| Scenario | Input | Expected output |
|---|---|---|
| Open palette | Press Cmd+K on `/admin/calendar` | Palette opens, input focused, recent navs visible |
| Fuzzy customer match | Type `gar` after seeding García | "Carlos García · 1234-ABC" appears in Entities group within 150 ms |
| Plate match | Type `1234abc` | Exact-plate match ranks first in Entities |
| Empty query | Open palette without typing | Recent navs (≤ 3), recent entities (≤ 5), all 4 actions visible |
| No results | Type `xyzzy` | "Sin coincidencias" message + "Crear cliente" suggested action |
| Tenant isolation | Seed a second tenant, search for that tenant's customer | Returns 0 results (filtered by tenant_id) |
| Filter injection | Type `') OR 1==1 //` | Server action returns 0 results, no error, no DB scan |
| Action — Nueva cita | Highlight "Nueva cita", press Enter | NewAppointmentModal opens with date input focused |
| A11y — keyboard only | Open palette, navigate to entity, Enter | Navigation succeeds, focus lands on the target page's main heading |
| A11y — screen reader | Open palette with NVDA | Announces "Buscador de comandos, combobox, escribe para buscar" |
| Feature flag off | `commandPalette: false` | Cmd+K does nothing; the listener is not attached |
| Hotkey help | Press `?` on `/admin` | Shortcut sheet opens, lists Cmd+K and palette syntax |
| Performance | Open palette, type "g" → "ga" → "gar" on loaded preset | Each keystroke renders < 150 ms (perf assertion in Playwright) |

## Files to Touch

- [ ] `src/core/components/admin/CommandPalette.tsx` — new component using `cmdk`
- [ ] `src/core/components/admin/CommandPaletteProvider.tsx` — context provider wired in `(admin)/layout.tsx`
- [ ] `src/core/hooks/useCommandPalette.ts` — open/close, recent items state
- [ ] `src/actions/admin/search.ts` — new: `searchAdminEntities(query, limit)`
- [ ] `src/lib/feature-flags.ts` — add `commandPalette` flag accessor
- [ ] `src/app/(admin)/layout.tsx` — wrap children in `CommandPaletteProvider`; add hotkey listener
- [ ] `src/core/components/admin/ShortcutSheet.tsx` — `?` hotkey reference sheet
- [ ] `clients/talleres-amg/config.json` — set `feature_flags.commandPalette: true`
- [ ] `package.json` — add `cmdk`
- [ ] `tests/e2e/admin/command-palette.spec.ts` — Playwright E2E suite
- [ ] `tests/unit/actions/search.test.ts` — Vitest unit tests for filter injection guard

## PR Sequencing

1. **PR 1** — `feat(admin): scaffold cmdk palette + Cmd+K hotkey + recent navs`. Branch: `feature/feat-044-palette-shell`. Files: provider, hook, palette shell, layout wiring, feature flag.
2. **PR 2** — `feat(admin): entity search server action + tenant-scoped fuzzy match`. Branch: `feature/feat-044-entity-search`. Files: `searchAdminEntities`, unit tests, palette wiring to entity group.
3. **PR 3** — `feat(admin): action group + drawers + shortcut sheet`. Branch: `feature/feat-044-actions`. Files: action handlers, inline create-customer drawer, shortcut sheet.
4. **PR 4** — `test(e2e): command palette suite + axe a11y assertions`. Branch: `feature/feat-044-e2e`. Files: Playwright suite, axe wiring.

## Dependencies

- Depends on FEAT-013 (admin layout), FEAT-043 (loaded fixtures for E2E).
- Enables faster manual testing for FEAT-046, FEAT-047.

## Builder-Validator Checklist

- [ ] Cmd+K only active inside `/admin/**`
- [ ] All search queries scoped to `tenant_id` and parameterised (no string interpolation)
- [ ] WAI-ARIA combobox semantics; axe-core clean
- [ ] Castilian Spanish copy
- [ ] Feature flag respected
- [ ] `npm run type-check` / `npm test` / `npm run lint` clean
- [ ] Playwright E2E green
