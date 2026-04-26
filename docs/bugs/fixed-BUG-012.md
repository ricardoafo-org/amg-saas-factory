---
id: BUG-012
title: Chatbot booking flow breaks after fuel-type step, falls back to phone CTA
severity: high
status: fixed
filed: 2026-04-25
fixed: 2026-04-26
filed-by: manual
branch: fix/bug-012
---

## Summary

In the chatbot, every booking flow path that asks for fuel type breaks immediately after the user answers. Instead of advancing to the next step (date/time slot picker, contact form, or confirmation), the bot dead-ends and prompts the user to call the workshop by phone. This bypasses the entire digital booking funnel and silently drops conversions.

## Steps to Reproduce

1. Open the public site → trigger chatbot
2. Choose any service that requires fuel-type disambiguation (e.g. revisión, ITV, cambio de aceite)
3. Bot asks: "¿Es diésel o gasolina?" (or equivalent fuel selector)
4. Select either option (`gasolina` or `diesel`)
5. Observe: flow does NOT advance to slot picker — bot returns a phone-fallback message

## Expected Behaviour

After fuel-type selection the conversation should advance to the next configured step in the flow (typically: "¿Para cuándo te viene bien?" date/slot picker), then proceed through contact details and confirmation.

## Actual Behaviour

Flow terminates with a phone-call CTA. No slot picker shown. No error visible to the user, but the booking is lost.

## Suspected Area

- `clients/talleres-amg/chatbot_flow.json` — fuel-type step's `next` / transition definitions
- `src/lib/chatbot/engine.ts` — flow state transition logic
- Could be a regression from recent flow edits (FEAT-028, FEAT-029, FEAT-030, BUG-007 all touched flow)

This needs the **bug-triager** (proposed) or `qa-engineer` to:
- Determine which fuel-bearing service IDs are affected (subset or all?)
- Reproduce deterministically via Playwright before assigning fix
- State-transition test the full flow graph

## Root Cause Analysis

The bug was NOT in `chatbot_flow.json` — the flow graph's `next` pointers were correct. The defect lived in `src/core/chatbot/ChatEngine.tsx`, in the post-action transition for `load_slots` and `calc_oil_change`.

Two helpers exist for moving between nodes:

- `setCurrentNodeId(id)` — pure state mutation. Updates the pointer but does NOT push the next node's `message` into the conversation, nor render its `collect`/`options` UI.
- `goToNode(id, vars)` — full transition. Renders the next node's message + input pipeline.

The empty-slots and error fallbacks for both `load_slots` and `calc_oil_change` were calling `setCurrentNodeId(node.next)`. So when the API returned zero slots (a normal condition for fuel-bearing services with tight calendars), the user saw the "no hay huecos disponibles, llamá al taller" phone-fallback message and the conversation FROZE — the next node's input never rendered. From the user's POV the bot dead-ended after fuel selection.

The single legitimate use of `setCurrentNodeId(node.next)` is the `calc_oil_change` success branch, where slots ARE visible and `handleSlotSelect` reads `currentNode?.next` to drive the next step itself.

## Fix

Branch: `fix/bug-012`

Files changed:

- `src/core/chatbot/ChatEngine.tsx` — replaced 4× `setCurrentNodeId(node.next)` with `goToNode(node.next, vars/newVars)` in:
  1. `calc_oil_change` `.catch(...)` error handler
  2. `calc_oil_change` empty-slots else branch (after phone fallback message)
  3. `load_slots` empty-slots else branch (after phone fallback message)
  4. `load_slots` offline + no-cache branch (after "Sin conexión" fallback)
  The `calc_oil_change` success-with-slots path keeps `setCurrentNodeId(node.next)` intentionally so `handleSlotSelect` reads the right `next` pointer.
- `src/core/chatbot/__tests__/bug-012-flow-advance.test.ts` — new source-level contract test pinning the post-action transition pattern so a future refactor cannot silently regress to `setCurrentNodeId` for failure paths.

## Verification

_Filled by QA agent after re-testing._

- [ ] Unit tests pass
- [ ] E2E test covers fuel-type → slot-picker transition for ALL fuel-bearing services
- [ ] Manual validation passed in chatbot
- [ ] State-transition coverage map updated
