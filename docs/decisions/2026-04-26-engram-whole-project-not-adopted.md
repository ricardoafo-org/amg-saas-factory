# Decision · Engram whole-project indexing — NOT adopted

**Date:** 2026-04-26
**Owner:** rafo-claude-bot (delegated; user authorized)
**Closes:** Task #42 — Investigate "whole project in engram" feasibility (cost analysis)

## Context

Open question: should we mass-index the whole codebase (every `.ts/.tsx`, every spec, every ADR) into Engram so agents can semantically search the codebase via `mem_search` instead of `Glob` + `Grep`?

## Decision

**No.** Closing #42 without adoption.

## Reasoning

1. **Glob + Grep are already free and instant.** The marginal latency between `mem_search` and `rg` over the local tree is negative for `rg` — file-system search is faster, deterministic, and never stale. Indexing buys nothing for code retrieval.
2. **Token cost to index is high, recurring, and asymmetric.** Re-indexing on every code change either adds a perpetual mem_save tax or accepts staleness. Either way, code changes faster than memory can keep up. Code in git is the single source of truth — Engram is *derived* knowledge.
3. **Engram's value is *distilled* knowledge.** Decisions, conventions, gotchas, "why we did X". Raw code bytes are not knowledge — they're inputs from which knowledge is *extracted*. Storing extracted decisions (architecture, bug post-mortems, rules) gives 100× the leverage at 1% the volume.
4. **Search-by-meaning vs search-by-token.** When agents need a function, they know the name → grep. When they need a *reason*, they search Engram. The split is clean. Mixing the two pollutes both.
5. **Already validated by current usage.** Every productive engram entry in the project so far is decision/discovery/convention. Zero are "the body of `saveAppointment`". The pattern works. Don't break it.

## Implications

- **Continue current pattern**: save decisions, conventions, bug post-mortems, gotchas, user preferences via `mem_save` with structured content. Do NOT mem_save raw file contents.
- **Codebase navigation stays via**: `Glob` (file paths), `Grep` (content), `Read` (targeted reads with offset/limit).
- **Spec/ADR/decision docs stay in the repo** under `docs/specs/`, `docs/adr/`, `docs/decisions/` — committed, versioned, reviewable. Engram references them by title; doesn't store them.

## Revisit triggers

Reopen this decision if any of the following becomes true:

- A different memory system with deterministic indexing and free retrieval emerges.
- The codebase grows past ~5k files and `rg` latency becomes noticeable on a hot session.
- We adopt agents that cannot run `Glob`/`Grep` and need semantic search as the only retrieval path.

Until then: Engram for distilled knowledge. Files for code.
