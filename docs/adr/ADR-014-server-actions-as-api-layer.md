---
id: ADR-014
title: Server Actions are the only API layer; pages never query PocketBase directly
status: accepted
date: 2026-04-28
supersedes: —
---

## Context

The codebase has been built around two architectural premises that are correct but were never codified:

1. **PocketBase is a datastore, not a public API.** No browser code imports the PocketBase SDK. The PB endpoint is reachable from the Next.js server only.
2. **Server Actions are the application's single API layer.** Every read or write that a page or component needs goes through a `'use server'` function in `src/actions/**`.

Both premises are already implemented, but four admin pages currently violate the second one by pulling `pb` out of `getStaffCtx()` and calling `pb.collection(...).getFullList(...)` inline in the page render. Most prominent example: [src/app/(admin)/admin/(app)/reports/page.tsx](../../src/app/(admin)/admin/(app)/reports/page.tsx) line 19. This worked, but it scattered tenant-isolation filtering across page files instead of concentrating it in one auditable place, and it made testing the data path nearly impossible.

We just survived a SEV-1 incident (2026-04-26) where a missing `availability_slots` schema let production silently break while tests stayed green. That post-mortem made it obvious that we need a **single, auditable, contract-tested API surface** between the rendering layer and the datastore. A page that queries PB directly is unreviewable, untestable, and outside the contract.

The Week 1 of the backend foundation rebuild ([plan: humble-yawning-forest.md](../../C:/Users/rafon/.claude/plans/humble-yawning-forest.md)) is built on top of this premise. Locking it as an ADR before any Week 1 code lands.

## Decision

**Pages and React components MUST NOT call `pb.collection(...)` directly. All PocketBase access goes through Server Actions in `src/actions/**`.** A custom ESLint rule (`no-direct-pb-in-pages`) enforces this at lint time. The rule is part of the Definition of Done.

Concretely:

- `src/lib/pb.ts` continues to export `getPb()` — used only inside `src/actions/**` and `src/lib/**` (helpers that are themselves consumed by Server Actions).
- `src/lib/auth.ts` returns `pb` inside the staff context, but **the staff `pb` instance is for use inside Server Actions**, not for direct page-level queries. Pages should call typed Server Actions like `getReportRangeData()`, not `pb.collection('appointments').getFullList(...)`.
- Every Server Action is `'use server'`, accepts a Zod-validated payload, scopes by `tenant_id`, and is covered by a contract test in `tests/api/server-actions-contract.spec.ts`.
- Browser code (anything that ships in the client bundle) **never** imports PocketBase.

## Rationale

- **Auditability.** Tenant-isolation review (rubric S2) is a one-folder review: `src/actions/**`. If a page queries PB inline, every page becomes part of the security review surface.
- **Testability.** Server Actions are pure functions that take a payload and return a typed value. They contract-test trivially. Inline page queries don't.
- **Caching and observability.** Centralizing PB access in Server Actions means a single place to add caching, retry, logging, and tracing. Inline page calls fragment that work into N pages.
- **Migration safety.** If we ever swap PocketBase for Postgres + Prisma (out of scope for this rebuild but possible), only `src/actions/**` changes. Pages stay the same.
- **The lint rule makes regressions impossible.** Future contributors cannot accidentally re-introduce inline PB queries in pages.

## Alternatives Considered

| Option | Rejected because |
|---|---|
| **Allow inline `pb.collection(...)` in pages, document a convention.** | Conventions decay. We tried this for two years and the four bypass pages are the proof. |
| **Use a tRPC/REST endpoint layer in front of Server Actions.** | Adds a network hop and a duplicate type contract. Server Actions already give us strongly-typed RPC over `fetch`. No business case for an external API today. |
| **Use Next.js Route Handlers (`route.ts`) instead of Server Actions.** | Route Handlers are a fine choice for public API surfaces (webhooks, third-party callbacks). Server Actions are strictly better for internal page → server calls because they preserve types end-to-end without hand-rolled fetch wrappers. We use Route Handlers for the health check and webhook ingest only. |
| **Allow PB access in `'use server'` files anywhere in the tree.** | The rule "all PB access in `src/actions/**`" is a folder-level invariant we can lint and grep. Diluting it makes audit harder. |

## Consequences

- **Positive.** Single API surface to audit. Single API surface to contract-test. Lint rule prevents drift. Migration to a different datastore is now a `src/actions/**` rewrite instead of a whole-app rewrite. Zero client-side PB SDK code, so no risk of leaking server-side credentials into the browser bundle.
- **Negative / tradeoffs.** Adds one indirection (page → Server Action → PB) for every read. For trivial reads this looks like ceremony. Tradeoff accepted because the indirection is what makes the system reviewable.
- **Refactor cost.** Four admin pages need to migrate (Week 2 of the rebuild). Each migration creates one new Server Action method (`getReportRangeData`, `getCurrentSettings`, `getQuoteById`, `getQuoteContext`) and removes inline PB code from the page.
- **Tooling cost.** One new ESLint rule (`eslint-rules/no-direct-pb-in-pages.ts`). Wired into `eslint.config.mjs` with `--max-warnings=0` so any violation fails CI.
- **Neutral.** The architectural premise is unchanged for the rest of the codebase — `src/core/**`, `src/lib/**`, `src/components/**` already obey the rule. This ADR codifies the existing reality and closes the four known gaps.

## Review trigger

Revisit this ADR if any of the following becomes true:

- We add a public API endpoint that needs to bypass Server Actions (likely a webhook payload too large for Server Action limits — the WhatsApp ingest pattern in [decision 2026-04-27 mechanic-notes-workflow](../decisions/2026-04-27-mechanic-notes-workflow.md) might trigger this).
- We migrate from PocketBase to a different datastore.
- Server Actions stop being able to express a use case (e.g., true streaming responses, server-sent events) — at that point a Route Handler layer becomes appropriate for the streaming case only.

## Related contracts

- Tenant isolation: rubric row S2 (`docs/contracts/severity-rubric.md`).
- IVA invariant: rubric row F1 — every IVA-bearing read returns NET + rate; gross is rendered, never persisted.
- Definition of Done: zero ESLint warnings, including the new `no-direct-pb-in-pages` rule (`docs/decisions/DOR-DOD.md`).
