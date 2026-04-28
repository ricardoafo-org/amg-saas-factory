# FEAT-051 — GitHub Lockdown

## Intent

Make `main` un-bypassable before we cut the long-lived `feat/backend-foundation` branch. The 2026-04-26 SEV-1 (booking dead on tst with green tests) was preceded by a string of merges that bypassed required checks via admin force-merges and disabled rules during incident response. The rebuild that follows depends on `main` being a stable reference point — if `main` keeps drifting because anyone can land code without gates, the long-lived branch will rot.

This spec configures branch protection, merge queue, and required-status-checks so that nothing reaches `main` without `ci` + `security-gate` + `health-check` passing AND the merge queue serializing the deploy. Pre-existing PRs #85 (initialService UX) and #97 (dependabot guard fix) are landed through the new gates as the validation that the configuration is correct.

## Acceptance Criteria

1. [ ] `gh api repos/ricardoafo-org/amg-saas-factory/branches/main/protection` returns `required_status_checks.contexts` containing all 12 check names listed in the configuration JSON below.
2. [ ] `gh api repos/ricardoafo-org/amg-saas-factory/branches/main/protection` returns `required_linear_history.enabled = true`.
3. [ ] Merge queue is enabled on `main` with `merge_method = squash` (repo policy: rebase merging disabled, squash is the only allowed method), `min_entries_to_merge = 1`, `max_entries_to_build = 3`, `grouping_strategy = ALLGREEN`.
4. [ ] `required_deployments` rule on the ruleset gates merging on the `tst` GitHub Environment — PRs cannot merge into main until the latest tst deployment is green. Closes the "stale main" gap (a PR could otherwise merge while a previous deploy is still running or failed). Requires `tst` environment to be registered (done by PR #96).
5. [ ] Pull request reviews required: `required_approving_review_count = 1`, `dismiss_stale_reviews = true`.
5. [ ] `enforce_admins = true` — admins cannot bypass the protection rules.
6. [ ] A test PR with a deliberate `* 1.21` literal in `src/` is **blocked from merging** by `security-gate` and admin cannot force-merge.
7. [ ] PR #85 lands cleanly through the new gates (`ci` + `security-gate` + `health-check` all green; merge queue serializes; `gh pr merge --squash --auto` works).
8. [ ] PR #97 lands cleanly through the new gates with the same flow.
9. [ ] `git log main` shows #85 and #97 commits after merge.
10. [ ] Branch `feat/backend-foundation` exists and points at `main` HEAD; `git log main..feat/backend-foundation` is empty on Day 1.
11. [ ] [docs/runbooks/break-glass.md](../runbooks/break-glass.md) exists, documenting the procedure for disabling protection during a verified incident and re-enabling it within the same shift.

## Constraints

- **Authorization**: Branch protection is admin-only. The bot account `rafo-claude-bot` cannot perform these changes — execution is via `gh api` commands generated for the user, who runs them under `ricardoafo` admin auth (per session decision).
- **Reversibility**: Every configuration change is captured as a `gh api` command. The complete configuration JSON is committed to this spec so it can be re-applied if accidentally cleared.
- **Compatibility**: Must work with the existing GitHub merge queue, which queued PRs run on `gh-readonly-queue/main/pr-N-{sha}` ephemeral branches. Required workflows must trigger on `merge_group` events ([already handled in `ci.yml`, `security-gate.yml`, `pr-template-check.yml`, `test-deletion-guard.yml`](../../.github/workflows/)).
- **Auditability**: All configuration changes happen via `gh api`; no UI clicks. The exact command sequence is recorded in this spec.

## Out of Scope

- Org-level rules (handled separately if needed — admin-only).
- Modifying which checks run (use existing `ci`, `security-gate`, `health-check`; do not add or remove).
- Replacing `ci-security-gate.sh` with a TS version (Week 5 task).
- Adjusting Dependabot configuration (separate concern; Dependabot PRs continue to flow).
- E2E admin re-required (deferred until admin login is fixed in Week 2).

## Test Cases

| Scenario | Input | Expected output |
|---|---|---|
| Bot tries to merge bypassing checks | `gh pr merge --merge` from bot on a PR with failing `security-gate` | Rejected with "Required checks have not passed" |
| Admin tries to force-merge bypassing checks | Admin clicks "Merge without waiting for requirements" | UI option absent (`enforce_admins = true`); admin cannot force-merge |
| PR with `* 1.21` literal | Open PR; CI runs | `security-gate` fails red; PR cannot merge |
| #85 normal flow | Approval + green checks | Merges via merge queue; lands on main |
| #97 normal flow | Approval + green checks | Merges via merge queue; lands on main |
| Branch creation | `git checkout -b feat/backend-foundation` after #85+#97 land | Branch tip == main HEAD; no commits ahead |

## Files to Touch

- [ ] `docs/specs/FEAT-051-github-lockdown.md` — this file.
- [ ] `docs/runbooks/break-glass.md` — new runbook for emergency protection-disable procedure.
- [ ] **GitHub configuration (no repo file change)**: branch protection on `main` via `gh api`. Configuration JSON archived inline in this spec for reproducibility.
- [ ] No application code changes.

### Configuration JSON (archived for reproducibility)

```json
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Type-check",
      "Next build (catches PageProps / route-level type errors)",
      "Lint",
      "Unit tests",
      "Validate chatbot flows",
      "Security gate (deterministic)",
      "PR template — required sections",
      "test-deletion-guard",
      "E2E smoke (shard 1/4)",
      "E2E smoke (shard 2/4)",
      "E2E smoke (shard 3/4)",
      "E2E smoke (shard 4/4)"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false
  },
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "restrictions": null
}
```

### Ruleset (id 15533204) — applied 2026-04-27

Repository ruleset `main protection` provides the merge queue and deploy-success rules that branch protection alone can't express:

```json
{
  "name": "main protection",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_linear_history" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews_on_push": true,
        "require_last_push_approval": true,
        "required_review_thread_resolution": true,
        "allowed_merge_methods": ["squash"]
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          /* same 12 checks as branch protection */
        ]
      }
    },
    {
      "type": "required_deployments",
      "parameters": { "required_deployment_environments": ["tst"] }
    },
    {
      "type": "merge_queue",
      "parameters": {
        "merge_method": "SQUASH",
        "max_entries_to_merge": 5,
        "min_entries_to_merge": 1,
        "max_entries_to_build": 3,
        "min_entries_to_merge_wait_minutes": 5,
        "grouping_strategy": "ALLGREEN",
        "check_response_timeout_minutes": 60
      }
    }
  ],
  "bypass_actors": [
    {
      "actor_type": "OrganizationAdmin",
      "bypass_mode": "pull_request"
    }
  ]
}
```

### Workflow cleanup performed 2026-04-27

- **Deleted** `.github/workflows/tst-bootstrap-pb.yml` (PR #98) — one-shot SEV-1 recovery hack, no longer needed.
- **Deleted** orphan `CodeQL` workflow record (id 266066341) by clearing its 5 historical runs — file path `.github/workflows/codeql.yml` had been removed previously but the workflow record persisted as "disabled" in the Actions UI. Cleared to reduce confusion. The active GitHub-managed code scanning at `dynamic/github-code-scanning/codeql` is preserved.

Final active workflows:
1. CI (`.github/workflows/ci.yml`)
2. Deploy to tst (`.github/workflows/deploy-tst.yml`)
3. Auto-label PRs (`.github/workflows/labeler.yml`)
4. PR Template Check (`.github/workflows/pr-template-check.yml`)
5. Security Gate (`.github/workflows/security-gate.yml`)
6. test-deletion-guard (`.github/workflows/test-deletion-guard.yml`)
7. Dependabot Updates (GitHub-managed)
8. CodeQL (GitHub-managed code scanning)

**Excluded from required (intentional):**
- `npm audit (critical)` — informational; current deps have 5 high-severity in resend chain (per memory `project_npm_audit_vulns`).
- `E2E admin (seeded PocketBase)` — admin login broken; fixed in Week 2, then re-added to required.
- `Auto-label PRs` / `label` — meta workflow, no quality signal.
- `Health check (tst)` — runs only on push to main, not PRs (cannot be a required PR check).

Merge queue config (in Repository Ruleset `main protection`, ID 15533204):

```json
{
  "type": "merge_queue",
  "parameters": {
    "merge_method": "SQUASH",
    "max_entries_to_merge": 5,
    "min_entries_to_merge": 1,
    "max_entries_to_build": 3,
    "min_entries_to_merge_wait_minutes": 5,
    "grouping_strategy": "ALLGREEN",
    "check_response_timeout_minutes": 60
  }
}
```

Note: `merge_method` is SQUASH (not rebase) because the repo has `allow_rebase_merge=false`. Squash gives clean commit messages and a linear history regardless.

## Builder-Validator Checklist

- [ ] Branch protection JSON matches the spec exactly (verify via `gh api ... | jq`).
- [ ] Merge queue JSON matches the spec exactly.
- [ ] #85 + #97 in `git log main`.
- [ ] `feat/backend-foundation` branch exists, tip == main HEAD.
- [ ] Break-glass runbook reviewed by user.
- [ ] Test-PR experiment (deliberate `* 1.21`) recorded with PR number — confirms the gate blocks. PR is closed without merge after verification.
