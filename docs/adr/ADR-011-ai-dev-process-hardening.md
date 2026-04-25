---
id: ADR-011
title: AI development process hardening — gates, chain, branch hygiene
status: accepted
date: 2026-04-25
supersedes: (none — extends ADR-005 testing architecture)
---

## Context

On 2026-04-25 a HIGH-severity filter-injection vulnerability landed on `main` via PR #20 (FEAT-031, customer post-booking registration). The vulnerability:

```ts
.getFirstListItem(`tenant_id = "${opts.tenantId}" && email = "${safeEmail}"`)
```

`safeEmail` was lowercased and trimmed but not escaped — a crafted email payload bypassed the tenant predicate, exposing customer records across tenants (IDOR).

Root-cause analysis surfaced **five process leaks** behind the single technical bug:

1. **Auto-merge fired before security audit completed.** CI passed → GitHub merged → security-auditor returned FAIL ten minutes later. The reviewer chain ran out-of-band and lost the race.
2. **Auto-merge was missing on three consecutive PRs (#20, #21, #22)** until the user flagged it. The implementer prompt did not bundle `gh pr merge --auto` into the create flow.
3. **Stale-branch state caused a false bug filing.** The FEAT-032 implementer branched off the current workdir HEAD (which was behind `origin/main`) and reported `frenos` was missing from the chatbot flow — it had landed in BUG-007's fix the same day.
4. **Reviewer chain was voluntary.** `CLAUDE.md` documented the Builder-Validator chain but nothing in tooling enforced "no PR until reviewers PASS."
5. **Spec deviations were buried in tool-result text.** The PR description had no required `Spec Deviations` section, so the FEAT-032 false note about `frenos` was easy to miss in review.

Each of these is a small failure individually. Together they let a HIGH security bug ship and stayed undiscovered until a follow-up audit. The pattern will repeat unless the workflow itself stops it.

## Decision

We harden the AI development workflow at five points so that process leaks become impossible-to-merge instead of "we caught it after merge":

1. **Deterministic security gate as a required CI check.** `.github/workflows/security-gate.yml` runs `scripts/ci-security-gate.sh` on every PR. It mirrors the deterministic checks of `compliance-reviewer.md` and `security-auditor.md` (filter injection, hardcoded IVA, PII in logs, pre-ticked consent, client-side secrets, consent-log ordering, unconditional analytics, env-file commit). Branch protection requires it.
2. **Implementer self-runs the gate before push.** `bash scripts/ci-security-gate.sh` is added to the implementer's mandatory local quality gates. CI is defence in depth, not the first line.
3. **Implementer does NOT open the PR.** The implementer pushes the branch and reports `Implementation complete. Branch pushed.` The orchestrator runs the reviewer chain (compliance-reviewer + validator + security-auditor), waits for PASS, **then** opens the PR with `gh pr create … && gh pr merge --auto --squash --delete-branch` as a single atomic flow. This separation closes the race that PR #20 lost.
4. **Mandatory branch hygiene preamble.** The implementer's first action before reading the spec is `git fetch origin --prune && git checkout -B <branch> origin/main`. No exceptions. Stale workdir state cannot leak into the implementation.
5. **Structured PR template with enforced sections.** `## Summary`, `## Spec Deviations`, `## Reviewer Reports`, `## Auto-merge`, and `## Quality gates` are required and validated by `.github/workflows/pr-template-check.yml`. Empty placeholder sections fail the check.

## Rationale

The five fixes target the five leaks 1:1. Each is the smallest change that makes the corresponding failure mode impossible — not "discouraged."

- **Gate as CI required-check** is the only fix that survives the auto-merge race. AI agents and humans both forget; CI doesn't.
- **Self-run before push** keeps the feedback loop tight. Discovering a filter-injection in CI five minutes later is fine; discovering it in production is not.
- **Orchestrator opens the PR** breaks the race. There is no PR for auto-merge to fire on until the reviewer chain has reported.
- **Branch hygiene** removes the entire class of "agent worked from stale state" bugs at the cost of one `git fetch` per task.
- **PR template enforcement** turns "deviations buried in agent result text" into "missing sections fail CI." Cheap, high-signal.

We do **not** add a "human must approve every reviewer chain output" step. That re-introduces the manual choke-point we are explicitly trying to remove. The reviewer agents are deterministic enough (grep-based) for the security-critical checks; AI judgement remains for nuance, but cannot be the gate of last resort.

## Alternatives Considered

| Option | Rejected because |
|---|---|
| Run reviewer agents inside CI as separate jobs | Reviewer agents are LLM-based — non-deterministic, slow, expensive on every PR. The deterministic grep gate covers the regression-prone surface; LLM review remains in the orchestrator's pre-PR step. |
| Keep implementer opening PRs but add `--draft` | Drafts can still be promoted by automation. The race window narrows but doesn't close. |
| Trust agents to "remember" CLAUDE.md rules | Memory is unreliable across sessions and compaction. Today's incident proved the rules existed and were skipped anyway. Rules need to be **mechanical**, not memorised. |
| Lock down `gh pr merge --auto` via repo policy | Auto-merge is a feature we want — for routine post-review merges. The fix is to gate WHAT can merge, not whether merging is automatic. |
| Add a manual approval gate before merge | Re-introduces the bottleneck the AI workflow is supposed to remove. The user explicitly wants approve-once-then-auto-merge. |

## Consequences

**Positive**
- Filter-injection class bugs cannot reach `main` again — gate runs on every PR before merge.
- PR #20 incident pattern (auto-merge before audit) is mechanically impossible: implementer no longer opens PRs.
- FEAT-032 stale-branch class bug is mechanically impossible: implementer always starts from `origin/main`.
- PR review surface gets richer (Reviewer Reports, Spec Deviations) without adding manual work — orchestrator fills these from agent output.
- Local + CI parity: every implementer can reproduce a CI failure with one bash command.

**Negative / tradeoffs**
- Orchestrator workflow is more complex: it now drives `git push → reviewer chain → gh pr create → gh pr merge --auto`. The implementer prompt is correspondingly simpler.
- Existing PRs in flight (#23, #24) were created under the old workflow and don't have the new structured PR sections. They merge as-is; new ones will follow the template.
- `pb.filter()` parameterization is now required in code style — adds one line per PocketBase query. The cost is negligible; the safety is structural.
- `scripts/ci-security-gate.sh` is grep-based — false negatives are possible for novel attack patterns. Mitigated by keeping the LLM security-auditor in the orchestrator's pre-PR step for judgement-call review.

**Neutral**
- Branch protection settings on `main` need to be updated in the GitHub repo settings to require the new `Security gate (deterministic)` and `PR template — required sections` checks. This is a manual one-time step.
- The pre-existing 4 filter-injection sites (admin quotes/settings) were fixed inline as part of this hardening because the gate would block any PR otherwise. Future drift is caught.

## Review trigger

Revisit this ADR when:

- A new class of vulnerability appears that the deterministic gate misses (extend the gate, then revisit if it stops scaling)
- The reviewer agent set changes (e.g., a new specialised auditor for chatbot prompt injection) — orchestrator chain must absorb it
- We add a second tenant in production (multi-tenant assumptions in the gate may need to harden)
- An incident proves the orchestrator-opens-PR model still has a race we missed
