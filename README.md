# AMG SaaS Factory

Multi-tenant workshop management platform built on Next.js 15, PocketBase, and Tailwind v4.

## Stack

- **Next.js 15** (App Router, Server Components)
- **PocketBase** (self-hosted backend + real-time DB)
- **Tailwind v4** (CSS-first design tokens)
- **TypeScript strict** · **Zod** · **Vitest** · **Playwright**

## Local development

```bash
npm install
npm run hooks:install # Activate .githooks (pre-commit + pre-push)
npm run pb:serve      # PocketBase at :8090
npm run dev           # Next.js at :3000
```

## Commands

```bash
npm run type-check    # TypeScript — must exit 0 before commit
npm test              # Vitest unit tests
npm run lint          # ESLint
npm run flows:validate # Validate chatbot_flow.json files
npm run e2e           # Playwright E2E (requires dev server)
npm run build         # schemas:sync + next build (local)
npm run build:docker  # next build only (used in Dockerfile)
```

## Deployment

- See [`docs/infra/runbook.md`](docs/infra/runbook.md) for first-deploy, secret rotation, rollback, and disaster recovery.
- See [`docs/infra/github-setup.md`](docs/infra/github-setup.md) for required GitHub Actions secrets and branch protection rules.
- Push to `main` → auto-deploy to `tst.<your-domain>` via GitHub Actions.

## Multi-tenant architecture

Every PocketBase collection includes a `tenant_id` field. All queries are scoped to the tenant context — no cross-tenant data access is possible at the application layer. PocketBase collection rules enforce the same isolation at the DB layer as a second line of defense.
