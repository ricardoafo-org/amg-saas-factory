---
id: BUG-001
title: flows:validate script does not discover chatbot_flow.json under clients/ — always reports "No files found"
severity: high
status: open
filed: 2026-04-18
filed-by: qa-agent
branch: ecosystem/qa-agents-living-docs
---

## Summary

The `npm run flows:validate` script (`scripts/validate-flow.js`) auto-discovers flow files only under `pb_data/tenants/<tenant>/chatbot_flow.json`. The actual flow files live under `clients/<tenant>/chatbot_flow.json`. When no explicit path argument is passed (as in CI), the script reports "No chatbot_flow.json files found." and exits 0, giving a false green signal. The `clients/talleres-amg/chatbot_flow.json` is never validated in a normal CI run.

## Steps to Reproduce

1. Run `npm run flows:validate` from the project root.
2. Observe output: `No chatbot_flow.json files found.` — exit code 0.
3. Run `node scripts/validate-flow.js clients/talleres-amg/chatbot_flow.json` manually.
4. Observe: actual validation errors are reported (see BUG-002).

## Expected Behaviour

`npm run flows:validate` should discover and validate all `chatbot_flow.json` files under `clients/` (or wherever tenant flows actually live), reporting failures and exiting non-zero on error.

## Actual Behaviour

Script exits 0 with "No chatbot_flow.json files found." because the discovery path `pb_data/tenants/` does not exist. CI passes silently without ever checking the flow files.

## Root Cause Analysis

_Filled by implementer after investigation._

The discovery block in `scripts/validate-flow.js` (lines 60-68) hard-codes `pb_data/tenants/` as the scan root. The project stores tenant flow files under `clients/` instead.

## Fix

_Filled by implementer after fix._

Branch: `fix/bug-001`
Files changed: `scripts/validate-flow.js`

## Verification

_Filled by QA agent after re-testing._

- [ ] Unit tests pass
- [ ] E2E test covers this scenario
- [ ] Manual validation passed
