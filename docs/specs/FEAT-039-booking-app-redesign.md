# FEAT-039 — BookingApp redesign (chat → hybrid chat + cart)

> Promoted from BUG-010. The full architectural gap analysis lives in
> `docs/bugs/closed-BUG-010.md`; this spec captures the decisions we accepted
> from that report and the order we ship the migration.

## Intent

The production booking surface is a 420 px right-aligned chat drawer with a single-column linear conversation. The Claude Design v2 spec calls for a **hybrid chat + live cart layout** with **container-based breakpoints**, an **edit-anywhere 5-step state machine** (`Vehículo → Servicios → Hueco → Datos → Revisar`), **multi-service Paquetes + à la carte** selection, and a **mobile cart-peek pill**. None of this is in the live code. We are not patching the chat — we are replacing it with a `BookingApp` host that owns state and renders chat-style narration *between* form steps.

This unblocks the homepage's primary conversion path. Every CTA on the homepage dispatches `amg:open-chat`, so any visual or flow regression in this surface is on the critical path.

## Accepted decisions (from BUG-010 report)

| Decision | Choice |
|---|---|
| Refactor strategy | **(b) parallel BookingApp**, ChatEngine retired in PR-C — design intent is form-led with conversational decoration, not chat-led with form decoration |
| Step model | **Code-defined** step components (`StepVehicle`, `StepServices`, `StepSlot`, `StepGuest`, `StepReview`) — type-safe; `chatbot_flow.json` feeds data, not control flow |
| State source of truth | **Lifted to `BookingApp` host** — survives breakpoint changes (same component renders at all sizes) |
| Animation library | **framer-motion + WAAPI** — do NOT add anime.js (bundle bloat). Replicate the design's overshoot ease + typing-dots stagger with framer keyframes |
| Cart persistence | **sessionStorage**, P1 — flagged but not blocking PR-A |
| Container queries | **`ResizeObserver` on the host element**, not viewport `md:` Tailwind breakpoints |
| Feature flag | **`NEXT_PUBLIC_CHAT_V2`** — defaults `false` until PR-C lands. Old `ChatWidget` keeps serving on tst while PR-A and PR-B build incrementally. Cutover happens by flipping the flag, with rollback being one env-var revert |

## Acceptance Criteria

The user-facing slice that PR-C must satisfy. PR-A and PR-B each ship a partial slice behind the flag.

1. [ ] At ≥ 768 px host width, the booking surface renders as a two-column grid: chat column (1.4–1.6fr) + sticky cart column (260–360 px). At < 768 px, single column with floating `MobileCartPeek` pill above the safe-area inset.
2. [ ] User can complete a booking through the 5 steps in order: vehicle → service(s) → slot → contact + LOPD → review + confirm.
3. [ ] Tapping a *completed* step in the `BookingStepper` jumps to that step with state pre-filled. Pencil icons on each cart row do the same via `onEditFrom({ vehicle: 0, services: 1, slot: 2, guest: 3 })`.
4. [ ] `StepServices` supports both **Paquetes** (preset bundles like *Pre-ITV completo* that add 3+ items at once) and à la carte multi-select. Cart accumulates with live IVA breakdown.
5. [ ] `CartPanel` shows: vehicle row · services list with `~Xmin` durations and per-line IVA · slot row · contact row · footer with subtotal / IVA 21 % / total / `Continuar` CTA. All numerals use `font-variant-numeric: tabular-nums`.
6. [ ] `MobileCartPeek` pill appears only when `cart.length > 0 && step < 4 && layout === 'mobile'`. Tap opens a bottom-sheet with the full cart.
7. [ ] LOPD checkbox in `StepGuest` defaults `checked={false}`, links to `policyUrl`, stamps `policyHash`. `consent_log.create()` runs **before** the appointment write.
8. [ ] All chat motion durations ≤ 320 ms; `Bubble` enters with overshoot ease `[0.34, 1.56, 0.64, 1]`; typing-dots stagger via `nth-child` delays.
9. [ ] All copy: `tú`, sentence case, `·` middle-dot separator, `Intl.NumberFormat('es-ES','EUR')` → `48,39 €`, no emoji in chrome.
10. [ ] No regression on existing FEAT-031 customer-email filter sanitization — appointment + customer writes still go through `saveAppointment` with the same sanitizer.
11. [ ] `prefers-reduced-motion: reduce` stills all motion (bubble entry, typing dots, marker sweeps).

## Constraints

- **Legal**: LOPDGDD — `consent_log.create()` must run before any personal-data write. RD 1457/1986 — IVA breakdown visible in cart and review steps. Cookie consent state untouched (this is not first-load chrome).
- **Performance**: Container-query layout must not trigger layout thrash on `ResizeObserver` callback — rAF-throttle. Bundle delta ≤ 25 KB gzipped (current chat ≈ 18 KB; budget allows full replacement). INP target ≤ 200 ms on 3G mobile (per FEAT-038 PR 10).
- **Compatibility**: iOS Safari 16+, Chrome 115+, Firefox 122+, Edge 115+. WCAG 2.1 AA — keyboard navigation through stepper, focus trap inside the chat panel, `aria-live` on step transitions.
- **Tenant**: Every PocketBase query in step components must scope by `tenant_id`. Service / package data feeds from `clients/<tenant>/config.json` + the existing `services` collection.
- **Tooling**: framer-motion only for client-side motion. No anime.js. CSS container queries (`@container`) are allowed; the design uses imperative ResizeObserver because it predates broad container-query support, but we can layer `@container` queries inside step components for sub-grid responsiveness.

## Out of Scope

