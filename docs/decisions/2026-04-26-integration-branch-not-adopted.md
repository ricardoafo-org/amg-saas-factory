# Decision · Integration-branch model — NOT adopted

**Date:** 2026-04-26
**Owner:** rafo-claude-bot (delegated; user authorized)
**Closes:** Task #69 — Workflow · Adopt integration-branch model

## Context

Question: should we introduce a `develop` (or `integration`) branch as a buffer between feature branches and `main`?

Proposed flow (rejected):

```
feature/* → develop → main → tst → pro
```

Current flow (kept):

```
feature/* → main → tst → pro
```

## Decision

**No.** Closing #69 without adoption.

## Reasoning

1. **Green-deploy gate already provides the same protection.** Per the rule established 2026-04-26 (`workflow/green-deploy-gate` in Engram), no new code PR starts until the previous one is green on tst. That serializes risk in the same way an integration branch would, without adding a branch to manage.
2. **Team size is 1 + AI.** Integration branches earn their keep when multiple humans land work simultaneously and a "stable" mid-point is needed. With a serialized AI-driven cadence, the buffer adds no signal.
3. **CI gates already block bad PRs from `main`.** Type-check, unit tests, security gate, PR template, npm audit — all required. A second integration step would re-run the same gates against the same commits.
4. **Cost of adoption is non-trivial.** A new branch model means: branch protection rules duplicated, deploy workflows trigger-rewritten, ADRs updated, mental overhead per PR. Reward is near zero given (1)-(3).
5. **`main` is already the integration branch.** The current model treats `main` as the line that must always deploy green. The green-deploy-gate enforces that. Adding `develop` would just mean `main` is *almost always* green and `develop` is *sometimes* green — strictly worse than what we have.

## Implications

- Branch model documented in `CLAUDE.md` stands: `main` (protected), `feature/*`, `fix/BUG-XXX`, `chore/*`, `docs/*`, `test/*`.
- Green-deploy-gate (one-PR-at-a-time on `main` until tst is green) is the canonical safety mechanism.
- If we ever onboard a second human contributor and PR cadence overlaps, **revisit this decision** — that's the trigger.

## Revisit triggers

Reopen if any of the following becomes true:

- More than one human ships PRs concurrently.
- Tst becomes a shared multi-tenant rehearsal env where contamination from one PR impacts another team's work.
- Post-deploy gates become slow enough (>15 min) that the green-deploy-gate becomes a productivity ceiling.

Until then: `main` is the integration branch. Keep it green.
