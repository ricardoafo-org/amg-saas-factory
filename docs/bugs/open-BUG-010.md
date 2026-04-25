---
id: BUG-010
title: Chat UI does not match Claude Design v2 redesign
severity: high
status: open
filed: 2026-04-25
filed-by: manual
last-updated: 2026-04-25
branch: fix/BUG-010-chat-design-regression
design-spec-source: https://api.anthropic.com/v1/design/h/Hfp2OjQUQOytX3p4uln6vw
local-design-bundle: tmp/design-spec/
---

## Summary

The production chatbot (`src/core/components/ChatWidget.tsx` + `src/core/chatbot/ChatEngine.tsx`) is a 420 px right-aligned drawer with a single-column linear conversation. The Claude Design v2 spec (extracted to `tmp/design-spec/`) calls for a **hybrid chat + live cart layout** with **container-based breakpoints**, an **edit-anywhere 5-step state machine**, **multi-service Paquetes + à la carte** selection, and a **mobile cart-peek pill**. None of this is in the live code.

This is not a styling regression — it is a missing architecture. Treat as a redesign, not a patch.

## Sources audited

- `tmp/design-spec/README.md` — handoff bundle instructions
- `tmp/design-spec/project/README.md` — design system v2 (palette, type, motion, voice)
- `tmp/design-spec/chats/chat1.md` — design iteration transcript (logo, palette, tri-stripe motif)
- `tmp/design-spec/chats/chat2.md` — booking-flow design transcript (10 flows, hybrid layout, multi-service)
- `tmp/design-spec/project/ui_kits/website/booking-app.jsx` (185 LOC) — host component, ResizeObserver-driven layout
- `tmp/design-spec/project/ui_kits/website/booking-ui.jsx` (393 LOC) — BookingStepper, CartPanel, Bubble, ChipRow, ServiceGrid, PackageRow, SlotPicker, MobileCartPeek
- `tmp/design-spec/project/ui_kits/website/booking-steps.jsx` (397 LOC)
- `tmp/design-spec/project/ui_kits/website/booking-core.jsx` (131 LOC)
- `tmp/design-spec/project/ui_kits/website/flow-a-booking.jsx` (369 LOC)
- `src/core/components/ChatWidget.tsx` (192 LOC, current)
- `src/core/chatbot/ChatEngine.tsx` (801 LOC, current — known size, not fully read)
- `src/core/chatbot/components/BookingStepper.tsx` (97 LOC, current — exists but single-column)

## Gap matrix — design v2 vs current