- Chat history persistence beyond sessionStorage cart state.
- Voice input / speech-to-text.
- Multi-language. Castilian Spanish only (per `feedback_castilian_spanish` memory).
- Admin-side booking creation. FEAT-037 covers admin CRUD separately.
- Replacing `ChatEngine` for non-booking flows (intent classification, FAQ replies). Those keep their conversational shape and continue to mount inside `BookingApp` *between* form steps as bot-narration bubbles.

## Test Cases

| Scenario | Input | Expected output |
|---|---|---|
| Happy path desktop | 1440 px host, 1 paquete + 1 à la carte service, slot picked, contact filled, consent ticked | Two-column layout, cart shows 4 line items + IVA + total, confirm dispatches `saveAppointment`, success bubble appears |
| Happy path mobile | 390 px host, same booking | Single column, cart-peek pill appears at step 1 once cart non-empty, bottom-sheet opens on tap, confirm works identically |
| Edit-anywhere | At step 4 (review), tap pencil on services row | Jumps to step 1 (Servicios), cart preserved, all selections still ticked |
| Stepper jump-back | At step 3, tap "Servicios" in stepper | Jumps to step 1, cart preserved |
| Stepper guard | At step 1, tap "Hueco" in stepper | No-op (step 2 not completed yet) — visual feedback only |
| LOPD violation | Try to confirm at step 4 with consent unchecked | `Continuar` disabled, focus moves to checkbox, error caption appears |
| Container resize | Drag browser from 1440 → 390 mid-flow | Layout flips at 768 px boundary, state preserved across the flip (no remount) |
| Reduced motion | `prefers-reduced-motion: reduce` | Bubbles snap in, typing dots static, no overshoot, no marker sweep |
| Error path | PocketBase 500 on `saveAppointment` | Friendly error bubble, cart preserved, retry CTA, no PII in console |
| Filter-injection regression | Customer email contains `'\''or 1=1--` | `saveAppointment` rejects via existing FEAT-031 sanitizer, cart preserved, error bubble |
| Tenant isolation | Tenant A booking, slots query | All slots queried with `tenant_id = 'A'` filter — no leak from other tenants |

## PR sequencing (3 PRs, all behind `NEXT_PUBLIC_CHAT_V2`)

### PR-A — Host shell + step components (no cart yet)
- New: `src/core/chatbot/booking/BookingApp.tsx` (host, owns state)
- New: `src/core/chatbot/booking/useContainerLayout.ts` (`ResizeObserver` hook, rAF-throttled)
- New: `src/core/chatbot/booking/Bubble.tsx`, `ChipRow.tsx`, `BookingStepper.tsx`
- New: `src/core/chatbot/booking/steps/StepVehicle.tsx`, `StepServices.tsx`, `StepSlot.tsx`, `StepGuest.tsx`, `StepReview.tsx`
- Modify: `ChatWidget.tsx` — when `NEXT_PUBLIC_CHAT_V2 === 'true'`, mount `BookingApp` instead of `ChatEngine`. Otherwise unchanged.
- Tests: container-layout snapshots at 390 / 768 / 1440 (vitest + jsdom + ResizeObserver mock); step-component contract tests; stepper jump-back guard tests.

### PR-B — Cart panel + edit-anywhere
- New: `src/core/chatbot/booking/CartPanel.tsx` (live IVA, edit pencils)
- New: `src/core/chatbot/booking/MobileCartPeek.tsx` (pill + bottom-sheet)
- New: `src/core/chatbot/booking/SlotPicker.tsx`, `ServiceGrid.tsx`, `PackageRow.tsx`
- Modify: `BookingApp` to wire `cart` state + `onEditFrom` callbacks across stepper and cart rows
- Modify: `src/lib/motion.ts` — add `MOTION.bubbleOvershoot`, `MOTION.typingDots`, `MOTION.cartRowEnter` if not already present
- Modify: `src/app/globals.css` — add tabular-nums helper, container-query helpers, tri-stripe utility
- Tests: IVA contract tests on CartPanel; edit-anywhere routing test; LOPD-default-unchecked + policyHash-stamp test.

### PR-C — chatbot_flow.json migration + ChatEngine retirement + flag flip
- Modify: `clients/talleres-amg/chatbot_flow.json` — restructure to feed the 5 steps as data, not as a linear conversation graph
- Delete (verify unused): blocks of `ChatEngine.tsx` superseded by step components — keep only the bot-narration bubble decorator if needed
- Flip default: `NEXT_PUBLIC_CHAT_V2 = 'true'` in `.env.example` and tst environment
- Tests: full-flow integration test (vitest); existing chatbot tests still pass (or are explicitly retired with a deletion-guard spec entry).

After PR-C lands and bakes on tst for ≥ 24 h with no regressions, remove the flag entirely in a small follow-up PR.

## Files to Touch

> See PR sequencing above. Implementer fills any deltas in each PR's spec deviation block.

## Builder-Validator Checklist

> Validator fills this after each PR.

- [ ] All PocketBase queries scoped to `tenant_id` (slot fetch, customer create, appointment create)
- [ ] LOPDGDD: `consent_log.create()` runs before `customers.create()` and before `appointments.create()`
- [ ] No hardcoded IVA rate (`0.21` / `1.21` / `21%`) — read from `config.ivaRate`
- [ ] No PII in `console.log` / error responses (uses existing FEAT-031 sanitizer)
- [ ] No hardcoded tenant data — service / package data flows from `clients/<tenant>/config.json` + `services` collection
- [ ] `npm run type-check` → zero exit
- [ ] `npm run build:docker` → zero exit (PR-CI gate enforces this)
- [ ] `npm test` → all pass
- [ ] `npm run lint` → zero errors
- [ ] Visual snapshot of chat at 390 / 768 / 1440 (Playwright + container, not viewport) — added in PR-B
- [ ] design-system skill compliance check passes
