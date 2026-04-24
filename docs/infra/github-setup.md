# GitHub Setup — Actions secrets and branch protection

## Required GitHub Actions secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret name | Purpose | Example value |
|---|---|---|
| `TST_SSH_HOST` | VPS hostname or IP for SSH deploy | `1.2.3.4` or `tst.yourdomain.com` |
| `TST_SSH_USER` | SSH username on the VPS | `deploy` |
| `TST_SSH_KEY` | Private Ed25519 key for the `deploy` user | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `TST_KNOWN_HOSTS` | SHA256 fingerprint of the VPS host key — consumed by `appleboy/ssh-action`'s `fingerprint` parameter to prevent MITM | `SHA256:abc123...` |
| `GHCR_PAT` | GitHub PAT with `write:packages` scope (optional — `GITHUB_TOKEN` is used by default) | `ghp_...` |

`GITHUB_TOKEN` is provided automatically by GitHub Actions for the `docker/login-action` GHCR push step. `GHCR_PAT` is only needed if you change the registry login to use a PAT instead.

To get the `TST_KNOWN_HOSTS` fingerprint value:
```bash
ssh-keyscan -t ed25519 <vps-ip> | ssh-keygen -lf - | awk '{print $2}'
```
The output is a single line like `SHA256:abc123...` — paste that as the secret value. The deploy workflow will reject any SSH connection whose host key does not match this fingerprint, blocking host-spoofing MITM attacks.

## Branch protection rules for main

Go to **Settings → Branches → Add branch protection rule** for pattern `main`:

- [ ] Require a pull request before merging
- [ ] Require status checks to pass before merging — add: `Type-check · Test · Lint · Validate flows`
- [ ] Require branches to be up to date before merging
- [ ] Dismiss stale pull request approvals when new commits are pushed
- [ ] Require linear history (squash merges only)
- [ ] Include administrators (nobody can bypass rules, even admins)
- [ ] Automatically delete head branches after merge

## GHCR package visibility

The Docker image is pushed to `ghcr.io/ricardoafo/amg-saas-factory`. Because this repository is private, the package will also default to private — this is fine. GitHub Actions can pull private packages within the same organization/account using `GITHUB_TOKEN`.

If you need to pull the image from the VPS without a PAT (e.g., for manual recovery), make the package public in **Settings → Packages → amg-saas-factory → Package settings → Change visibility**. For the automated SSH deploy flow this is not required.
