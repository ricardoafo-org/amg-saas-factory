---
id: ADR-001
title: Multi-service booking data model — JSON array in appointments
status: accepted
date: 2026-04-18
---

## Context

The current `appointments` collection has a single `service_id: text` field. Sprint 1 FEAT-004 requires customers to book multiple services (e.g., oil change + brake check) in one appointment. The data model must evolve without breaking existing single-service records.

## Decision

Replace `service_id: text` with `service_ids: json` (stored as a JSON array of service ID strings). A migration in `scripts/db-setup.js` redefines the collection. Existing records retain their data; application code treats `service_ids` as canonical.

## Rationale

PocketBase's JSON field type is the only native array storage. Alternatives (separate join collection, comma-separated string) introduce unnecessary query complexity or type unsafety. JSON arrays are already used in PocketBase for similar patterns.

## Alternatives Considered

| Option | Rejected because |
|---|---|
| `appointment_services` join table | Over-engineering for ≤5 services per booking; adds a second PB query on every read |
| Comma-separated `service_ids: text` | Not type-safe; requires manual parsing; no schema enforcement |
| Keep `service_id` + add `extra_service_ids` | Split brain — two fields for the same semantic concept |

## Consequences

- Positive: Single field, type-safe array, trivial JSON serialization
- Positive: Works for 1..N services with no schema change
- Negative: No relational integrity at DB level (PocketBase JSON has no FK constraint)
- Negative: Filter/search "which appointments include service X" requires JSON path query
- Neutral: TypeScript type changes from `serviceId: string` → `serviceIds: string[]`

## Review trigger

If PocketBase adds native array/relation fields, or if reporting requires complex service-join queries (>10k appointments/month).
