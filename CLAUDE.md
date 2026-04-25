# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## How to work here

You are the orchestrator. You communicate with the user, break tasks into specs, and delegate to specialists. You keep main context lean — push expensive analysis, implementation, and testing to agents.

**Full AIDLC:** `docs/decisions/2026-04-18-aidlc.md` — read before starting any sprint.  
**Sprint roadmap:** `docs/decisions/2026-04-18-sprint-roadmap.md`  
**Spec template:** `docs/specs/` — every feature needs a spec file before implementation starts.


## Agent roster (3-5 max — research-backed sweet spot)

| Agent | Charter | Tools | When to invoke |
|---|---|---|---|
| `implementer` | **Only agent that writes code.** Receives spec, implements, runs gates, commits. | Read, Write, Edit, Glob, Grep, Bash | Any multi-file feature or bug fix |
| `architect` | Schema design, API contracts, service boundaries. Returns structured analysis only. | Read, Glob, Grep | New collection, tenant model change, API surface |
| `compliance-reviewer` | Deterministic grep checks. Files path+line violations. No style opinions. | Read, Glob, Grep | Any modified `.ts`/`.tsx` before merge |
| `security-auditor` | LOPDGDD, PII, auth guards, IDOR. Returns pass/fail checklist. | Read, Glob, Grep | New forms, server actions, PocketBase queries |
| `qa-engineer` | Runs tests, files bugs, writes QA reports. **Follows Sprint 4 testing patterns** (`.claude/skills/qa-testing-patterns/STRATEGY.md`). Never writes app code. | Read, Glob, Grep, Bash | Before every merge to main |
| `bug-triager` | Investigates open bugs: reads report, searches codebase, checks `git log`, assigns severity per `.claude/rules/severity-rubric.md`, writes `wip-BUG-XXX.md`. **Proposes; never writes code.** Runs on Sonnet; escalates to Opus for SEV-1. | Read, Glob, Grep, Bash | When a new `open-BUG-XXX.md` is filed and before implementer picks it up |

**Orchestrator rule**: for targeted single-file fixes you may edit directly. For anything touching 2+ files or requiring domain expertise, always delegate.

## Git workflow

```
main            ← protected, always deployable
feature/slug    ← new features (spec file required first)
fix/BUG-XXX     ← bug fixes
chore/topic     ← tooling, config, deps
docs/topic      ← documentation only
test/topic      ← tests only
```

**Conventional commits** (enforced by hook — see `.gitmessage`):
```
feat(chatbot): add calendar slot picker
fix(slots): prevent cross-tenant IDOR  [closes BUG-003]
chore: remove pixel-agents library
test(nlp): add regression corpus for oil intent
```
Format: `<type>(<scope>): <description>` — 72 char max, imperative, no period.
Types: `feat | fix | chore | docs | test | refactor | style | ci`
Always add: `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`

**Workflow** (in order — see `docs/adr/ADR-011-ai-dev-process-hardening.md`):
1. **Orchestrator** dispatches implementer with the spec
2. **Implementer** runs branch hygiene (`git checkout -B <branch> origin/main`), implements, runs LOCAL gates: `type-check` + `test` + `lint` + `flows:validate` + `bash scripts/ci-security-gate.sh`
3. **Implementer** pushes the branch and reports — does NOT open the PR
4. **Orchestrator** runs the reviewer chain: `compliance-reviewer` → `validator` → `security-auditor` — all must PASS
5. **Orchestrator** opens the PR with structured template + atomically enables auto-merge: `gh pr create … && gh pr merge <n> --auto --squash --delete-branch`
6. **CI** runs as a second line of defence: `Security gate` + `PR template check` + standard gates — required checks on `main`
7. **`qa-engineer`** runs after merge to tst — files bugs against new state

Never commit to `main` directly. Never force-push. Never skip hooks (`--no-verify`). Never have the implementer open the PR — that race is what let the FEAT-031 filter-injection auto-merge before review.

## Builder-Validator chain (mandatory for server actions + PocketBase queries)

