# CLAUDE.md

Project facts for the AMG SaaS Factory repo. AI-tooling and orchestrator behaviour live off-repo per [ADR-013](docs/adr/ADR-013-personal-framework-off-repo.md).

## Stack

Next.js 15 (App Router) · Tailwind v4 · PocketBase · TypeScript strict · Zod · Resend · Playwright · Vitest

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

## Project invariants

- All PocketBase queries scope by `tenant_id`. Never interpolate user input into a filter string.
- All magic numbers and tenant data live in the PocketBase `config` collection or `clients/<tenant>/config.json` — never hardcoded.
- `basePrice` in DB and config is **NET**. Gross is computed at render and booking via `basePrice * (1 + ivaRate)`. Reference: [docs/contracts/severity-rubric.md](docs/contracts/severity-rubric.md) row F1.
- Personal-data forms must record `consent_log.create()` before any other personal-data write. Reference: rubric row F2.

## Git workflow

```
main            ← protected, always deployable
feature/slug    ← new features (spec file required first)
fix/BUG-XXX     ← bug fixes
chore/topic     ← tooling, config, deps
docs/topic      ← documentation only
test/topic      ← tests only
```

**Conventional commits** (enforced by hook — see `.gitmessage`). Format: `<type>(<scope>): <description>` — 72 char max, imperative, no period. Types: `feat | fix | chore | docs | test | refactor | style | ci`.

Never commit to `main` directly. Never force-push. Never skip hooks (`--no-verify`).

## Living docs

| Path | Purpose |
|---|---|
| `docs/specs/` | Feature specs (FEAT-XXX-name.md) — required before implementation |
| `docs/bugs/` | Bug reports. Prefix: `open-`, `wip-`, `fixed-`, `closed-` |
| `docs/adr/` | Architecture Decision Records (permanent) |
| `docs/decisions/` | Lighter, reversible decisions |
| `docs/contracts/` | Project invariants — severity rubric, IVA contract, tenant isolation rules |
| `docs/qa-reports/` | QA run summaries, one per session |

File bugs using `docs/bugs/_TEMPLATE.md`. File ADRs using `docs/adr/_TEMPLATE.md`. **Bug lifecycle**: `open` → `wip` → `fixed` → `closed`.

## Quality gates

| Trigger | Action |
|---|---|
| Pre-commit | `type-check` + `test` (LOCAL) |
| `Stop` hook | `npm run type-check` — non-zero exit = task NOT done |
| CI on PR | `security-gate.yml` (deterministic grep) + `test-deletion-guard.yml` + `pr-template-check.yml` |

## Path-scoped rules (auto-loaded by Claude Code)

Located in `.claude/rules/` — apply automatically when editing files at matching paths:

| Rule file | Applies to |
|---|---|
| `server-actions.md` | `src/actions/**`, `src/app/api/**` |
| `components.md` | `src/**/*.tsx` |
| `chatbot-flows.md` | `clients/**/chatbot_flow.json` |

These remain in-repo until the migration in ADR-013 completes.
