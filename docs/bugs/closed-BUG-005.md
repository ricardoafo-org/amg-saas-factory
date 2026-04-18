---
id: BUG-005
title: Unused imports X and Minimize2 in ChatEngine.tsx
severity: low
status: open
filed: 2026-04-18
filed-by: qa-agent
branch: ecosystem/qa-agents-living-docs
---

## Summary

`src/core/chatbot/ChatEngine.tsx` imports `X` and `Minimize2` from `lucide-react` (line 5) but neither icon is used anywhere in the component. ESLint reports these as warnings. While not functionally harmful, this suggests UI features (close/minimize chatbot) may have been planned but are not yet implemented, and the dead imports add unnecessary bundle weight.

## Steps to Reproduce

1. Run `npm run lint`.
2. Observe warnings:
   - `5:27  Warning: 'X' is defined but never used.`
   - `5:30  Warning: 'Minimize2' is defined but never used.`

## Expected Behaviour

All imported symbols should be used, or removed if the planned feature is deferred.

## Actual Behaviour

`src/core/chatbot/ChatEngine.tsx` line 5:
```ts
import { Send, Bot, User, X, Minimize2 } from 'lucide-react';
```
`X` and `Minimize2` are imported but never referenced in the JSX or logic below.

## Root Cause Analysis

_Filled by implementer after investigation._

## Fix

_Filled by implementer after fix._

Branch: `fix/bug-005`
Files changed: `src/core/chatbot/ChatEngine.tsx`

## Verification

_Filled by QA agent after re-testing._

- [ ] Unit tests pass
- [ ] E2E test covers this scenario
- [ ] Manual validation passed
