# Break-Glass Procedure — Disabling Branch Protection

> Use **only** during a verified production incident where normal merge gates are blocking a fix that must ship NOW. Re-enable protection within the same shift. Every break-glass event must be logged.

## When to use

Acceptable triggers:
- Active SEV-1 incident (security breach, full outage, LOPDGDD violation in production) where waiting for CI would prolong customer harm.
- CI infrastructure outage (GitHub Actions broken, dependent service down) blocking a hotfix.
- Required check is itself broken in a way that cannot be fixed quickly via PR (e.g. flaky in CI, green locally).

NOT acceptable triggers:
- "I'm in a hurry."
- A flaky test you don't want to debug.
- Wanting to skip review on a small change.
- Dependabot PRs that can wait until next business day.

## Procedure

### 1. Log the incident first

Open a GitHub issue tagged `incident` with:
- Trigger (which acceptable case above)
- What needs to ship and why now
- Estimated re-enable time (must be same shift)
- Approver — who said yes (must be admin)

### 2. Disable the relevant rule (minimum scope)

**Prefer**: disable just the failing required check, not all protection.

```sh
# Read current protection (preserve everything we're not changing)
gh api repos/ricardoafo-org/amg-saas-factory/branches/main/protection > /tmp/protection-backup.json

# Edit /tmp/protection-backup.json — remove ONLY the offending check from
# required_status_checks.contexts. Then re-apply.
gh api -X PUT repos/ricardoafo-org/amg-saas-factory/branches/main/protection \
  --input /tmp/protection-modified.json
```

If the required-check approach won't work, disable `enforce_admins` so admins can force-merge:

```sh
gh api -X DELETE repos/ricardoafo-org/amg-saas-factory/branches/main/protection/enforce_admins
```

### 3. Ship the fix

- Open the hotfix PR.
- Get the admin to merge it.
- Verify deploy completes and incident resolves.

### 4. Re-enable protection BEFORE end of shift

```sh
# Restore from backup
gh api -X PUT repos/ricardoafo-org/amg-saas-factory/branches/main/protection \
  --input /tmp/protection-backup.json

# OR re-enable enforce_admins
gh api -X POST repos/ricardoafo-org/amg-saas-factory/branches/main/protection/enforce_admins
```

Verify:

```sh
gh api repos/ricardoafo-org/amg-saas-factory/branches/main/protection | jq '{enforce_admins: .enforce_admins.enabled, required: .required_status_checks.contexts}'
```

### 5. Close the incident issue

- Link the merged PR.
- Note re-enable time.
- Note who re-enabled.
- Note any follow-up action (fix the flaky test, repair CI, etc.).

## Anti-patterns observed pre-FEAT-051

These all happened during the 2026-04-26 SEV-1 recovery and led to merge cascades that broke `main`:
- Disabling protection without re-enabling.
- Force-merging via admin override "just for this one PR" that became "many PRs in a row".
- Skipping the merge queue entirely.
- Merging PRs without the failing required check ever passing locally.

`enforce_admins=true` exists specifically to prevent these. Honor the rule.

## Audit trail

Every break-glass event leaves traces:
- The incident GitHub issue.
- A commit to `main` outside the merge queue (visible in `git log`).
- A modified protection-rule timestamp (`gh api ... | jq '.updated_at'`).

Quarterly review: scan recent admin actions and confirm each was justified.
