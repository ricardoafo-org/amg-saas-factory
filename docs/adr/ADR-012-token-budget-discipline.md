---
id: ADR-012
title: Token-budget discipline for orchestrator + agent chain
status: accepted
date: 2026-04-25
---

## Context

PR #26 (FEAT-035, prompt/rubric/CI only — no application code) burned ~116k tokens across the three reviewer agents:

- compliance-reviewer: 41.3k tokens, 50 tool uses, 41 grep patterns (38 of them no-ops on a markdown PR)
- validator: 42.1k tokens, 19 tool uses, re-read every file compliance already read
- security-auditor: 32.9k tokens, 22 tool uses — the only one that earned its tokens (found 2 critical issues)

Cause: the reviewer chain in CLAUDE.md is sized for application-code PRs (server actions, PocketBase queries, PII surfaces). It runs at full intensity on every PR regardless of scope. Agents start cold, re-read the same files, and produce verbose narrative reports when checklists would do.

This ADR sets the rules that bring spend back in line.

## Decision

Three rules, enforced by the orchestrator and codified in CLAUDE.md.

### Rule 1 — Reviewer chain scoped by PR diff

| PR scope (detected via `git diff --name-only origin/main..HEAD`) | Reviewer chain |
|---|---|
| Only `*.md`, `docs/**`, `.claude/agents/**`, `.claude/rules/**` | **security-auditor only** (prompt-injection, secrets, permissions) |
| Only `*.yml`, `.github/workflows/**` | **security-auditor only** (workflow injection, permissions, secrets) |
| Only UI files: `src/core/components/**/*.tsx`, `*.css`, `globals.css` | **compliance-reviewer + ui-designer** |
| Touches `src/actions/**`, `src/app/api/**`, `pb_migrations/**`, or any PocketBase query | **Full chain**: compliance-reviewer → validator → security-auditor |
| Touches `src/lib/chatbot/**`, `clients/**/chatbot_flow.json` | **compliance-reviewer + qa-chatbot validator** (no security-auditor unless flow handles PII) |
| Pure docs (`docs/**` only, no `.claude/**`) | **No chain** — orchestrator self-reviews |

The orchestrator runs `git diff --name-only origin/main..HEAD` before invoking any reviewer, classifies the PR, and dispatches accordingly. Default to the more expensive chain when ambiguous.

### Rule 2 — Subagent prompt + response budget

Orchestrator prompts to subagents:
- **Cap at 200 words** unless complexity demands more (justify in the prompt itself)
- **Pass file paths + line numbers**, never re-paste content the agent can read
- **Pass `git diff --name-only` output** so the agent only checks changed files
- **Ask for checklist responses**, not narrative reports — explicitly state "Reply format: PASS/FAIL per check, file:line for any FAIL, no prose summary"

Subagent responses:
- **Reviewers**: max ~30 lines (checklist + file:line citations)
- **Research agents**: cap output at 3,000 words (~4k tokens). If they need more, they split into a second call
- **Implementers**: report what changed (filenames, gates, branch); do not re-summarize the spec

### Rule 3 — Right-size the model per task

| Task | Model |
|---|---|
| Grep-heavy mechanical checks (compliance-reviewer, test-deletion verification) | **Haiku** (claude-haiku-4-5) |
| Implementation, validator prose review, qa-engineer test design | **Sonnet** (claude-sonnet-4-6) |
| Architecture, design, ADRs, security-auditor on critical surfaces | **Opus** (claude-opus-4-7) |
| Background research with structured questions | **Sonnet**; escalate to Opus only if research questions involve trade-off reasoning |

Pass the model explicitly in every Agent call via the `model` parameter. Do not rely on agent-file defaults — they were set before this ADR and may drift.

## Rationale

The token problem has three independent causes. One rule per cause:

1. **Wrong chain for the PR** — chain is sized for the worst case but runs on every case. Scope by diff.
2. **Cold context, verbose round-trips** — agents re-derive what the orchestrator already knows. Cap prompts, hand them paths, demand checklists.
3. **Wrong model for the work** — Sonnet for grep is overkill; Opus for routine implementation is wasteful.

Together these target ~50–70% reduction on a typical PR cycle. Most savings come from Rule 1 — the chain skip on non-code PRs.

## Alternatives Considered

| Option | Rejected because |
|---|---|
| Single mega-reviewer agent that does everything | Loses specialization (compliance grep patterns, security threat models, validator AC verification are genuinely different jobs); also one bigger context per PR is more expensive than three scoped contexts |
| Run all three reviewers always but in parallel | Already what we do — saves wall time, not tokens |
| Cache file reads across agents in the same PR cycle | Not supported by the Agent tool today; would require infra change |
| Drop reviewer chain entirely, rely on CI security-gate | CI gate is deterministic-only (grep). Misses prompt-injection, AC verification, design judgment |
| Pre-compute all checks into a single bash script | Same as above — covers ~30% of what the agents catch, misses the other 70% |

## Consequences

**Positive**:
- ~50–70% token reduction on typical PR cycles
- Faster feedback on small/docs PRs (one agent instead of three)
- Forces sharper orchestrator prompts (writing 200 words is harder than writing 800)
- Right-sized models surface where Opus is genuinely needed vs habit

**Negative / tradeoffs**:
- More orchestrator logic — must classify PR before dispatching
- Risk of misclassification (e.g. a `.md` PR that quietly modifies a workflow). Mitigation: when ambiguous, escalate to fuller chain
- Checklist-only responses lose some signal (no narrative explanation of judgment calls). Mitigation: agents allowed to add a `## Notes` section, capped at 5 lines

**Neutral**:
- Agent definitions in `.claude/agents/*.md` keep their full charters; the orchestrator just chooses when to invoke them
- CI security-gate workflow stays unchanged — it is the deterministic backstop

## Implementation

This ADR is a contract. Implementation is two follow-up edits, not a new feature:

1. **CLAUDE.md** — replace the current "Builder-Validator chain" section with the per-PR-type matrix from Rule 1; add Rule 2 (prompt budget) and Rule 3 (model assignments) as sub-sections
2. **`.claude/agents/*.md`** — add `Response format` line to each reviewer agent: "Reply with checklist PASS/FAIL + file:line for FAIL. Optional `## Notes` section, max 5 lines."

Both edits land in a single follow-up PR (FEAT-036 or similar). Until that PR ships, the orchestrator follows this ADR manually.

## Review trigger

Revisit when:
- A PR slips through with a critical bug that the scoped chain would have caught had the full chain run
- Token-per-PR average drops below 30k — at that point we may have over-corrected and can loosen Rule 2
- Anthropic ships a cheaper / faster Haiku that changes the model-cost matrix
