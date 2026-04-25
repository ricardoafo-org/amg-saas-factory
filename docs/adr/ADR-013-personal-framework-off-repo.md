---
id: ADR-013
title: Personal AI development framework lives off-repo; engram is the runtime store
status: accepted
date: 2026-04-25
supersedes-partial: ADR-012 (token-budget rules absorbed and tightened)
---

## Context

The AMG repo accumulated personal AI tooling alongside project artifacts:

- `.claude/agents/*.md` — 9 agent charters (compliance-reviewer, validator, security-auditor, qa-engineer, implementer, architect, ui-designer, frontend-developer, bug-triager)
- `.claude/rules/*.md` — 4 path-scoped rules (server-actions, components, chatbot-flows, severity-rubric)
- `.claude/skills/**` — 7 skill bundles (factory-core, monolith-engine, qa-chatbot, qa-web, qa-testing-patterns, design-system, es-compliance)
- Large blocks inside `CLAUDE.md` describing the agent roster, builder-validator chain, model assignments, session hygiene

This is **personal workflow**, not project artifact. It is committed to git on a single-developer project with no other contributors. Two costs:

1. **Token waste per PR.** PR #29 (BUG-009 + BUG-013, 3 files / 80 LOC) burned 88.8k tokens through the reviewer chain. ~70k of that was charters cold-loading and three subagents independently re-reading the same files. The overhead does not scale with the diff.
2. **Repo coupling.** A future contributor (or CI agent without engram access) inherits the AI framework. They cannot run it without the user's `~/.claude/` config and engram store; they cannot ignore it because it is wired into `CLAUDE.md`.

ADR-012 set token-budget rules but kept the framework in-repo. This ADR removes that constraint.

## Decision

The personal AI development framework moves out of the AMG repo. The repo keeps only what serves any developer (or AI) regardless of toolchain:

1. **Project artifacts stay** — `docs/{specs,bugs,adr,decisions,qa-reports,contracts}/`, conventional-commits config, pre-commit hook, GitHub workflows that enforce code quality without AI knowledge (`security-gate.yml`, `test-deletion-guard.yml`, `pr-template-check.yml`).
2. **Framework files leave** — agent charters, path-scoped rules, and skill bundles move to `~/.claude/` (per-user). Compact runtime rules are stored in **engram** under stable topic keys; `~/.claude/*.md` files remain as the source of truth, engram entries are projections rebuilt on session start.
3. **AMG-specific knowledge is duplicated** — human-readable copies live in `docs/contracts/` (project-owned, no AI dependency). Compact runtime versions live in engram (`amg/iva-contract`, `amg/tenant-isolation`, `amg/severity-rubric`).
4. **`CLAUDE.md` strips down** to bare project facts: stack, commands, paths, git workflow. No agent roster, no chain rules, no model assignments.
5. **Reviewer dispatch follows a deterministic table** keyed on diff metadata (paths + LOC). Judgment-call gates are not allowed.

## Reviewer Dispatch Table

The orchestrator runs `git diff --name-only origin/main...HEAD` + `git diff --shortstat origin/main...HEAD` and dispatches per the table below. **All gates are deterministic — no judgment.**

| Diff classification | Reviewer chain | Rationale |
|---|---|---|
| `docs/**` only | **0 subagents.** Orchestrator self-review. | No code surface. |
| Diff < 150 LOC AND < 5 files AND no path in `src/actions/**`, `src/app/api/**`, `pb_migrations/**`, `clients/**/chatbot_flow.json`, `src/lib/nlp/**` | **0 subagents.** CI `security-gate.yml` is the backstop. | Low-risk surface; deterministic CI greps cover compliance. |
| **Mechanical pattern-swap** (see definition below) — even if path matches a higher-risk row | **0 subagents.** Orchestrator self-review against the deterministic Mechanical Patch Checklist. | Two subagents on PR #31 added 56k tokens and 0 findings the orchestrator could not have seen in the diff. |
| UI / component only (`src/core/components/**` + `*.css` + `globals.css`) | **1 subagent**: security-auditor (Sonnet, diff-first). | UI surfaces can leak PII or hardcode tenant data; no auth or query risk. |
| Touches `src/actions/**` OR `src/app/api/**` OR `pb_migrations/**` OR new PB filter (and NOT mechanical) | **2 subagents**: security-auditor (Sonnet) + qa-engineer (Sonnet). Orchestrator does AC verification inline against the spec. | Server-side surface; needs threat model + AC check. |
| New auth path / prompt-injection surface (NLP system prompt) / IDOR vector | **Full chain** (compliance + validator + security-auditor, security-auditor on Opus). | Residual high-risk case where independent threat modelling justifies its cost. |

## Mechanical Patch Definition

A diff is **mechanical** if and ONLY if **every one** of the five conditions holds. If any single condition fails, it is not mechanical and the dispatch falls back to the next-most-specific row.

