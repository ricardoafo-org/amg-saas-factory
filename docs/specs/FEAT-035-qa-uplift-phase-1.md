# FEAT-035 — QA Uplift Phase 1: bug-triager + ISTQB-grade qa-engineer + test-deletion guard

## Intent

Today QA is junior-grade: the team files bugs but no agent investigates them before they hit the implementer queue, and `qa-engineer` writes tests by intuition rather than by published technique. Research (`docs/research/2026-04-25-qa-and-bug-triage-sota.md`) recommends three Sprint-6 changes — all prompt/rubric/CI, no infra — that lift us to Cognition-Devin-grade triage and ISTQB-CTFL-grade test design in one cycle. This spec ships those three. Phase 2 (property tests + traceability) and Phase 3 (Stryker mutation testing) will follow as FEAT-036 and FEAT-037.

## Acceptance Criteria

1. [ ] A new `bug-triager` agent file exists at `.claude/agents/bug-triager.md` with charter, tools (Read, Glob, Grep, Bash for `git log`/`gh`), and a 4-step playbook (read report → search code → check git history → summarize)
2. [ ] A new severity rubric exists at `.claude/rules/severity-rubric.md` derived from MSRC's AI Bug Bar, with AMG-specific rows: cross-tenant PII leak = SEV-1, tenant-isolation IDOR = SEV-1, missing-IVA on quote = SEV-2, chatbot flow regression = SEV-2, dead link = SEV-3, copy/visual = SEV-4
3. [ ] The rubric has both a **security** axis and a **functional** axis (per research §1.3 trade-off)
4. [ ] `bug-triager` outputs a structured markdown report into `docs/bugs/wip-BUG-XXX.md` containing: severity (with rubric citation), root-cause hypothesis, affected files with line numbers, suspicious commits from `git log`, suggested fix approach
5. [ ] `bug-triager` does NOT write code — proposes only; implementer acts
6. [ ] `.claude/agents/qa-engineer.md` is upgraded to include an ISTQB rubric section listing **equivalence partitioning, boundary value analysis (3-value), decision tables, state-transition testing, property-based testing**, with a TypeScript example for each
7. [ ] Upgraded `qa-engineer` includes a per-test rationale convention — every test header comment names which technique applies (`// EP: invalid emails`, `// BVA: zero/negative price`, etc.)
8. [ ] A new GitHub Actions workflow `.github/workflows/test-deletion-guard.yml` runs on every PR; **fails (CI red, blocks merge)** if any `*.test.ts`, `*.test.tsx`, `*.spec.ts`, or `*.spec.tsx` file is removed without an accompanying `docs/specs/FEAT-XXX*.md` change in the same PR
9. [ ] The new check is added to required status checks on `main` branch protection
10. [ ] `CLAUDE.md` agent roster table updated to include `bug-triager` row + when-to-invoke
11. [ ] At least one round-trip test: invoke `bug-triager` on existing `docs/bugs/open-BUG-014.md` (visit-section), verify the output report matches the rubric format

## Constraints

- **Legal**: Severity rubric must call out LOPDGDD breaches as SEV-1 by default. Rubric must reference RD 1457/1986 (warranty), RD 1457/1986 Art. 16, and the IVA rounding rule.
- **Tenant**: bug-triager must flag any reported bug touching tenant-scoped queries as SEV-1 until cleared by security-auditor.
- **Compatibility**: Workflow must run on `ubuntu-latest`, Node 20, no new external services.
- **Auditability**: Every triager flag cites the rubric line that justified the severity (no vibes).
- **Cost**: bug-triager runs on Sonnet by default; escalate to Opus only when severity ≥ HIGH.
- **No PII in prompts**: triager prompts must never include real customer data — only the bug-report markdown and `git log` output.

## Out of Scope

- Property-based tests (FEAT-036)
- Traceability script + `// spec: FEAT-XXX` comment convention (FEAT-036)
- Stryker mutation testing (FEAT-037)
- ML-based severity classifier (rejected per research §1.4)
- Pact contract testing (rejected per research §2.3)
- Visual regression managed services — Percy/Chromatic (rejected per research §2.4)
- Auto-applying triager fixes — implementer must still pick up wip-BUG-XXX manually

