---
id: ADR-015
title: GitHub repository governance — branch protection, quality gates, environments, secrets, workflow security, dependency hygiene, security features, bot accounts
status: proposed
date: 2026-04-28
supersedes: (extends ADR-010 deployment architecture)
---

## Context

The repository was set up incrementally with sensible defaults but no foundational governance policy. As of 2026-04-28:

- Branch protection rules exist (Repository Ruleset id `15533204`, "main protection") but have never been documented as a policy.
- Each new feature introduces ad-hoc workflow changes; no standard for what gates must run, when, and why.
- The 2026-04-26 SEV-1 incident (`availability_slots` schema empty on tst, "tests green / production broken") exposed a gap in CD validation. Closed by `feat/cd-wiring-tst` PR — but the PR's design choices weren't anchored in a policy.
- The questions "are GH rules updated?", "what about preview env?", "do we need to add a check?" come up recurrently because the answers aren't written down. The user explicitly asked: *"set them now so we don't have this recurrent conversation on GitHub workflow."*
- We are a single-tenant SaaS today but architecting for multi-tenant scale (rule from `feedback_scalability_default.md`: always default to scale-correct architecture). Governance baked in early is meaningfully cheaper than retrofitted later.

The repository is the source of truth for the AMG SaaS Factory product. It handles personal data (LOPDGDD/GDPR), legal financial documents (RD 1457/1986 invoicing), and tenant-scoped customer information. It must be governed with discipline appropriate for production code in those domains.

This ADR consolidates current policy + gaps + concrete implementation. Reference for OpenSSF Scorecard checks and GitHub Security Best Practices was used as the baseline; deviations are stated explicitly.

## Decision

Adopt a written GitHub repository governance policy across eight axes. Every axis lists the policy, its rationale, the current state, and gaps that this ADR's implementation closes.

### 1. Branch protection

**Policy:**
- `main` is the only protected branch.
- Protection is expressed as a Repository **Ruleset** (the legacy `branches/*/protection` API is overlapping and treated as deprecated).
- Linear history required; force-push and deletion blocked; non-fast-forward blocked.
- Squash-only merging (no merge commits, no rebase merges).
- 1 PR review required; dismiss stale reviews on push; require last-push approval; require thread resolution.
- Merge queue active: `merge_method: SQUASH`, grouping `ALLGREEN`, `min_entries_to_merge: 1`, `max_entries_to_build: 3`, `max_entries_to_merge: 5`.
- Bypass: `OrganizationAdmin` may bypass in `pull_request` mode only (i.e., self-merge their PRs after the gates pass). Bypass does NOT skip status checks or deployment gates.
- `enforce_admins: true` — admin users follow all other rules.

**Rationale:** Squash-only keeps `git log main` linear and easy to bisect. Merge queue serializes deploys (no two PRs land at the same time, no deploy interleaving). 1 review minimum + admin PR-only bypass is the pragmatic shape for a solo dev (ricardoafo can self-approve via bypass) without sacrificing review of bot-authored PRs.

**Current state:** Implemented correctly via Ruleset id 15533204.

**Gap:** none on this axis.

### 2. Quality gates (PR-time + post-merge)

**Policy:**
- **PR-time required check:** a single aggregator job named `CI success` summarizes the result of all sub-jobs in `ci.yml`. The Ruleset's `required_status_checks.contexts` references only `CI success`. Sub-jobs failing → aggregator red → PR cannot merge.
- **PR-time sub-jobs (in `ci.yml`):** `type-check`, `next-build`, `lint`, `unit-tests`, `flows-validate`, `security-gate`, `pr-template-check`, `test-deletion-guard`, `npm-audit`. Each is independent; `ci-success` declares `needs:` for all.
- **Post-merge CD gates (in `deploy.yml`):** `deploy-tst` → `health-check-tst` → (`schema-contract-tst`, `smoke-tst` in parallel) → `confirm-tst`. The `confirm-tst` job carries `environment: tst` and `needs: [all upstream]`, so the `tst` deployment is marked successful only when ALL gates pass.
- **Cross-merge gating:** the Ruleset's `required_deployments: [tst]` rule blocks the next PR's merge until the previous main commit's `tst` deployment succeeds. Combined with `confirm-tst` ownership of the `environment: tst` declaration, a single failed gate (schema mismatch, smoke fail) freezes the merge queue until fix-forward lands.
- **Pre-merge gating via merge queue:** `deploy.yml` triggers on `merge_group` in addition to `push: main`. When the queue creates a candidate (PR rebased on main), GitHub fires `merge_group`; deploy.yml runs against the candidate, deploys to tst, `confirm-tst` registers the deployment marker, and the `required_deployments` rule passes for that candidate. Without `merge_group`, the rule self-blocks — the PR's HEAD has no deployment because deploys only happen post-merge.