1. **Single transform rule.** The change is a regex-detectable replacement of pattern A with pattern B. The orchestrator must be able to state the rule in one sentence ("replace `\`tenant_id = "${x}"\`` with `pb.filter('tenant_id = {:t}', {t: x})`").
2. **No new logic.** No new conditionals, loops, error paths, or function calls except those required by the transform itself.
3. **No new control flow.** No new throws, no new try/catch, no new early returns, no new awaits except those mandated by the SDK signature change.
4. **No new data fields.** No new payload keys, no new DB columns, no new types added.
5. **Test contract preserved.** Existing tests still cover the same behaviour; new tests only assert the transform itself (e.g. "template uses `{:k}` placeholder, not raw value"). No new feature-level tests.

## Mandatory Pre-Spawn Checklist

The orchestrator MUST run this checklist before invoking the Agent tool with `subagent_type` ∈ {security-auditor, qa-engineer, compliance-reviewer, validator, architect, frontend-developer, ui-designer, implementer, bug-triager} on any AMG diff. The checklist runs even for fast-mode sessions.

```
1. Diff classification:
   - run: git diff --name-only origin/main...HEAD
   - run: git diff --shortstat origin/main...HEAD
   - record: file globs touched, total LOC, total files
2. Apply dispatch table top-down. The FIRST matching row wins.
3. If row says 0 subagents → STOP. Do not spawn. Self-review.
4. If row says ≥1 subagents → re-test the Mechanical Patch Definition.
   If all 5 conditions hold → override row to "0 subagents" per the
   Mechanical Patch row. Do not spawn.
5. Only after steps 3–4 reject the 0-subagent path may a spawn occur.
```

The orchestrator MUST output the classification result (which row matched, how many subagents) before issuing the Agent call. If the user sees a spawn without a preceding classification, the user is entitled to abort the session.

**No-judgment rule.** "I think this needs a second opinion" is not a basis for spawning. Either the dispatch table mandates it or it does not happen.

## Subagent Prompt Contract

Whenever a subagent is dispatched:

1. **Pass the unified diff inline** in the prompt — do not let the subagent re-read files cold. `git diff origin/main...HEAD` is ~3k for a typical PR vs ~15k of cold file reads across three subagents.
2. **Pass compact rules pre-digested** from engram (`severity-rubric/full`, `amg/iva-contract`, etc.) — paste the relevant excerpts into the prompt, do not pass topic keys for the subagent to fetch.
3. **One-line file metadata per changed file** — "ServiceGrid.tsx: presentational component, no I/O" so the subagent has structural context without reading.
4. **Explicit no-read directive** unless justified — "Do NOT Read() files unless a finding requires context the diff doesn't show. Justify any Read() in one line."
5. **Checklist response format** — "PASS/FAIL per check + file:line for any FAIL. Optional `## Notes` section, max 5 lines. No prose summary."
6. **≤ 200-word prompt** unless complexity demands more (justify in the prompt).
7. **Default model: Sonnet.** Opus only when the threat surface explicitly justifies it.

## Engram Topic Keys

Stable runtime keys for the AMG project:

| Topic key | Content | Source of truth |
|---|---|---|
| `amg/iva-contract` | basePrice is NET; gross = basePrice × (1 + ivaRate) at render and booking | `docs/contracts/iva.md` |
| `amg/tenant-isolation` | All PocketBase queries scoped by `tenant_id`; never interpolate user input into filter strings | `docs/contracts/tenant-isolation.md` |
| `amg/severity-rubric` | MSRC-derived security axis (S1–S12) + AMG functional axis (F1–F12) | `docs/contracts/severity-rubric.md` |
| `amg/lopd-consent-order` | `consent_log.create()` MUST precede any personal data write | `docs/contracts/tenant-isolation.md` |
| `agent/<name>/manual` | Compact charter per agent (rules, threat model, output format) | `~/.claude/agents/<name>.md` |
| `amg/dispatch-table` | The reviewer dispatch table from this ADR (cached for orchestrator runtime) | This ADR |

