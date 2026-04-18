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
| `qa-engineer` | Runs tests, files bugs, writes QA reports. Never writes app code. | Read, Glob, Grep, Bash | Before every merge to main |

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

**Merge checklist** (in order):
1. `npm run type-check` → zero exit
2. `npm test` → all pass
3. `compliance-reviewer` → zero violations
4. `validator` (Builder-Validator chain) → PASS
5. `qa-engineer` QA run → PASS or PARTIAL (no blocking bugs)
6. Human validates golden path manually
7. PR opened with `.github/pull_request_template.md` → squash merge

Never commit to `main` directly. Never force-push. Never skip hooks (`--no-verify`).

## Builder-Validator chain (mandatory for server actions + PocketBase queries)

1. `implementer` builds and runs quality gates (Ralph Loop)
2. `validator` reviews for tenant isolation, LOPDGDD order, hardcoded values, PII
3. Merge only after validator VERDICT: PASS

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