**Bootstrap caveat:** `required_deployments: [tst]` is **only self-bootstrapping after the first successful tst deployment exists for any commit on main**. On a fresh repo (or after a sustained run of red main deploys, as in BUG-017's UNIQUE-index deadlock on 2026-04-28), no successful `environment: tst` deployment record exists for any reachable HEAD. The rule then blocks every PR forever, including the PR whose merge would fix the underlying problem.

The one-time bootstrap procedure (admin action, ricardoafo-only):
1. Settings → Rules → main ruleset → Edit → uncheck "Require deployments to succeed before merging" → Save.
2. Allow auto-merge to land the queued PR(s). The post-merge `push: main` deploy fires, runs `deploy.yml` end-to-end, and `confirm-tst` registers the first successful deployment marker.
3. Re-enable the `required_deployments: [tst]` rule (re-check the box, Save). From this point on, every subsequent PR is gated by `merge_group` exactly as designed.

This procedure is reserved for genuine bootstrap state — never as a routine merge unblocker. If the rule blocks for any other reason, fix the underlying deploy failure forward; do not relax the rule. Document any future use of this procedure in a runbook entry that names the inciting bug, the date, and the timestamp the rule was re-enabled.

**Rationale:** PR-time gates catch most issues cheaply. Post-merge CD gates catch what only the live environment exposes (schema drift, runtime SSR errors, integration failures). Tying the deployment status to ALL post-deploy gates closes the loophole where deploy-tst succeeds but a downstream gate fails — without `confirm-tst`, the next PR merges with a lying-green deployment status. The `merge_group` trigger closes the chicken-and-egg gap so the rule applies pre-merge instead of only retroactively.

**Current state:**
- ci.yml: 10 jobs including aggregator. ✓
- deploy.yml: 4 jobs after `feat/cd-wiring-tst` (deploy → health → schema-contract + smoke). ✓ but missing `confirm-tst`.
- `environment: tst` is on `deploy-tst`, not on a final aggregator job.

**Gap:** add `confirm-tst` job to `deploy.yml`; move `environment: tst` declaration to it. Implementation in this ADR.

### 3. Environments

**Policy:**
- **`tst`**: auto-deploy on push to main. No required reviewers. No deployment branch policy (any branch — but only `main` is the deploy trigger). `can_admins_bypass: true` (acceptable: tst is the canary).
- **`pro`** (created NOW as a full working mirror stack on the existing tst VPS, real VPS swapped in when pro launches): required reviewers (ricardoafo); deployment branch policy restricted to release tags (e.g., `v*.*.*`); `can_admins_bypass: false`; manual approval before each deploy. The pro environment is **not a placeholder echo** — it is a fully functional pre-prod that:
  - Lives on the same VPS as `tst` (`amg-tst-01`, 178.104.237.14) as a separate compose stack with its own docker network (`amg-pro_default`), its own PocketBase instance with isolated `pb_pro_data` volume, its own app container on a non-conflicting loopback port (3001), and its own Caddy vhost (`pre-pro.178-104-237-14.sslip.io`).
  - Has its own `/srv/amg-pro/.env.pro` file with full app secrets (PB superuser, Resend, Twilio, Anthropic) — populated once at setup.
  - Goes through the SAME post-deploy validation pipeline as tst: snapshot pb_pro_data → apply schema (idempotent) → deploy → health check → schema contract test → smoke test → confirm-pro.
  - Triggers on release tags (`v*.*.*`) — pushing to main does NOT deploy pro. To exercise the pipeline, ricardoafo tags a rehearsal release (`v0.0.0-rehearsal-N`).
  - Is gated by GitHub Environment protection: required reviewer approval before each deploy. Deployment branch policy enforced.
  
  Rationale: stand up the env + protection rules + approval-gate flow + full deploy pipeline NOW under no time pressure. Surfaces every gap (env file paths, deployment branch policy quirks, approval-gate UX, network isolation, schema mirroring) BEFORE pro launch when timeline pressure removes safety net. When the real pro VPS arrives, work reduces to: add `PRO_SSH_*` secrets pointing to new host, repoint Caddy/DNS, update one env file. The workflow, the gates, the policy stay the same.
- No third "preview" environment for now (deferred — see `project_preview_env_deferred.md`).
- Each environment owns its own `.env.<env>` file on its target VPS. Secrets live there, not in GH Actions secrets, except where a CI step itself needs them (e.g., SSH host/key/user).

**Rationale:** `tst` is the canary — it should burn first if anything is wrong. `pro` needs the friction of explicit approval and tag-only deployment because customer-facing breakage is unacceptable. Per-environment env files keep secrets out of CI logs and avoid multiplying secrets across CI for each new environment.

**Current state:** Only `tst` environment exists, with no protection rules and no deployment branch policy. No `pro` yet.

**Gap:** Create `pro` environment NOW as a placeholder (per the policy above) with full target protection rules. Add a `deploy-pro` no-op job to `deploy.yml`. `tst` config is acceptable as-is; document the policy.

### 4. Secrets management

**Policy:**
- **Repository Actions secrets** are limited to CI/CD plumbing: SSH credentials needed by GH Actions to talk to VPS (host, user, key, known_hosts). Currently 4 secrets (`TST_SSH_HOST`, `TST_SSH_KEY`, `TST_SSH_USER`, `TST_SSH_KNOWN_HOSTS`). When `pro` launches, add `PRO_SSH_*` (4 more).
- **Application secrets** (PocketBase superuser, Twilio, Resend, Anthropic, etc.) live in `.env.<env>` files **on the target VPS only**. They are read by docker-compose (`--env-file`) and passed to containers at runtime. They are NEVER mirrored into GitHub Actions secrets.
- **GHCR auth** uses the auto-provisioned `GITHUB_TOKEN` — no PAT needed in secrets.
- **PR authors and triagers** never see app secrets. Only ricardoafo (with VPS root access) can read `.env.tst` (and future `.env.pro`).
- `.env.example` lives in the repo; every new env var added to code must be added to `.env.example` (rule from `feedback_env_security.md`).
- `.env*` (except `.env.example`) is gitignored AND in `.dockerignore` — never bake secrets into images.

**Rationale:** Adding a new env should not require multiplying CI secrets. The single-source-of-truth is the VPS env file. Local dev uses a separate `.env` file (also gitignored). Image artifacts stay secret-free, so an accidental image leak does not leak credentials.

**Current state:** Repo secrets = the 4 SSH ones. App secrets in `/srv/amg/.env.tst`. ✓

**Gap:** none on this axis (already correct).

### 5. Workflow security

**Policy:**
- **Action pinning:** every third-party action MUST be pinned to a commit SHA (not a tag), with a comment naming the version (`# v6.10.0`). First-party `actions/*` MAY be tag-pinned but SHOULD be SHA-pinned for consistency. Dependabot opens PRs to update SHAs (configured weekly). Per [GitHub's secure-use reference](https://docs.github.com/en/actions/reference/security/secure-use): "Pinning an action to a full-length commit SHA is currently the only way to use an action as an immutable release."
- **Default workflow permissions:** `read`. The repo-level setting is verified at `read`. ✓
- **Per-workflow `permissions:` block:** every workflow declares `permissions:` at the top with minimum grants. Jobs that need write extend per-job (`permissions: contents: write`).
- **`concurrency:` block:** every workflow that touches shared state (deploys, releases, anything that races) declares `concurrency.group` to serialize. CD uses `cancel-in-progress: false` (every commit must land); other workflows may use `true`.
- **Workflow PR approvals disabled:** `can_approve_pull_request_reviews: false` (verified). Workflows can comment on PRs but cannot approve them.
- **`pull_request_target` trigger BANNED** for any workflow that touches PR-author-controlled code or context. If ever introduced (e.g., for a write-required automation), the workflow MUST: (a) use a static checkout of the base branch (never `${{ github.event.pull_request.head.sha }}`), (b) not run any code from the PR, (c) be reviewed by ricardoafo before merge.
- **Untrusted-input handling:** PR-author-controlled context (`${{ github.head_ref }}`, `${{ github.event.pull_request.title }}`, etc.) MUST NOT be interpolated directly into shell scripts. Pass through an intermediate environment variable. Per GitHub: "set the value of the expression to an intermediate environment variable" before using in `run:` blocks.

**Rationale:** SHA-pinned actions defend against tag-repointing attacks. Two recent supply-chain incidents underline the need: 2025-03 [`tj-actions/changed-files` compromise](https://github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions/) (attacker pushed malicious code under an existing tag) and 2026-03 Trivy-action force-push attack (75 of 76 version tags re-pointed to malicious code, exfiltrating secrets from every pipeline that ran a Trivy scan). Both attacks would have been blocked by SHA-pinned consumers. GitHub itself added an org-level SHA-pinning enforcement policy in 2025-08; we'll opt in to that enforcement once we've audited and pinned every action. Minimum-permissions defense in depth. `concurrency` prevents racing deploys from clobbering each other. `pull_request_target` ban + untrusted-input policy close the most common GHA injection vectors per [GitHub Actions secure use reference](https://docs.github.com/en/actions/reference/security/secure-use).

**Current state:**
- ci.yml + deploy.yml: appleboy + docker/* actions are SHA-pinned. `actions/checkout@v6` and `actions/setup-node@v4` are tag-pinned.
- Default workflow permissions = `read`. ✓
- `concurrency` is set on `deploy.yml`. Need to audit `ci.yml` + `labeler.yml`.
- `permissions:` declared on workflow root. Need to audit per-job.

**Gap:** SHA-pin `actions/checkout`, `actions/setup-node` in this ADR's implementation. Audit `permissions:` blocks per job.

### 6. Dependency management

**Policy:**
- **Dependabot enabled** for `npm` (production app) and `github-actions` (workflows). Weekly schedule (Monday 06:00 Europe/Madrid). Open PR limit 5 per ecosystem.
- **Grouping:** non-breaking updates (minor + patch) are grouped per ecosystem slice (production, dev) into one PR. Major bumps open individual PRs and are reviewed manually.
- **Dependabot security updates** ENABLED (auto-opens PRs for security advisories regardless of schedule).
- **Auto-merge for safe Dependabot PRs:** opt-in per PR via `gh pr merge --auto` after CI passes. Major bumps NEVER auto-merged.
- **`npm-audit` CI gate** at `--audit-level=critical` (current). Raise to `high` once upstream Resend resolves the svix→uuid CVE chain — see `project_npm_audit_vulns.md`.
- **No production dependency without weekly health check:** if a Dependabot PR has been open >14 days without merge, surface in weekly triage.

**Rationale:** Dependabot covers the gap between OSS releases and our merge queue. Grouping reduces PR noise; major bumps need human review (breaking-change risk). Security updates bypass the weekly schedule because they're urgent.

**Current state:** Dependabot config present and correct (npm + GH actions, weekly grouped). `npm-audit` gate present. **Dependabot security updates: DISABLED.**

**Gap:** Enable Dependabot security updates (one toggle). Document auto-merge policy in this ADR.

### 7. Repository security features

**Policy:**
- **Secret scanning:** ENABLED. Catches accidentally committed credentials (PB tokens, API keys, SSH keys).
- **Push protection:** ENABLED. Blocks pushes containing detected secrets at the wire — fails before they enter git history.
- **Dependabot security updates:** ENABLED (covered in §6).
- **CodeQL code scanning:** DEFERRED. Requires GitHub Advanced Security (paid for private repos). Revisit if/when (a) repo goes public, (b) org adopts GHAS, or (c) we onboard a second developer. Interim alternative: Semgrep (free tier, OSS rules) — see Future improvements.
- **Dependency review action** in PRs: DEFERRED for the same reason as CodeQL (depends on GHAS for private repos).
- **SBOM (Software Bill of Materials):** ENABLE — GitHub natively generates SBOMs from the dependency graph at `/repos/{owner}/{repo}/dependency-graph/sbom`. Free for all repos. Document the endpoint; surface it on releases.
- **`SECURITY.md` policy file:** ADD. Documents how to report vulnerabilities (private email + 90-day disclosure window). Per OpenSSF Scorecard "Security-Policy" check.
- **`CODEOWNERS` file:** ADD. Routes reviews automatically to ricardoafo for now; will route per-area when team grows.
- **Binary artifacts in repo:** TRACK. The repo currently contains `pocketbase.exe` (~30MB) at root. This is a Scorecard "Binary-Artifacts" violation — binaries should be downloaded by a script + gitignored, not committed. NOT fixed in this ADR's implementation (separate refactor); tracked in Future improvements.

**Rationale:** Secret scanning + push protection are FREE for private repos and zero-effort. They've prevented real incidents in many orgs. CodeQL would be valuable but the cost/benefit doesn't justify GHAS yet for our scale.

**Current state:**
- secret_scanning: DISABLED ❌
- push_protection: DISABLED ❌
- dependabot_security_updates: DISABLED ❌
- advanced_security: not enabled (no GHAS license — deliberate)
- CODEOWNERS: NOT FOUND ❌
- SECURITY.md: NOT FOUND ❌
- SBOM endpoint: available but not documented or used ⚠️
- `pocketbase.exe` at repo root: Scorecard violation ⚠️

**Gap:** Enable the three free toggles. Add `CODEOWNERS` and `SECURITY.md`. Document SBOM endpoint. (Binary artifact refactor + SAST adoption are future improvements, not this ADR's implementation.)

### 8. Bot accounts and access discipline

**Policy:**
- **`rafo-claude-bot`** is the default actor for all automation: commits, PR creation, GH Issue ops, label management. Its fine-grained PAT (`BOT_GH_TOKEN`) is scoped to `ricardoafo-org/amg-saas-factory` only with: Contents r+w, Pull requests r+w, Issues r+w, Metadata r. Actions read and Org Projects are NOT granted (verified 2026-04-28).
- **`ricardoafo`** (admin) is used ONLY for: branch protection / ruleset edits, repo settings (security features, environments), creating new environments, secrets rotation, and any operation the bot's scope cannot perform. NEVER for everyday code commits.
- **Switching accounts:** `gh auth switch --user <name>`. After switching, run `gh auth setup-git` to align the git credential helper (otherwise pushes go out under the wrong actor — see `feedback_git_credential_helper.md`).
- **Audit trail:** every PR's author indicates who authored it (bot vs ricardoafo); admin operations (ruleset edits, secret rotations) appear in the GitHub audit log under ricardoafo. Combined → clear separation of duties.

**Rationale:** Bot/admin separation gives separate audit trails and minimum-scope PATs. If the bot's PAT leaks, blast radius is one repo with limited write capability — not org admin.

**Current state:** Both accounts in use; bot is the active default; switch protocol in memory. ✓

**Gap:** none on this axis.

## Rationale (cross-cutting)

- **Why ruleset over legacy protection:** rulesets are GitHub's strategic direction; they support multiple branches per rule, more rule types, better UI, and richer enforcement modes. The legacy API is in maintenance.
- **Why deployment gates over PR-time gates for runtime issues:** PR-time CI runs against `npm run dev` and mocks. Only the live deployed environment exposes schema drift, real PocketBase state, and SSR rendering against production data. Both gate types are needed; they cover disjoint failure modes.
- **Why env-file secrets over CI secrets:** secrets in CI logs are a real exfiltration risk; secrets per-env on VPS keep them in one well-defined place; multi-env scaling means N environments × 1 secret-store, not N × M secrets in CI.
- **Why SHA-pin actions:** tag-repointing attacks (Dependabot or attacker push malicious code under an existing tag) are real; SHA pinning is immutable.
- **Why bot account separation:** smaller PAT blast radius; clearer audit trail; prevents accidentally pushing as admin.

## Alternatives Considered

| Option | Rejected because |
|---|---|
| Legacy branch protection only (no ruleset) | Less flexible; can't target multiple branches; deprecated for new orgs |
| Tag-pinned third-party actions (`@v4`) | Tags can be re-pointed by attackers; SHA-pin is immutable |
| Mirror app secrets into CI Actions secrets per env | Multiplies secrets, ages out, harder to rotate, leaks to PR authors via logs |
| No bot account, ricardoafo for everything | No separation of duties; admin actions and automation share one trail; harder to scope PATs tightly |
| Mandatory PR review = 2 (no admin bypass) | Solo dev workflow becomes impossible without bypass; PR-only bypass for admin is acceptable today |
| Disable `required_deployments` gate | Defeats post-deploy validation; SEV-1 root cause stays open |
| CodeQL on a private repo without GHAS | License cost not justified for current scale; revisit when scaling team or going public |
| Always-on preview env | Deferred — `tst` is now self-validating, preview's value drops; revisit when team grows or risky migrations need isolation (see `project_preview_env_deferred.md`) |
| Org-level 2FA enforcement (mandatory) | NOT rejected — recommended, but org-level change is a separate decision; documented as follow-up |

## Consequences

**Positive:**
- Recurrent "is GH configured right?" conversations end — answer is this written policy.
- Onboarding a second developer (or AI agent) takes one doc-read.
- Clear audit trail: every gate, every secret, every bypass is documented.
- Supply chain risk reduced (action SHA pinning, secret scanning, push protection).
- Schema/UX regressions caught before reaching customers (post-deploy gates + confirm-tst aggregator).
- Cheaper future scaling: when adding pro env or 2nd dev, the deltas are localized to specific axes (env config, CODEOWNERS) rather than re-architecting.

**Negative / tradeoffs:**
- Maintenance burden: when GitHub adds new features, this ADR + the implementation may need updates.
- Dependabot adds 3-5 PRs/week — must be triaged or auto-merged-with-tests.
- SHA-pinned actions need manual updates (Dependabot handles this, but reviews are still needed).
- Admin bypass for ricardoafo is a soft point; doesn't scale to multi-dev. Revisit when 2nd dev joins.
- Toggling secret scanning / push protection on a repo with existing history may surface false positives or older committed secrets — must triage on first run.

**Neutral:**
- Does NOT change feature velocity; gates only fire on bad code.
- Does NOT change developer ergonomics; squash-only + PR + review was already in effect.

## Implementation

The implementation lands as part of `feat/cd-wiring-tst` PR (this same PR), to keep the policy and the gates that enforce it in one cohesive change. Concrete items:

### Files added/modified

1. **This ADR** at `docs/adr/ADR-015-github-repository-governance.md`.
2. **`CODEOWNERS`** at `.github/CODEOWNERS`:
   ```
   # Default owner for all paths until team grows.
   * @ricardoafo
   ```
3. **`SECURITY.md`** at `.github/SECURITY.md`:
   - How to report vulnerabilities (private email).
   - 90-day coordinated disclosure window.
   - Severity rubric reference.
4. **`deploy.yml`** (tst pipeline):
   - Move `environment: tst` from `deploy-tst` to a new final job `confirm-tst`.
   - `confirm-tst` declares `needs: [deploy-tst, health-check-tst, schema-contract-tst, smoke-tst]`.
   - `confirm-tst` body: simple echo confirming all gates green.
5. **`deploy-pro.yml`** (NEW pro pipeline, mirrors `deploy.yml`):
   - Triggered on tag push matching `v*.*.*` (release tags).
   - Same pipeline shape as tst: build runner + ops images (separate `:pro`, `:pro-ops` tags) → sync infra → snapshot pb_pro_data → apply schema → SSH deploy → health check → schema contract → smoke → confirm-pro.
   - Each job's `--env-file` points at `/srv/amg-pro/.env.pro` (separate from tst's `.env.tst`).
   - Each job's `--network` points at `amg-pro_default` (separate compose project).
   - `BASE_URL` for smoke test is `https://pre-pro.178-104-237-14.sslip.io`.
   - `confirm-pro` declares `environment: pro` — the env's required-reviewer rule pauses the pipeline until ricardoafo approves.
6. **`infra/docker-compose.pro.yml`** (NEW): mirrors `docker-compose.tst.yml` with — different volume names (`pb_pro_data`, `caddy_pro_data`, `caddy_pro_config`), app on `127.0.0.1:3001:3000`, pocketbase on `127.0.0.1:8091:8090` (loopback only), separate Caddy container fronting the `pre-pro.*` vhost. Uses `IMAGE_TAG` env to select which image to pull (`pro` for floating, `sha-XXX` for pinned).
7. **`infra/Caddyfile.pro`** (NEW): single-vhost config for the pro Caddy container. Or extend the existing `infra/Caddyfile` with both vhosts and have one Caddy serve both stacks (decide during implementation; cleanest is two separate Caddy containers per compose stack so the stacks are fully independent).
8. **`infra/deploy-pro.sh`** (NEW): mirrors `deploy-tst.sh` — runs on VPS, takes image-tag arg, pulls + restarts pro stack, waits for `:3001/api/health` to converge on commit SHA. Also added: source-of-truth in repo, scp'd to `/home/deploy/deploy-pro.sh` by the workflow's "Sync infra files" step. (Also retroactively add `infra/deploy-tst.sh` to the repo so tst's deploy script is source-controlled too.)
9. **`/srv/amg-pro/` on VPS** (admin op via SSH): create directory owned by deploy:deploy. Manually write `.env.pro` with full app secrets (separate Gmail alias `r.afonsomontero+amg-pro@gmail.com` for PB superuser, fresh Resend key if available else reuse tst's, separate Twilio number if available else reuse). The env file lives ONLY on VPS, never in the repo.
10. **`ci.yml` + `deploy.yml` + `deploy-pro.yml` + `labeler.yml`**:
    - Audit + SHA-pin `actions/checkout` and `actions/setup-node` (currently tag-pinned).
    - Audit + add `concurrency:` blocks where missing.
    - Audit + tighten per-job `permissions:` where over-granted.
11. **`pro` GitHub Environment** (admin op): create with required reviewer = ricardoafo, deployment branch policy = release tags only (`v*.*.*`), `can_admins_bypass: false`. No new GH Actions secrets needed — `TST_SSH_*` already targets the same VPS where pre-pro lives.
12. **First rehearsal release**: tag `v0.0.0-rehearsal-1` and push. Watch the deploy-pro pipeline run end-to-end through the approval gate. Fix-forward any issues. Tag the next rehearsal as `v0.0.0-rehearsal-2`, etc., until all gates pass clean.

### GitHub config changes (admin operations via `gh api`)

These run as ricardoafo in this same session. Recorded for audit.

```sh
# Enable secret scanning (free, immediate)
gh api -X PATCH repos/ricardoafo-org/amg-saas-factory \
  -f security_and_analysis[secret_scanning][status]=enabled

# Enable push protection (free, immediate)
gh api -X PATCH repos/ricardoafo-org/amg-saas-factory \
  -f security_and_analysis[secret_scanning_push_protection][status]=enabled

# Enable Dependabot security updates (free, immediate)
gh api -X PUT repos/ricardoafo-org/amg-saas-factory/automated-security-fixes
gh api -X PUT repos/ricardoafo-org/amg-saas-factory/vulnerability-alerts
```

### Verification (after implementation)

```sh
# Repository security features
gh api repos/ricardoafo-org/amg-saas-factory --jq \
  '.security_and_analysis | {secret_scanning, secret_scanning_push_protection}'

# Dependabot security
gh api repos/ricardoafo-org/amg-saas-factory/vulnerability-alerts -i \
  | head -1   # 204 = enabled, 404 = disabled

# Workflow permissions default still read
gh api repos/ricardoafo-org/amg-saas-factory/actions/permissions/workflow

# Ruleset still includes required deployments
gh api repos/ricardoafo-org/amg-saas-factory/rulesets/15533204 \
  --jq '.rules[] | select(.type=="required_deployments") | .parameters'
```

### Acceptance criteria (this ADR is "done" only when all hold)

This ADR's intent is end-to-end deploy correctness across BOTH environments — not just configured-on-paper. To close, all of the following MUST hold simultaneously and be re-checkable on demand:

1. **`required_deployments: [tst]` rule is ENABLED** on the main ruleset (verified via `gh api .../rulesets/...`).
2. **A successful `deploy.yml` run on main exists** with `confirm-tst` green and an active `environment: tst` deployment marker for main HEAD.
3. **A successful `deploy.yml` run on a `merge_group` candidate exists** — proves the merge-queue pre-merge gate (otherwise the rule would self-block on the next PR).
4. **A successful `deploy-pro.yml` run end-to-end exists** against the fake-pro stack, with all gates green:
   - `build-runner` + `build-ops` push images to GHCR
   - `deploy-vps` waits for `pro` env reviewer approval (ricardoafo), then completes
   - `health-check-pro`, `schema-contract-pro`, `smoke-pro` all green
   - `confirm-pro` registers an active `environment: pro` deployment marker
5. **Both environments allow merge-queue candidate branches** to deploy: the env's deployment-branch policy includes both `main` and `gh-readonly-queue/main/*` patterns. Without the second pattern the queue's pre-merge deploy is rejected with "branch not allowed to deploy" (see 2026-04-28 incident).
6. **Repo-level fallback secrets for `TST_*` and `PRO_*` are deleted** — only env-scoped secrets remain. Verifies the env-scoped path actually resolves end-to-end and we're not silently using repo-level fallbacks.

If any criterion regresses, treat the ADR as re-opened: the configuration drifted away from the documented invariant. Restore the criterion before declaring the work done again.

## Future improvements (NOT in this ADR's implementation)

These are deferred but explicitly tracked here so they don't drift back into ad-hoc conversations:

1. **Org-level 2FA enforcement** — recommended, free; defer until the org grows beyond ricardoafo. Today the org has one human member. When 2nd member joins, enforce.
2. **Real `pro` environment** — `pro` is created NOW as a placeholder (per §3). When the real pro VPS arrives, add `PRO_SSH_*` secrets and replace the `deploy-pro` job's echo body with real deploy steps.
3. **CodeQL / Code scanning** — adopt when one of: repo goes public, org subscribes to GHAS, or 2nd dev joins. Interim alternative below.
4. **Semgrep (SAST, free tier)** — adopt as an OSS code-scanning step in `ci.yml` for static-analysis rules. Free for private repos with OSS rule packs. Closes the OpenSSF Scorecard "SAST" check without GHAS cost.
5. **Dependency review action on PRs** — same GHAS trigger as CodeQL.
6. **Remove legacy branch protection** (overlapping with ruleset) — low priority maintenance task.
7. **Tighten ricardoafo bypass** to require even self-PRs to pass review-from-someone-else — only when 2nd dev is onboarded.
8. **`OIDC` for CI cloud auth** — replace SSH-key-based deploy with short-lived OIDC tokens once moved off self-hosted VPS to a cloud provider that supports it (AWS, GCP, Azure).
9. **Pin Node version to one canonical place** (`.nvmrc`, `package.json` `engines`, Dockerfile, GH Actions) — today it's tracked in 3-4 places. Drift risk.
10. **Branch protection rule for release tags** — block force-deletion of release tags once pro ships.
11. **GH Actions runner locks** — pin runner image (`ubuntu-24.04` not `ubuntu-latest`) on critical workflows to avoid runner image surprises. Audit all workflows.
12. **GHCR retention workflow** — auto-delete SHA-tagged images older than 30 days; keep `:tst`, `:tst-ops`, `:pro`, `:pro-ops` floating tags forever. Today every commit to main creates 2 immortal images; storage grows unbounded. Free tier is 500MB; we are likely already paying overage.
13. **Refactor `pocketbase.exe` out of the repo** — replace with a setup script that downloads the binary on demand; add `pocketbase*.exe` to `.gitignore`. Closes Scorecard "Binary-Artifacts" check.
14. **GitHub-native SBOM publishing** — fetch `/repos/{owner}/{repo}/dependency-graph/sbom` on each release, attach to release artifacts. Free.
15. **Enable org-level SHA-pinning enforcement policy** — once all actions in all workflows are SHA-pinned, opt in to GitHub's 2025-08 [policy enforcement feature](https://github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions/). Prevents future tag-pinned actions from being added.
16. **OpenSSF Scorecard adoption** — add the [scorecard-action](https://github.com/ossf/scorecard-action) to a weekly workflow; surface score over time; treat regressions as merge-blockers.
17. **Commit signing required** — require GPG- or SSH-signed commits. `required_signatures: false` today; flip when humans (not just bots) regularly commit.

## Review trigger

Revisit this ADR when:
- A 2nd developer is onboarded (PR review count, bypass tightening, CODEOWNERS routing, branch naming policy).
- `pro` environment is created (env protection rules, manual approval, deployment branches).
- Repo visibility changes to public (enable code scanning).
- Org adopts GitHub Advanced Security (enables CodeQL, advanced secret scanning, dependency review).
- Three or more incidents in a quarter involve CI/CD configuration (signal that policy is missing something).
- Any major GitHub feature release that affects the eight axes (new ruleset capability, native preview environments, new security features).
- Any item from "Future improvements" graduates from deferred to implemented.

## Sources / references

External (fetched 2026-04-28):
- [GitHub docs — About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets) — rulesets supersede legacy branch protection; multiple rulesets layer; org-level enforcement
- [GitHub docs — Available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) — full list of rule types including `required_deployments`
- [GitHub docs — Secure use reference (Actions)](https://docs.github.com/en/actions/reference/security/secure-use) — canonical: SHA pinning, GITHUB_TOKEN least-privilege, secrets handling, untrusted-input pattern, `pull_request_target` warnings, OIDC for cloud
- [GitHub Changelog 2025-08-15 — Actions policy supports blocking and SHA pinning](https://github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions/) — org-level SHA-pinning enforcement (we'll opt in later)
- [Wiz blog — Hardening GitHub Actions: Lessons from Recent Attacks](https://www.wiz.io/blog/github-actions-security-guide) — Trivy-action 2026-03 attack details (75 of 76 tags compromised)
- [GitHub Well-Architected — Securing GitHub Actions Workflows](https://wellarchitected.github.com/library/application-security/recommendations/actions-security/) — broader GHA security recommendations
- [OpenSSF Scorecard — checks list](https://github.com/ossf/scorecard/blob/main/docs/checks.md) — full check inventory
- [OpenSSF Scorecard — main project page](https://scorecard.dev/) — scoring methodology, automated assessment

AMG-internal (memory):
- `feedback_scalability_default.md` — always think scalability
- `project_environments.md` — two-environment deployment model (tst, pro)
- `project_bot_pat_scopes.md` — bot PAT scope reference
- `feedback_env_security.md` — never read .env files except .env.example
- `project_npm_audit_vulns.md` — current `--audit-level=critical` rationale
- `feedback_git_credential_helper.md` — `gh auth setup-git` after every account switch
- `project_preview_env_deferred.md` — preview env decision context
