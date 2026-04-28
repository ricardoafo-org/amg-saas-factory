# Runbook · Bootstrap fake-pro on tst VPS (FEAT-057)

One-time setup. Brings up three stacks side by side on the tst VPS:

- **edge** (`/srv/amg-edge`) — single Caddy, owns public 80/443 + TLS, splits by `Host` header.
- **tst** (`/srv/amg`) — the existing tst stack, now HTTP-only behind the edge.
- **pro** (`/srv/amg-pro`) — fake-pro stack, HTTP-only behind the edge.

When the real pro VPS lands, the pro stack moves over with its Caddy intact (re-add `ports: 80/443`, drop `amg_edge` network). See FEAT-057 "Real-pro-day delta".

---

## Prerequisites

- SSH access to the tst VPS as the deploy user.
- DNS for both hostnames pointing at the tst VPS public IP. With sslip.io this is automatic:
  - `tst.178-104-237-14.sslip.io`
  - `pro.178-104-237-14.sslip.io`
- The tst stack already running at `/srv/amg/`.
- `.env.pro` ready to drop on the VPS (file mode 600). Mirrors `.env.tst` but with pro-specific values.

---

## Step 1 — Create the shared docker network

```bash
ssh deploy@<tst-vps>
docker network create amg_edge
docker network ls | grep amg_edge   # expect: amg_edge   bridge   local
```

Idempotent: if the network already exists, the create fails noisily — safe to ignore.

---

## Step 2 — Drop the edge stack files

From your local checkout of `feat/fake-pro-edge-router`:

```bash
scp infra/docker-compose.edge.yml deploy@<tst-vps>:/srv/amg-edge/docker-compose.edge.yml
scp infra/Caddyfile.edge          deploy@<tst-vps>:/srv/amg-edge/Caddyfile.edge
scp scripts/deploy-edge.sh        deploy@<tst-vps>:/srv/amg-edge/deploy-edge.sh
ssh deploy@<tst-vps> "chmod +x /srv/amg-edge/deploy-edge.sh"
```

Create the edge env file on the VPS (do NOT scp `.env*` from your laptop):

```bash
ssh deploy@<tst-vps>
cat > /srv/amg-edge/.env.edge <<'EOF'
TST_DOMAIN=tst.178-104-237-14.sslip.io
PRO_DOMAIN=pro.178-104-237-14.sslip.io
EOF
chmod 600 /srv/amg-edge/.env.edge
```

---

## Step 3 — Re-roll the tst stack onto the shared network

The current tst caddy owns 80/443. Free those ports BEFORE the edge starts.

```bash
ssh deploy@<tst-vps>
cd /srv/amg

# Pull the updated docker-compose.tst.yml + Caddyfile from the deploy.
# (The tst deploy workflow scps them; or do it manually for the bootstrap.)
docker compose -f docker-compose.tst.yml --env-file .env.tst down
docker compose -f docker-compose.tst.yml --env-file .env.tst up -d

# Tst is now HTTP-only on the amg_edge network with alias `tst-caddy`.
# At this moment 80/443 on the host are NOT bound to anything — there will
# be a brief outage on tst until step 4 completes.
docker compose -f docker-compose.tst.yml ps
```

---

## Step 4 — Bring the edge up

```bash
cd /srv/amg-edge
./deploy-edge.sh
```

The script:

1. Ensures the `amg_edge` network exists.
2. Pulls the caddy image.
3. `docker compose up -d` the edge stack.
4. Waits up to 15s for Caddy to answer on `127.0.0.1:80`.

Verify TLS provisioning (LE certs are issued on first request to each hostname):

```bash
curl -I https://tst.178-104-237-14.sslip.io   # expect 200 + valid cert
docker compose -f docker-compose.edge.yml logs caddy --tail 50 | grep -i "certificate obtained"
```

If LE rate-limits hit, switch the edge Caddyfile global block to staging temporarily:

```caddy
{
    acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
}
```

Push, restart edge, verify staging cert, then revert.

---

## Step 5 — Bring the pro stack up

```bash
ssh deploy@<tst-vps>
mkdir -p /srv/amg-pro
```

From your laptop:

```bash
scp infra/docker-compose.pro.yml deploy@<tst-vps>:/srv/amg-pro/
scp infra/Caddyfile.pro          deploy@<tst-vps>:/srv/amg-pro/
scp infra/Dockerfile.pocketbase  deploy@<tst-vps>:/srv/amg-pro/
scp scripts/deploy-pro.sh        deploy@<tst-vps>:/home/deploy/
ssh deploy@<tst-vps> "chmod +x /home/deploy/deploy-pro.sh"
```

