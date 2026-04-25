---
id: BUG-012
title: Chatbot booking flow breaks after fuel-type step, falls back to phone CTA
severity: high
status: open
filed: 2026-04-25
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

_Filled by implementer after investigation._

## Fix

_Filled by implementer after fix._

Branch: `fix/bug-012`
Files changed: …

## Verification

_Filled by QA agent after re-testing._

- [ ] Unit tests pass
- [ ] E2E test covers fuel-type → slot-picker transition for ALL fuel-bearing services
- [ ] Manual validation passed in chatbot
- [ ] State-transition coverage map updated