1. `implementer` builds and runs LOCAL quality gates (Ralph Loop), pushes branch, STOPS
2. `compliance-reviewer` runs grep checks for LOPDGDD/IVA/tenant — must PASS
3. `validator` reviews for tenant isolation, LOPDGDD order, hardcoded values, PII — must PASS
4. `security-auditor` checks IDOR, filter injection, prompt injection, auth — must PASS
5. Orchestrator opens PR (only after the three above PASS) with auto-merge enabled
6. CI security-gate provides defence in depth — blocks merge if any reviewer was skipped

## Session hygiene

- **Compact at 60% context**, not 90% — quality degrades past 75%
- When compacting, always preserve: tenant isolation rules, LOPDGDD consent order, active bug IDs, current sprint scope, any architecture decisions made this session
- One feature per session — never mix unrelated changes
- Delegate exploration to subagents to protect main context window

## Living docs (`docs/`)

| Path | Purpose |
|---|---|
| `docs/specs/` | Feature specs (FEAT-XXX-name.md) — required before implementation |
| `docs/bugs/` | Bug reports. Prefix: `open-`, `wip-`, `fixed-`, `closed-` |
| `docs/adr/` | Architecture Decision Records (permanent) |
| `docs/decisions/` | Lighter, reversible decisions |
| `docs/qa-reports/` | QA run summaries, one per session |

File bugs using `docs/bugs/_TEMPLATE.md`. File ADRs using `docs/adr/_TEMPLATE.md`.

**Bug lifecycle**: `open` → `wip` (implementer picks it up) → `fixed` → QA verifies → `closed`

## Skills (read before writing code)

| Domain | Skill |
|---|---|
| Stack, file layout, patterns | `.claude/skills/factory-core/SKILL.md` |
| IVA, LOPDGDD, ITV, SEO | `.claude/skills/es-compliance/SKILL.md` |
| Collections, chatbot engine, JSON Schema sync | `.claude/skills/monolith-engine/SKILL.md` |
| Design system, motion, glass effects | `.claude/skills/design-system/SKILL.md` |
| QA patterns (unit/integration/E2E/contract/visual) | `.claude/skills/qa-testing-patterns/STRATEGY.md` |
| Playwright, web test patterns | `.claude/skills/qa-web/SKILL.md` |
| Chatbot flow validation, LOPD checks | `.claude/skills/qa-chatbot/SKILL.md` |

Use Progressive Disclosure — read only the section relevant to your task.

## Path-scoped rules (auto-loaded by Claude Code)

Located in `.claude/rules/` — apply automatically when editing files at matching paths:

| Rule file | Applies to |
|---|---|
| `server-actions.md` | `src/actions/**`, `src/app/api/**` |
| `components.md` | `src/**/*.tsx` |
| `chatbot-flows.md` | `clients/**/chatbot_flow.json` |

## Quality gates (hooks — run automatically)

| Trigger | Action |
|---|---|
| Write/Edit `.ts`/`.tsx` | Prettier + ESLint --fix |
| Stop | `npm run type-check` — non-zero exit = task NOT done |
| Bash with `rm -rf` | Blocked on `clients/`, `pb_data/`, anything outside `dist/`/`tmp/` |

The Stop hook is a hard gate — fix TypeScript errors before reporting done.

## Commands

```sh
npm run dev              # Next.js dev server (port 3000)
npm run build            # schemas:sync → next build
npm run type-check       # tsc --noEmit
npm run lint:fix         # ESLint autofix
npm test                 # Vitest unit tests (src/ only)
npm run e2e              # Playwright E2E (requires dev server)
npm run e2e:ui           # Playwright interactive UI
npm run e2e:install      # Download Playwright browsers (first time)
npm run pb:serve         # Start PocketBase at :8090
npm run migrations:apply # Apply pb_migrations/*.json
npm run schemas:sync     # Diff src/schemas/ vs live PocketBase
npm run flows:validate   # Validate chatbot_flow.json files
```

## Stack

Next.js 15 (App Router) · Tailwind v4 · PocketBase · TypeScript strict · Zod · Resend · Playwright · Vitest

All magic numbers and tenant data live in the PocketBase `config` collection — never hardcoded.
