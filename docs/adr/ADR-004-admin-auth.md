---
id: ADR-004
title: Owner dashboard authentication strategy
status: accepted
date: 2026-04-18
---

## Context

The owner dashboard (`/admin/**`) must be accessible only to authenticated shop staff. The platform is multi-tenant SaaS — each tenant's owner must see only their own data. We need an auth strategy that works with PocketBase and Next.js middleware without building custom auth from scratch.

## Decision

Create a PocketBase `staff` collection with `type: "auth"` (built-in PocketBase auth). A `role` field (`owner | technician | admin`) controls feature access. Next.js middleware at `middleware.ts` validates the PocketBase JWT on every `/admin/**` request. Session stored in an httpOnly cookie (`pb_auth`).

## Rationale

PocketBase's auth collections handle password hashing, JWT issuance, session refresh, and password reset out of the box. This avoids building auth primitives (a security-sensitive area). The `tenant_id` on the staff record ensures each user sees only their tenant's data — consistent with existing row-level isolation in `pb_hooks/tenancy.pb.js`.

## Staff collection fields

```
staff (type: auth) {
  tenant_id: text (required)
  role: select [owner, technician, admin]
  display_name: text
  phone: text
  active: bool (default: true)
}
```

## Auth flow

1. `GET /admin/login` — login page (email + password)
2. POST → PocketBase `staff` auth endpoint → returns JWT
3. JWT stored in `pb_auth` httpOnly cookie (30-day expiry)
4. `middleware.ts` verifies JWT on every `/admin/**` request; redirects to `/admin/login` on failure
5. Server components call `getStaffCtx()` (new helper in `src/lib/auth.ts`) which reads JWT from cookie

## Alternatives Considered

| Option | Rejected because |
|---|---|
| PocketBase `_superusers` (admin) | Single global admin account; no per-tenant isolation; not suitable for multi-tenant SaaS |
| NextAuth.js | External dependency; complex setup; PocketBase already has auth |
| Magic link / OAuth | Adds Resend/Google dependency for auth; overkill for single-owner taller MVP |
| No auth (IP whitelist) | Not viable for SaaS product or mobile access |

## Consequences

- Positive: Per-tenant isolation works with existing `tenancy.pb.js` hook
- Positive: Zero new auth libraries — PocketBase JWT is already trusted
- Positive: Role-based access (owner sees settings; technician sees only calendar)
- Negative: PocketBase JWT secret must be kept secret (already in .env)
- Negative: Password reset requires Resend email (already in stack — low overhead)
- Neutral: Initial staff record created in `scripts/db-setup.js` seed

## Review trigger

When adding OAuth (Google login for staff), or when a customer-facing portal (vehicle history for end customers) is added.