| Area | Design v2 (target) | Current (ChatWidget + ChatEngine) | Gap |
|---|---|---|---|
| **Layout (desktop)** | Hybrid grid: `minmax(0, 1.6fr) minmax(300px, 360px)` — chat column + sticky CartPanel | Single 420 px drawer pinned bottom-right | **Missing entire cart column** |
| **Layout (tablet)** | `minmax(0, 1.4fr) minmax(260px, 300px)` | Same 420 px drawer | **Tablet-specific layout absent** |
| **Layout (mobile)** | Full-screen chat + floating MobileCartPeek pill above safe area | Bottom-sheet drawer | **No cart-peek pill; no full-screen mode** |
| **Breakpoint source** | `ResizeObserver` on host container (390 / 768 / 1440) — same component renders correctly inside any artboard | Viewport `md:` Tailwind breakpoints | **Container-based breakpoints absent** |
| **Step model** | 5-step state machine: `Vehículo → Servicios → Hueco → Datos → Revisar`, each step is an atomic component (`StepVehicle`, `StepServices`, `StepSlot`, `StepGuest`, `StepReview`) | Linear conversational engine streaming bubbles | **Step components and state machine missing** |
| **Stepper navigation** | Click any **completed** step to jump back; pencil-icon edit on each cart row routes to that step | Passive progress indicator only | **Edit-anywhere navigation missing** |
| **Multi-service** | `PackageRow` (presets like *Pre-ITV completo* → adds 3 items) + `ServiceGrid` (à la carte multi-select grid). Cart accumulates, IVA recalculates live | Single-service selection per booking | **Paquetes + multi-select missing** |
| **Cart panel** | Live `CartPanel` showing: vehicle row · services list (with `~Xmin` durations + per-line IVA) · slot row · contact row · footer with subtotal / IVA 21 % / total / `Continuar` CTA | None | **Component does not exist** |
| **Slot picker** | `SlotPicker` — date scrubber + half-hour grid with availability dots | Quick-reply chips for hour | **Component does not exist** |
| **Bubble primitive** | `Bubble` with bot/user variants, overshoot ease `[0.34, 1.56, 0.64, 1]`, typing-dots animation (`anime.js v4` per chat2 transcript, fallback CSS keyframes) | Generic ChatMessage | **Typing-dots stagger + overshoot motion missing** |
| **ChipRow** | Branded chip pill with hover-lift, primary/40 border on selection | Generic QuickReplies | **Style + motion likely off-spec** |
| **Mobile cart peek** | Slim pill `bottom: 12px`, `bg: var(--brand-ink)`, shows `[N] servicios · €XX,XX` in mono tabular-nums; tap opens bottom-sheet with full cart | Absent | **Component missing** |
| **Theme** | Per `project/README.md`: dark-canvas-first (`hsl(226 40% 4%)`), BMW-M tri-stripe motif (light-blue · dark-blue · red) on hero/footer accents, light-mode supported via `[data-theme='light']`. Chat itself sits on `var(--bg)` and inherits | Dark drawer on `var(--card)` | **Tri-stripe accents not applied; theme tokens may diverge** |
| **Logo** | New AMG monogram with BMW-M stripes (per design assets) | Old `public/logo.svg` (per design v2 README it is the side-profile car glyph + stencil wordmark in `currentColor`) | **Verify logo asset against design bundle** |
| **Typography** | Geist Sans body, Geist Mono for **prices, durations, eyebrows, timestamps** with `font-variant-numeric: tabular-nums`. Archivo Black for hero display only (chat2 transcript) | Geist loaded; mono usage on prices unverified inside chat surfaces | **Tabular-nums on prices not enforced inside chat/cart** |
| **Motion** | `MOTION.chatMessage` overshoot, scroll-`whileInView once: true`, durations 200–320 ms (>400 ms banned). Typing-dots `nth-child` staggered delays | Uses framer-motion + `MOTION.scaleIn` for FAB; chat-message motion partial | **Typing-dots, bubble overshoot, stagger likely incomplete** |
| **Header (chat)** | `Andrés · Talleres AMG` with `AM` avatar + green dot + "Respondemos en < 15 min" | Matches design bundle (line 132–164 of ChatWidget.tsx) | **OK — keep** |
| **Privacy footer** | RGPD lock + "Seguro · RGPD · no compartimos tus datos" | Matches | **OK — keep** |
| **Voice** | `tú`, sentence case, `·` middle-dot separator, `Intl.NumberFormat('es-ES','EUR')` → `48,39 €` (comma + trailing symbol), no emoji in chrome | Likely partial — verify chatbot_flow.json copy | **Audit copy in `clients/talleres-amg/chatbot_flow.json`** |
| **Edit affordances** | Pencil icon on each completed cart row jumps to that step via `onEditFrom({ vehicle: 0, services: 1, slot: 2, guest: 3 })` | None | **Wire-up missing** |
| **Form: contact / LOPD** | `StepGuest` collects name + phone + email + WhatsApp opt-in + LOPD checkbox (default unchecked, link to `policyUrl`, hash-stamped) | LOPD checkbox exists in some surface — must verify it survives into the new StepGuest | **Confirm LOPD lives in StepGuest with correct defaults** |
| **Persistence** | Cart state survives across breakpoint changes (same component) and resets only on confirm | Conversation state in ChatEngine — needs lifting to `BookingApp` host | **Refactor required** |

## Architectural delta

The current `ChatWidget → ChatEngine` runs the booking inside one chat surface. The design v2 introduces a **host-and-columns** model:

```
BookingApp (host, owns state)
├── chatCol (always rendered)
│   ├── BookingStepper (clickable when completed)
│   └── current step component (StepVehicle | StepServices | StepSlot | StepGuest | StepReview)
└── cartCol (tablet/desktop only)
    └── CartPanel (live IVA, edit pencils)
└── MobileCartPeek (mobile only, opens bottom-sheet)
```

Layout is a **CSS grid driven by `useContainerLayout(ref)`** — a `ResizeObserver` measuring the host element, *not* the viewport. This is what lets the same component render correctly at 390 / 768 / 1440.

Current `ChatEngine` (801 LOC) is the wrong shape for this. It needs to either:
- **(a) Become the orchestrator** of the 5 step components (large refactor, keeps chat-style bot bubbles between steps), or
- **(b) Be replaced** by `BookingApp` from the design bundle and reduced to a thin "bot bubble narrator" that decorates step transitions.

Recommend **(b)**. The design intent is form-led with conversational decoration, not chat-led with form decoration.

## Files to add / modify (when fix lands)

**New components** (target `src/core/chatbot/booking/`):
- `BookingApp.tsx` — host, owns state, container-breakpoint hook
- `useContainerLayout.ts` — `ResizeObserver`-based hook
- `CartPanel.tsx` — live cart with IVA breakdown
- `MobileCartPeek.tsx` — pill + bottom-sheet
- `Bubble.tsx`, `ChipRow.tsx`, `SlotPicker.tsx`, `ServiceGrid.tsx`, `PackageRow.tsx`
- `steps/StepVehicle.tsx`, `steps/StepServices.tsx`, `steps/StepSlot.tsx`, `steps/StepGuest.tsx`, `steps/StepReview.tsx`