Drop `.env.pro` directly on the VPS (NEVER scp from laptop):

```bash
ssh deploy@<tst-vps>
$EDITOR /srv/amg-pro/.env.pro   # paste sealed values
chmod 600 /srv/amg-pro/.env.pro
```

First-time pro stack up:

```bash
cd /srv/amg-pro
docker compose -f docker-compose.pro.yml --env-file .env.pro up -d
docker compose -f docker-compose.pro.yml ps
```

The compose project name is `amg-pro` (from the directory). This namespaces:

- network `amg-pro_default`
- volume `amg-pro_pb_data`
- container names `amg-pro-caddy-1`, etc.

Sanity check the namespacing — both stacks should have **distinct** volumes:

```bash
docker volume ls | grep pb_data
# expect:
#   amg_pb_data       (tst)
#   amg-pro_pb_data   (pro)
```

---

## Step 6 — Verify acceptance

From any internet host:

```bash
curl -I https://tst.178-104-237-14.sslip.io
curl -I https://pro.178-104-237-14.sslip.io
```

Both must return 200 with a valid Let's Encrypt cert.

Run the smoke suite locally against each:

```bash
BASE_URL=https://tst.178-104-237-14.sslip.io npx playwright test --config=playwright.smoke.config.ts
BASE_URL=https://pro.178-104-237-14.sslip.io npx playwright test --config=playwright.smoke.config.ts
```

Verify isolation — tearing down pro must not touch tst:

```bash
ssh deploy@<tst-vps>
docker compose -f /srv/amg-pro/docker-compose.pro.yml down
curl -I https://tst.178-104-237-14.sslip.io   # still 200
curl -I https://pro.178-104-237-14.sslip.io   # 502/503 (expected — pro is down)
docker compose -f /srv/amg-pro/docker-compose.pro.yml --env-file /srv/amg-pro/.env.pro up -d
```

---

## Step 7 — Wire GitHub secrets for `deploy-pro.yml`

Create the `pro` GitHub Environment under **Settings → Environments → New environment**:

- Name: `pro`
- Required reviewers: `ricardoafo`
- Deployment branches and tags: "Selected branches and tags" → add `main`

Then add Environment secrets (Settings → Environments → pro → **Add environment secret**, NOT repository secrets):

- `PRO_SSH_HOST` = same value as `TST_SSH_HOST` (fake-pro is colocated)
- `PRO_SSH_USER` = same value as `TST_SSH_USER`
- `PRO_SSH_KEY`  = same value as `TST_SSH_KEY`
- `PRO_DOMAIN`   = `pro.178-104-237-14.sslip.io`

Why env-scoped, not repo-scoped: only jobs with `environment: pro` can read these secrets, and the env's `main`-branch restriction means feature-branch / fork PR workflows can't read them at all. Tighter blast radius. The deploy-pro.yml workflow has `environment: pro` on every job that needs PRO_* (deploy-vps, health-check-pro, schema-contract-pro, smoke-pro). Reviewer prompts once per workflow run.

Single-env model: the `pro` env both gates the deploy (reviewer) and records the deployment on success. When a release-branch flow with `required_deployments: [pro]` is added later, split into `pro-approval` (gate) + `pro` (marker on a separate confirm job).

First end-to-end test:

```bash
gh workflow run deploy-pro.yml
# approve in the pro Environment when prompted
gh run watch
```

All gates must turn green. If schema-contract or smoke fail against pro, fix forward — do NOT hide failures.

---

## Rollback (if fake-pro setup goes sideways)

Edge offline + tst customer impact:

```bash
ssh deploy@<tst-vps>
cd /srv/amg-edge && docker compose -f docker-compose.edge.yml down
cd /srv/amg
# Revert docker-compose.tst.yml + Caddyfile to pre-FEAT-057 (port 80/443 binding back).
docker compose -f docker-compose.tst.yml --env-file .env.tst down
docker compose -f docker-compose.tst.yml --env-file .env.tst up -d
```

The pre-FEAT-057 versions are the parents of this PR's commits — `git show <parent>:infra/docker-compose.tst.yml` etc.

---

## Real-pro-day migration (when the real pro VPS arrives)

Outside this runbook. See FEAT-057 "Real-pro-day delta" — single PR flips two secrets and reverts pro stack to standalone TLS.
