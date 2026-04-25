---
id: BUG-010
title: Chat UI does not match Claude Design v2 redesign
severity: high
status: open
filed: 2026-04-25
filed-by: manual
branch: fix/BUG-010-chat-design-regression
---

## Summary

The chatbot UI as it appears on tst (and likely main) does not match the Claude Design v2 spec that FEAT-028/FEAT-033 were supposed to land. The redesign covered customer surfaces and the bundle alignment, but the chat surface either was missed or regressed.

Need a side-by-side audit: design-system bundle vs. live ChatEngine + ChatMessage + QuickReplies + booking surfaces.

## Steps to Reproduce

1. Open tst homepage
2. Open the chatbot (any service CTA)
3. Compare against `design-system/ui_kits/website/Chatbot Mock.html` (or wherever the v2 chat mock lives)

## Expected Behaviour

Chat UI matches the v2 design bundle: glass surfaces, motion presets from `MOTION` constants, semantic tokens (`bg-background`, `text-primary`), correct chip styling, correct bubble radii.

## Actual Behaviour

UI differs from the design mock — exact diff TBD by ui-designer audit. Suspected regressions:
- Bubble styling / spacing
- Chip pill style (border-primary?)
- Header / live-status dot
- Glass surface treatment

## Files affected (likely)

- `src/core/chatbot/ChatEngine.tsx`
- `src/core/chatbot/ChatMessage.tsx`
- `src/core/chatbot/QuickReplies.tsx`
- `src/core/chatbot/ChatHeader.tsx`
- Any related `*.module.css` or globals.css `.glass-*` utilities

## Root Cause Analysis

_Filled by implementer after investigation. Hypothesis: FEAT-028 redesign scope explicitly excluded chat surfaces; chat was never updated to v2 tokens._

## Fix

_Spawn ui-designer first to produce diff spec, then implementer applies._

## Verification

- [ ] Visual snapshot test (Playwright) of chat surfaces vs. v2 mock
- [ ] All hard-coded colours removed from chat components
- [ ] All motion uses `MOTION.chatMessage` / `MOTION.chip` / `MOTION.pulseDot`
- [ ] design-system skill compliance check passes
- [ ] Manual side-by-side approval
