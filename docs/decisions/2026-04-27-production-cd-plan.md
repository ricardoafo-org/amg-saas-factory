# Production CD Plan

**Date:** 2026-04-27
**Status:** Planned (not yet implemented — pro env doesn't exist)
**Owner:** ricardoafo
**Related:** [FEAT-051 GitHub lockdown](../specs/FEAT-051-github-lockdown.md) · [project memory: project_environments.md](../../../.claude/projects/c--claude-projects-amg-talleres/memory/project_environments.md)

## Problem

Today: one environment (`tst`), auto-deploys on push to main, configured in `.github/workflows/deploy-tst.yml`. Secrets live at repo-level (`TST_SSH_HOST`, `TST_SSH_USER`, `TST_SSH_KEY`).

When pro launches, we need:
- A second deploy target with stricter gating (manual approval, branch policy)
- Per-environment secrets (pro SSH key must NOT be readable by tst-only jobs)
- Release-tag-driven workflow so tst churn doesn't trigger pro
- Hotfix / rollback escape hatch
- Same image artifact deployed to both envs (build once, promote)

This doc captures the target architecture so the work is straightforward when pro infra exists.

## Options Considered

### Option A — Single workflow, two jobs (RECOMMENDED)
One `deploy.yml` with `deploy-tst` and `deploy-pro` jobs. GitHub Environment "pro" enforces required reviewers + branch policy.

- **Pros:** single source of truth for CD; build job extracted and shared; all promotion logic in one place; matches Cal.com / typical small-SaaS pattern.
- **Cons:** larger workflow file (~200 lines).

### Option B — Two separate workflow files
`deploy-tst.yml` (push to main) and `deploy-pro.yml` (release tag).

- **Pros:** clearer separation; each file ~80 lines; tst churn doesn't show pro-related noise in Actions.
- **Cons:** image build duplicated OR factored into a third reusable workflow (more complexity); harder to coordinate when changing both.

### Option C — Promotion model (advanced)
Build artifact stored independently. "Promote tst → pro" via separate `promote.yml` workflow that doesn't rebuild.

- **Pros:** matches Vercel / large-org patterns.
- **Cons:** overkill for one-shop SaaS; build is fast enough that re-fetching the same image is fine.

**Decision:** Option A. Single `deploy.yml` with two environment-scoped jobs. Reconsider Option B/C if the file passes ~400 lines.

## Target Architecture

### File structure
```
.github/workflows/
├── ci.yml         (unchanged)
├── deploy.yml     (current deploy-tst.yml renamed; will gain deploy-pro job)
└── labeler.yml    (or deleted — separate decision)
```

### deploy.yml shape (target)
```yaml
name: Deploy
on:
  push:
    branches: [main]              # → deploy-tst (auto)
  release:
    types: [published]            # → deploy-pro (gated)
  workflow_dispatch:              # → manual override (hotfix, rollback)
    inputs:
      target:
        type: choice
        options: [tst, pro]
      sha:
        description: 'Commit SHA (defaults to release/head)'
        required: false

permissions:
  contents: read
  packages: write   # GHCR push

concurrency:
  group: deploy-${{ github.event.inputs.target || (github.event_name == 'release' && 'pro' || 'tst') }}
  cancel-in-progress: false

jobs:
  build:
    name: Build image
    runs-on: ubuntu-latest
    outputs:
      sha: ${{ steps.resolve.outputs.sha }}
      tag: ${{ steps.resolve.outputs.tag }}
    steps:
      - id: resolve
        run: |
          # Resolve SHA: workflow_dispatch input > release tag commit > current head
          ...
      - uses: actions/checkout@v6
        with: { ref: '${{ steps.resolve.outputs.sha }}' }
      - uses: docker/login-action@... (GHCR)
      - uses: docker/build-push-action@...
        with:
          tags: |
            ghcr.io/ricardoafo-org/amg-saas-factory:sha-${{ steps.resolve.outputs.sha }}

  deploy-tst:
    name: Deploy to tst
    needs: build
    if: github.event_name == 'push' || (github.event_name == 'workflow_dispatch' && inputs.target == 'tst')
    runs-on: ubuntu-latest
    environment:
      name: tst
      url: https://tst.178-104-237-14.sslip.io
    steps:
      - uses: appleboy/ssh-action@...
        with:
          host: ${{ secrets.TST_SSH_HOST }}      # ENV-SCOPED secret
          username: ${{ secrets.TST_SSH_USER }}
          key: ${{ secrets.TST_SSH_KEY }}
          script: /home/deploy/deploy.sh tst sha-${{ needs.build.outputs.sha }}

  health-check-tst:
    needs: deploy-tst
    runs-on: ubuntu-latest
    steps: [probe /api/health, probe /]

  deploy-pro:
    name: Deploy to pro
    needs: build
    if: github.event_name == 'release' || (github.event_name == 'workflow_dispatch' && inputs.target == 'pro')
    runs-on: ubuntu-latest
    environment:
      name: pro                                  # ← required reviewers gate
      url: https://amg.es
    steps:
      - uses: appleboy/ssh-action@...
        with:
          host: ${{ secrets.PRO_SSH_HOST }}      # ENV-SCOPED, separate from tst
          username: ${{ secrets.PRO_SSH_USER }}
          key: ${{ secrets.PRO_SSH_KEY }}
          script: /home/deploy/deploy.sh pro sha-${{ needs.build.outputs.sha }}

  health-check-pro:
    needs: deploy-pro
    runs-on: ubuntu-latest
    steps: [probe /api/health, probe /, run post-deploy smoke against pro URL]

  rollback-pro-on-failure:
    needs: health-check-pro
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - run: ssh deploy@pro 'docker compose --tag previous-stable up -d'
      - run: ssh deploy@pro 'docker compose ps'
```

### GitHub Environment "pro" config
| Setting | Value |
|---|---|
| Required reviewers | `ricardoafo` (manual approval before deploy proceeds) |
| Wait timer | 0 (or 30 min "soak window" before run) |
| Deployment branch rules | Only protected branches + tags matching `v*` |
| Environment secrets | `PRO_SSH_HOST`, `PRO_SSH_USER`, `PRO_SSH_KEY` (NOT readable by tst jobs) |
| Environment variables | `PRO_BASE_URL=https://amg.es`, etc. |

### Release procedure (post-launch runbook)
1. Verify tst is green for the commit you want to release.
2. Tag and create release: `gh release create v1.2.3 --notes "..."`.
3. `deploy-pro` job queues, waits for review.
4. GitHub notifies approver. Smoke-test tst once more, click **Approve**.
5. Deploy proceeds; health check + post-deploy smoke run automatically.
6. On health-check failure → automatic rollback to previous tag.
7. On success → release stays live; tag also stored for re-deploy / rollback.

### Rollback / hotfix
Use `workflow_dispatch` from the Actions UI:
- `target: pro`
- `sha: <known-good-sha>` → re-deploys that image (we always tag images by SHA so any past commit can be re-deployed without re-building).

## What's Doable TODAY (no pro infra needed)

These changes prepare for pro launch without requiring pro VPS, domain, or secrets. Land them now, slot pro in later.

1. **Rename `deploy-tst.yml` → `deploy.yml`.** Workflow `name:` stays "Deploy to tst" until pro is added; only file path changes. Future-proofs the file location.
2. **Move tst secrets from repo-level to environment-scoped (manual, user task — UI only).** Tst already has a GitHub Environment (created by PR #96). Moving secrets to env-scope is best practice and a no-op for tst behavior. Once moved, pro secrets follow the same pattern. **Limitation:** GitHub secret values are write-only via API/CLI — even admins cannot read existing values. Migration requires the user to re-enter values from a password manager via Settings → Environments → tst → Add Secret. Repo-level secrets currently in scope:
   - `TST_SSH_HOST` (move to env)
   - `TST_SSH_KEY` (move to env)
   - `TST_SSH_USER` (move to env)
   - `TST_SSH_KNOWN_HOSTS` (likely unused — host-key pinning is disabled in deploy.yml; verify and delete if confirmed stale)
3. **This decision doc.** So the work is unambiguous when we come back to it.

## What's Required at PRO LAUNCH (Week 6 of rebuild plan, or later)

1. Provision pro VPS (similar to tst, ideally beefier — 2 vCPU / 4 GB RAM minimum).
2. Acquire pro domain (`amg.es` or similar).
3. Configure DNS, TLS (Caddy auto-ACME, same pattern as tst).
4. Create `/home/deploy/deploy.sh pro` on the pro VPS (parameterized version of the current tst script).
5. Create GitHub Environment `pro` with required-reviewers + branch rules + env-scoped secrets.
6. Add `deploy-pro` + `health-check-pro` + `rollback-pro-on-failure` jobs to `deploy.yml`.
7. Write `docs/runbooks/release.md` with the release procedure above.
8. First production cutover — by release tag, watched live.

## Open Questions (deferred until pro is concrete)

- **Multi-tenant routing:** does pro serve `talleres-amg.amg.es` or `amg.es/t/talleres-amg`? Affects DNS + Caddy config.
- **Database for pro:** standalone PB instance per environment, or shared? Per-env is correct (data isolation), confirm at launch.
- **Backups for pro:** PB volume snapshot cadence, retention. Not relevant for tst, critical for pro.
- **Observability:** logs, alerts, on-call. Out of scope for this doc; track as separate epic post-launch.
- **CDN / edge:** Vercel / Cloudflare in front of pro? Improves latency and DDoS protection. Decide pre-launch.

## Files Affected (when implemented)

- `.github/workflows/deploy.yml` (rename + add pro jobs)
- `docs/runbooks/release.md` (new — release procedure)
- `docs/runbooks/rollback-pro.md` (new — rollback procedure)
- `infra/Dockerfile` — no changes (same image both envs)
- `infra/docker-compose.pro.yml` (new — pro stack, similar to docker-compose.tst.yml)
- `infra/Caddyfile` — pro routing config (separate hostname)
- Branch protection ruleset — once pro deploys are critical, may add `required_deployments: ["tst", "pro"]` (currently only `tst`)

## Timeline

- **Today (Week 0):** rename file + move tst secrets. Doc this plan.
- **Week 6 (post-cutover, post-launch):** provision pro, wire deploy-pro job, first release.
- **Ongoing post-launch:** observability, monitoring, hardening.