**Modify**:
- `src/core/components/ChatWidget.tsx` — drop the drawer-only layout; mount `BookingApp` inside the panel; keep header + close + privacy footer
- `src/core/chatbot/ChatEngine.tsx` — either retire or shrink to a step-narrator (decision in spec phase)
- `src/core/chatbot/components/BookingStepper.tsx` — add `completed[]` + `onJump` props (currently passive)
- `clients/talleres-amg/chatbot_flow.json` — restructure to feed the 5 steps, not a linear conversation
- `src/lib/motion.ts` — add `MOTION.bubbleOvershoot`, `MOTION.typingDots`, `MOTION.cartRowEnter` if missing
- `src/app/globals.css` — add tri-stripe utility, tabular-nums helper, container query helpers

**Delete after migration** (verify unused):
- Anything in `ChatEngine.tsx` superseded by step components.

## Open decisions for spec phase

1. **Refactor strategy** — (a) evolve ChatEngine in place, or (b) introduce `BookingApp` as a parallel surface and migrate. Recommend (b).
2. **Tenant-config-driven flow** — should `chatbot_flow.json` define the 5 steps declaratively, or should the steps be code with config only feeding services / slots? Design bundle uses code-defined steps with data injection. Recommend code-defined steps for type safety.
3. **State source of truth** — lift to `BookingApp` (per design) or keep in ChatEngine context? Lift.
4. **Animation library** — design transcript shows anime.js v4 in mocks; production uses framer-motion. Stay on framer-motion + WAAPI; do **not** add anime.js — would inflate bundle.
5. **Cart persistence** — sessionStorage so refresh/breakpoint-change does not lose state? Yes, but flag as P1 not P0.
6. **Theme audit** — confirm tokens in `src/app/globals.css` match `tmp/design-spec/project/colors_and_type.css`. If divergent, the chat redesign needs token alignment as a prerequisite.

## Verification (when fix lands)

- [ ] Visual snapshot of chat at 390 / 768 / 1440 (Playwright + container, not viewport)
- [ ] CartPanel renders live IVA breakdown with `font-variant-numeric: tabular-nums`
- [ ] Tapping a completed step in BookingStepper jumps to that step and pre-fills state
- [ ] Edit pencil on each cart row routes through `onEditFrom`
- [ ] Mobile cart-peek pill appears only when `cart.length > 0 && step < 4 && layout === 'mobile'`
- [ ] LOPD checkbox in StepGuest defaults `checked={false}`, links to `policyUrl`, stamps `policyHash`
- [ ] All copy uses `tú`, sentence case, middle-dot separator, `Intl.NumberFormat('es-ES','EUR')`
- [ ] All chat motion durations ≤ 320 ms; bubble uses overshoot ease `[0.34, 1.56, 0.64, 1]`
- [ ] No hard-coded colours — all surfaces use semantic tokens
- [ ] design-system skill compliance check passes
- [ ] No regression on existing FEAT-031 customer-email filter sanitization

## Priority and sequencing

**Blocks**: ITV countdown CTA → chat (every CTA dispatches `amg:open-chat`). Any visual regression here is on the homepage critical path.

**Blocked by**: QA uplift proposal (in-flight) — we should not implement a redesign of this size before the new test discipline lands. Visual snapshots, container-query Playwright fixtures, and contract tests for the booking state machine all need to exist first.

**Recommended order**:
1. QA uplift research returns → bug-triager profile defined → testing strategy frozen
2. ui-designer agent produces line-by-line design diff (uses this report as input)
3. architect agent produces FEAT-035 spec for the BookingApp refactor
4. implementer ships in **3 PRs** (per session-hygiene rule, one component cluster each):
   - PR-A: `BookingApp` + `useContainerLayout` + step components (no cart yet)
   - PR-B: `CartPanel` + `MobileCartPeek` + edit-anywhere wiring
   - PR-C: `chatbot_flow.json` migration + ChatEngine retirement
5. qa-engineer regression sweep on tst before pro promotion

## Root Cause Analysis

FEAT-028/FEAT-033 covered customer surfaces (Hero, ServiceGrid, ItvCountdown, Testimonials, Footer) but **explicitly excluded the chat surface from scope**. The chat shipped with v1 tokens and was never revisited when v2 introduced the hybrid chat+cart paradigm. This is a scope gap, not a code regression — there is nothing to "revert to".

## Fix

See "Files to add / modify" and "Recommended order" above. Spec lives in (future) `docs/specs/FEAT-035-booking-app-redesign.md`.
