---
paths:
  - "clients/**/chatbot_flow.json"
---

# Chatbot Flow Rules

Applied automatically to all `chatbot_flow.json` files.

## Required structure

```json
{
  "version": 1,
  "start": "<nodeId>",
  "nodes": { ... }
}
```

## Node types and rules

| Type | Required fields | Notes |
|---|---|---|
| Message + options | `message`, `options[]` | Each option needs `label` + `next` |
| Collect input | `message`, `collect`, `next` | `collect` is the variable key saved to session |
| Action | `action`, `next` | Action must be registered in `ChatEngine.tsx` |

## Registered actions (as of current build)

- `collect_lopd_consent` — renders LOPD checkbox in UI
- `save_appointment` — calls `saveAppointment()` server action
- `calc_oil_change` — runs oil km calculator

## Mandatory rules

- Every booking flow MUST pass through `lopd_consent` node before `save_appointment`
- Every `next` value MUST reference a node that exists in `nodes`
- Do not reference `tenant_id` directly in flow JSON — it is passed at runtime
- `collect_lopd_consent` params MUST include `policy_url` and `policy_version`

## Validate with

```sh
npm run flows:validate
```
