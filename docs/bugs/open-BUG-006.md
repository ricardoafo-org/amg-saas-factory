---
id: BUG-006
title: deploy-tst pipeline has never succeeded — TST_SSH_KEY secret is malformed
severity: critical
status: open
filed: 2026-04-25
filed-by: claude (autonomous)
branch: fix/BUG-006
---

## Summary

The `deploy-tst.yml` GitHub Actions workflow has **never deployed successfully** since FEAT-024 was merged on 2026-04-24. Every push to `main` triggers the workflow and every run fails at the `Deploy to VPS via SSH` step with `ssh: no key found`. The user assumed `main → tst` auto-deployment was working but it has been silently broken for the entire history of the repo.

User impact: **the v2 redesign (#13) merged to main is NOT on the tst environment.** Same for every prior change merged since FEAT-024.

## Steps to Reproduce

1. Push any commit to `main`
2. `deploy-tst.yml` triggers
3. `smoke` job passes (type-check)
4. `build-and-deploy` job builds image successfully and pushes to GHCR
5. `Deploy to VPS via SSH` step fails

## Expected Behaviour

SSH to VPS and execute `/home/deploy/deploy-tst.sh sha-<SHA>` to pull the new image and restart the containers.

## Actual Behaviour

```
2026/04/25 11:15:37 ssh.ParsePrivateKey: ssh: no key found
2026/04/25 11:15:38 ssh: handshake failed: ssh: unable to authenticate, attempted methods [none], no supported methods remain
##[error]Process completed with exit code 1.
```

Run history (every single one failed):

| Date | Run | Trigger |
|---|---|---|
| 2026-04-25 11:12:38Z | 24929591077 | #13 v2 design |
| 2026-04-25 11:11:49Z | 24929576735 | #12 caddy + staff schema |
| 2026-04-25 11:10:01Z | 24929544537 | #7 actions/cache bump |
| 2026-04-25 11:08:22Z | — | #4 docker/login bump |
| 2026-04-25 11:06:35Z | — | #5 setup-node bump |
| 2026-04-25 11:05:01Z | — | #3 ssh-action bump |
| 2026-04-25 11:04:42Z | — | #9 dev-deps bump |
| 2026-04-25 00:40:59Z | — | #11 SMS_TEMPLATES |
| 2026-04-25 00:25:01Z | — | #10 sync helpers |
| 2026-04-24 23:24:16Z | — | FEAT-024 initial |

## Root Cause Analysis

Two distinct issues found:

### Primary blocker — `TST_SSH_KEY` is malformed

`ssh.ParsePrivateKey: ssh: no key found` from `appleboy/ssh-action@v1.2.5` means the secret value cannot be parsed as a valid PEM-encoded private key. Most common causes:

- **Newlines stripped on upload.** GitHub Actions secrets must preserve `\n` between PEM lines. If the key was pasted as a single line into the GitHub UI, or copied without trailing newline, parsing fails.
- **Wrong key format.** The action expects OpenSSH or PEM format. If it's PuTTY .ppk it won't parse.
- **Encrypted key without passphrase.** If the key has a passphrase but `INPUT_PASSPHRASE` is empty, the action can't decrypt.

Verified with admin account: secret `TST_SSH_KEY` exists (last updated 2026-04-25T00:59:10Z) but the format is invalid.

### Secondary issue — secret name mismatch

`.github/workflows/deploy-tst.yml:63` references `secrets.TST_KNOWN_HOSTS` but the actual secret is named `TST_SSH_KNOWN_HOSTS`. This passes empty string to the `fingerprint` parameter. Fingerprint is optional in the action so this is non-fatal, but should be cleaned up — or the parameter removed entirely if host key pinning isn't desired.

Note: the `appleboy/ssh-action` `fingerprint` parameter expects an **SSH key fingerprint** (e.g., `SHA256:abc...`), not the contents of a `known_hosts` file. If `TST_SSH_KNOWN_HOSTS` actually contains `known_hosts` lines, the secret was misnamed for its intended purpose and the action's fingerprint check will not work as expected.

## Fix

**Cannot be fixed by Claude alone** — requires user/admin to re-upload the SSH private key.

User action required:
```bash
# On a machine that has the working private key for the deploy user
gh secret set TST_SSH_KEY < ~/.ssh/id_ed25519_tst_deploy

# Verify by re-running the latest deploy-tst run, or push an empty commit:
git commit --allow-empty -m "chore(ci): retrigger tst deploy after secret rotation"
git push origin main
```

The `<` redirect is critical — it preserves newlines from the file. Pasting into the GitHub web UI is what most likely caused the original malformed upload.

Code-side cleanup (separate small PR):
- Either rename `secrets.TST_KNOWN_HOSTS` → `secrets.TST_SSH_KNOWN_HOSTS` in the workflow if the secret is a fingerprint, OR remove the `fingerprint:` line entirely if host key pinning isn't enforced today.

Branch: `fix/BUG-006` (workflow cleanup only — secret rotation is manual)

## Verification

_To be filled after fix:_

- [ ] `TST_SSH_KEY` re-uploaded via `gh secret set TST_SSH_KEY < keyfile`
- [ ] Workflow `secrets.TST_KNOWN_HOSTS` typo fixed or removed
- [ ] Empty commit pushed to `main`
- [ ] `deploy-tst.yml` run completes with conclusion `success`
- [ ] `curl -I https://tst.<domain>` returns expected version header
- [ ] v2 redesign visually verified on tst URL

## Severity rationale

**Critical** because:
- Production deploy gate is broken silently (no alerting)
- Every merge to `main` for the past day has produced the false signal "merged → live on tst"
- Sprint 1 test strategy (FEAT-027) depends on a working deploy-tst gate to add post-deploy smoke + auto-rollback
- User explicitly flagged: "redesign must be deploy before I come back"