Orchestrator behaviour: on first message of a session, `mem_search(amg/)` to verify cache freshness; rebuild from `docs/contracts/` + `~/.claude/agents/` if any topic key is missing or stale (older than the source file's mtime).

## Rationale

Three independent forces converge:

1. **Engram exists and is used.** It supports stable topic keys, full-content retrieval by ID, search-by-metadata. The "search returns metadata + IDs, full content fetched on demand" pattern is exactly the cost shape we want.
2. **Subagent tool-definition load is fixed at ~6–8k per spawn.** Not spawning is the only way to avoid it. The 0-subagent path for low-risk diffs eliminates that cost entirely.
3. **The deterministic CI gates already exist** — `security-gate.yml` runs the same grep checks the compliance-reviewer subagent runs. Re-running them in a subagent is duplicated work for ~25k.

Estimated effect: PR #29-class diffs go from ~88.8k to ~5–12k session-amortized. Higher-risk diffs go from ~88.8k to ~25–50k. **~85% reduction averaged across a typical session.**

## Alternatives Considered

| Option | Rejected because |
|---|---|
| Keep framework in-repo, optimize prompts only (ADR-012 alone) | Cuts 30–50% but cannot remove the cold-load floor (~6–8k per spawn × 3 spawns = 24k baseline). |
| Move framework to engram only, no `~/.claude/` files | Engram has no source of truth on disk. A fresh shell on the same machine after `~/.engram` is wiped loses everything. |
| Move framework to a sibling git repo (e.g. `amg-ai-framework/`) | Adds repo overhead, still requires explicit fetch on each clone, doesn't solve the cold-load cost. |
| Always-zero-subagent + judgment-call gates | Judgment gates erode under deadline pressure. Mechanical gates (file globs + LOC) are the only enforceable form. |
| Always-spawn-three (the today behavior) | The status quo. Costs $1+ per PR cycle that the user is now choosing to stop paying. |

## Consequences

**Positive**:
- ~85% token reduction averaged across PR cycles
- Repo is leaner; no AI tooling on first-clone surface
- Engram becomes the source of operational rules — cheaper, faster, compaction-safe (re-read on session start)
- Fresh-clone CI runs without engram and still passes (CI gates are AI-agnostic)

**Negative / tradeoffs**:
- A second developer joining cannot reproduce the AI workflow without the user explicitly sharing `~/.claude/` + an engram seed. Acceptable: the user is solo and will produce a setup doc on demand.
- Reviewer dispatch table must be maintained. Drift between table and orchestrator behaviour is a real risk; mitigated by deterministic gates (file globs + LOC, both scriptable).
- The 0-subagent path drops independent threat modelling on small diffs. The pre-existing `chatbot.ts:67` filter-injection found by security-auditor on PR #29 is a reminder that this trades a real (small) chance of catching a hidden bug for a real (large) cost reduction. Mitigated by the "any auth/PB-filter/NLP touch escalates to security-auditor regardless of LOC" rule.

**Neutral**:
- `docs/contracts/` becomes the new canonical home for AMG legal/architectural invariants. Adds three files; replaces the rule files that left.
- ADR-012 remains accepted; this ADR supersedes its dispatch matrix and prompt-budget rules with the simpler table + contract above.

## Implementation

This ADR is a contract. Initial migration ships in **this PR**:

1. `git rm` `.claude/agents/bug-triager.md` and `.claude/rules/severity-rubric.md` (the two files added this week)
2. Add `docs/contracts/severity-rubric.md` (human reference, project-owned)
3. Strip the agent roster, Builder-Validator chain, Skills, and Path-scoped rules sections from `CLAUDE.md`; replace with a one-line pointer to this ADR
4. Save engram entries: `amg/iva-contract`, `amg/tenant-isolation`, `amg/severity-rubric`, `amg/dispatch-table`, `amg/adr-013/decision`

**Follow-up PRs (not blocking this ADR)**:

- Migrate the remaining 8 `.claude/agents/*.md` and 3 `.claude/rules/*.md` files out of the repo (one PR per agent cluster, after each is verified to work from `~/.claude/`)
- Migrate the 7 `.claude/skills/**` bundles — split human knowledge into `docs/contracts/` + `docs/architecture/` and move instructional prose into `~/.claude/skills/`
- Add `docs/contracts/iva.md` and `docs/contracts/tenant-isolation.md` (this PR ships only the rubric to keep scope tight)

## Future enforcement (opt-in)

The orchestrator obeys the dispatch table by convention. Convention failed once already (PR #31: 56k tokens on a 188-LOC mechanical patch — both subagents performed `Read()` against the explicit `Do NOT Read()` directive). If convention fails a second time, escalate to **runtime enforcement** via Claude Code `PreToolUse` hooks:

1. Define a hook in `~/.claude/settings.json` keyed on `PreToolUse` for tools `Read`, `Glob`, `Grep`.
2. The hook script checks whether the calling agent's parent prompt contains the marker `<<DIFF_ONLY>>`. If yes, deny the tool call with a non-zero exit code; the subagent receives an error and cannot read.
3. Orchestrator includes `<<DIFF_ONLY>>` in every dispatched prompt by default. Subagent that legitimately needs to Read must override with `<<ALLOW_READ: <one-line justification>>>` — the hook permits Read only when the override is present.

Until that hook is wired, the contract above is the only enforcement and the user is the auditor.

## Review trigger

Revisit when:
- A PR slips through with a bug that the dropped reviewer would have caught and the dispatch table would have skipped
- Average token spend per PR drops below 5k — at that point the dispatch table may be over-aggressive on the low-risk side
- A second mechanical-patch dispatch burns >25k — at that point the `PreToolUse` hook (Future enforcement, above) becomes mandatory rather than opt-in
- A second developer joins the project — at that point we need a setup doc and a seed script for `~/.claude/` + engram