## Test Cases

| Scenario | Input | Expected output |
|---|---|---|
| Triager invoked on PII-leak bug | A bug describing customer email in error response | SEV-1 cited from rubric, root-cause hypothesis, file:line refs, related git commits |
| Triager invoked on dead-link bug | A bug like BUG-011 | SEV-3 cited from rubric, suggests Footer.tsx + missing route |
| Triager output format | Any bug | Valid markdown with required sections (severity, hypothesis, files, commits, fix approach) |
| qa-engineer writes new test | Asked to test IVA rounding | Test header comment names "BVA" or "PBT", test body matches rubric example shape |
| Test-deletion guard — innocent rename | PR moves `foo.test.ts` → `bar.test.ts` (git rename, no spec change) | CI **passes** — rename is not deletion |
| Test-deletion guard — actual deletion without spec | PR deletes `foo.test.ts`, no `docs/specs/*.md` change | CI **fails** with explicit "Test deletion without spec change" error |
| Test-deletion guard — legitimate retirement | PR deletes `foo.test.ts` AND modifies `docs/specs/FEAT-099-retire-foo.md` | CI **passes** — spec change documents the retirement |
| Branch protection | `main` branch protection lists "test-deletion-guard" as required check | `gh api repos/.../branches/main/protection` includes the new context |

## Files to Touch

> Implementer fills file-list precisely during planning.

- [ ] `.claude/agents/bug-triager.md` — NEW: charter, 4-step playbook, output format, tools, model preference
- [ ] `.claude/rules/severity-rubric.md` — NEW: MSRC-derived security axis + AMG functional axis with concrete examples
- [ ] `.claude/agents/qa-engineer.md` — UPDATE: inject ISTQB rubric section + per-test-rationale convention + 5 TypeScript examples
- [ ] `.github/workflows/test-deletion-guard.yml` — NEW: detects test-file removals, requires accompanying spec change, fails red
- [ ] `CLAUDE.md` — UPDATE: add bug-triager row to agent roster (charter / tools / when-to-invoke)
- [ ] `docs/bugs/wip-BUG-014.md` — NEW: round-trip test artifact produced by triager run
- [ ] Branch protection — UPDATE via `gh api`: add `test-deletion-guard` to required status checks (admin step, document command in spec)

## Builder-Validator Checklist

> Validator fills this after implementation.

- [ ] All four new/modified prompt files compile (no Markdown frontmatter errors)
- [ ] Severity rubric covers both security (MSRC) and functional axes
- [ ] bug-triager prompt forbids writing code (charter says "proposes; never writes")
- [ ] qa-engineer prompt has at least 5 ISTQB examples in TypeScript
- [ ] Test-deletion guard workflow has correct triggers (`pull_request: [opened, synchronize, reopened]`)
- [ ] Workflow uses `git diff --name-status origin/${{ github.base_ref }}...HEAD` to detect deletions (handles renames as `R` not `D`)
- [ ] Workflow exits non-zero with a clear message naming the deleted file(s)
- [ ] Branch protection includes `test-deletion-guard` in `required_status_checks.contexts`
- [ ] Round-trip on BUG-014 produced a valid wip-BUG-014.md
- [ ] CLAUDE.md agent roster includes bug-triager
- [ ] No hardcoded paths or tenant data in any new file
- [ ] `npm run type-check` → zero exit
- [ ] `npm test` → all pass (no new tests added by this spec, but baseline must stay green)
- [ ] `npm run lint` → zero errors
- [ ] PR description follows `.github/pull_request_template.md`
- [ ] compliance-reviewer → PASS
- [ ] validator → PASS
- [ ] security-auditor → PASS

## Open Questions for Implementer

- Where to place the round-trip artifact? (`docs/bugs/wip-BUG-014.md` for now; will be overwritten when implementer picks up BUG-014 work — that's fine, it's a one-shot demonstration)
- Workflow filename — `test-deletion-guard.yml` chosen for clarity. Alternative: extend `security-gate.yml`. **Decision**: keep separate so the failure message is unambiguous to humans reading CI.
