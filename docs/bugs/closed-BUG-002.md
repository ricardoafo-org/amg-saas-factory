---
id: BUG-002
title: pricing_info chatbot node contains hardcoded prices — must use {{config.key}} tokens
severity: high
status: open
filed: 2026-04-18
filed-by: qa-agent
branch: ecosystem/qa-agents-living-docs
---

## Summary

The `pricing_info` node in `clients/talleres-amg/chatbot_flow.json` hardcodes three service prices (39,99 €, 49,99 €, 65,00 €) and a hardcoded IVA rate (21%) directly in the message string. This means the chatbot will display stale prices if the business changes pricing in PocketBase config, and it bypasses the single-source-of-truth rule that all pricing must come from the `config` collection. The `flows:validate` script also flags this as an error when run with an explicit path argument.

## Steps to Reproduce

1. Run `node scripts/validate-flow.js clients/talleres-amg/chatbot_flow.json`.
2. Observe: `Node "pricing_info": possible hardcoded price detected — use {{config.key}} tokens`.
3. Alternatively, open `clients/talleres-amg/chatbot_flow.json` and inspect the `pricing_info` node message (line 106).

## Expected Behaviour

The `pricing_info` node message should use `{{config.key}}` token placeholders (e.g. `{{config.price_oil_change}}`, `{{config.price_pre_itv}}`) that are resolved at runtime by `resolveFlowTokens()` in `src/actions/chatbot.ts`. Prices displayed to users should always reflect the current PocketBase config values.

## Actual Behaviour

The message contains literal price strings: `"Nuestros precios (sin IVA): Cambio de aceite desde 39,99 € · Pre-ITV 49,99 € · Mecánica general desde 65,00 €. El 21% de IVA se añade al total."`. These will never update automatically if pricing changes in config.

Relevant line: `clients/talleres-amg/chatbot_flow.json`, line 106.

## Root Cause Analysis

_Filled by implementer after investigation._

## Fix

_Filled by implementer after fix._

Branch: `fix/bug-002`
Files changed: `clients/talleres-amg/chatbot_flow.json`

## Verification

_Filled by QA agent after re-testing._

- [ ] Unit tests pass
- [ ] E2E test covers this scenario
- [ ] Manual validation passed
