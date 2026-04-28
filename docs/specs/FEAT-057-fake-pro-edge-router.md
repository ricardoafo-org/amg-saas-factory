---
id: FEAT-057
title: Fake-pro environment via shared edge router on tst VPS
status: wip
owner: ricardoafo
filed: 2026-04-28
sdd-mode: solo-dev (proposal + design + tasks merged)
sdd-artifact-store: engram
related:
  - docs/specs/FEAT-024-ci-cd-tst-pipeline.md
  - .github/workflows/deploy-pro.yml
  - infra/docker-compose.pro.yml
---

# FEAT-057 · Fake-pro on tst VPS via shared edge router

## Problem

We have a wired-but-deferred `pro` environment (PR #119): `infra/docker-compose.pro.yml`, `infra/Caddyfile.pro`, `.github/workflows/deploy-pro.yml`, plus a manual approval gate via the `pro` GitHub Environment. It cannot run yet because there is no pro VPS — and provisioning one costs money and admin time we have not committed to.

The risk is straightforward: the first time we exercise `deploy-pro.yml` on a real pro box will be the day we go to production. If anything in the pipeline (SSH paths, secret names, schema apply against a fresh PB, smoke against the pro hostname, the manual approval gate) is wrong, we discover it in the worst possible moment.

We want **fake pro on the existing tst VPS**: byte-identical pipeline shape, same workflow runs, same approval gate, same apply-schema dance, same smoke contract — just colocated with tst until the real pro VPS lands.

## Decision

**Add a third "edge" stack on the tst VPS** that owns the public ports 80/443 and TLS termination. Both the tst stack and the pro stack become HTTP-only behind the edge, joined by a shared docker network. The edge splits requests by `Host` header.

```
                    ┌─ Host=tst.178-104-237-14.sslip.io ─→ tst caddy → tst app/pb
internet → :80/:443 │
        [edge caddy]│
                    └─ Host=pro.178-104-237-14.sslip.io ─→ pro caddy → pro app/pb
```

**Why this shape (not "extend tst's Caddy" or "lift Caddy out entirely"):**

- **Fidelity.** When the real pro VPS arrives, the pro stack moves over with its Caddy intact (just re-add `ports: ["80:80", "443:443"]`). The pipeline we tested IS the pipeline that ships. The only delta is the cert-bearing port mapping.
- **Blast-radius isolation.** Edge is owned by neither stack. Tearing down pro to debug something does not touch tst's Caddy or its TLS state. Tearing down tst does not touch pro.
- **One TLS owner.** Letsencrypt rate limits and challenge state live in one place — the edge — instead of fighting between two Caddys for the same hostnames.
- **Minimal compose-file diff vs status quo.** Inner Caddys keep their existing path-routing logic (`/pb/_*` → 404, `/pb/*` → pocketbase, everything else → next.js). They only lose their host port binding and TLS responsibility.

**Tradeoffs accepted:**

- TLS terminates at the edge; inner Caddys see HTTP. Headers must propagate (`X-Forwarded-Proto`, `X-Forwarded-For`, `X-Real-IP`). Standard reverse-proxy hygiene; trivial.
- Three Caddy containers on one VPS (~30 MB RAM each). Fine on the tst host.
- Bootstrap requires one-time SSH to tst VPS to create the shared network, drop edge files, restart tst stack on the new network. Documented in the runbook.
- Real-pro-day deltas (small, listed below) are NOT zero. We document them so they cannot be missed.

## Architecture

### Network topology
```
docker network: amg_edge (external, created once on the VPS)
  ├─ amg_edge_caddy        (the edge)
  ├─ amg_default           (tst stack — caddy/app/pocketbase, default network)
  └─ amg_pro_default       (pro stack — caddy/app/pocketbase, default network)
```

The edge container joins `amg_edge` AND nothing else. The tst caddy joins both its `amg_default` and `amg_edge`. Same for pro caddy. App + pocketbase containers stay on their stack-default network only — they are NOT reachable from edge directly.

### Edge Caddyfile (sketch)
```
{$TST_DOMAIN} {
    reverse_proxy tst-caddy:80 {
        header_up X-Forwarded-Proto {scheme}
        header_up X-Real-IP {remote_host}
    }
}

{$PRO_DOMAIN} {
    reverse_proxy pro-caddy:80 {
        header_up X-Forwarded-Proto {scheme}
        header_up X-Real-IP {remote_host}
    }
}
```

Edge auto-provisions LE certs for both hostnames on first request. Inner Caddys serve plain HTTP on internal port 80 only.

### Inner Caddy changes
- `auto_https off` (TLS is the edge's job)
- `:80` listener only
- Trust `X-Forwarded-Proto` from edge so the inner stack still sees `scheme=https` for redirects
- Drop `ports: ["80:80", "443:443"]` from compose; replace with `expose: ["80"]`
- Add `networks: [default, amg_edge]`

## Files to create

- `infra/docker-compose.edge.yml` — edge stack (one Caddy)
- `infra/Caddyfile.edge` — host-header split, terminates TLS
- `scripts/deploy-edge.sh` — VPS-side bootstrap (idempotent: create network if missing, compose up edge)
- `docs/runbooks/fake-pro-bootstrap.md` — one-time setup steps for tst VPS
- `.github/workflows/deploy-edge.yml` — manual `workflow_dispatch` to update edge config (rare; only when adding new hostnames or changing TLS settings)

## Files to modify

- `infra/docker-compose.tst.yml` — caddy: remove host port binding, add `expose: ["80"]`, add `amg_edge` external network
- `infra/Caddyfile` — `auto_https off`, listen on `:80` only, trust `X-Forwarded-Proto`
- `infra/docker-compose.pro.yml` — same shape as tst caddy changes
- `infra/Caddyfile.pro` — same as tst Caddyfile changes
- `.github/workflows/deploy-pro.yml` — set `PRO_DOMAIN=pro.178-104-237-14.sslip.io` (or a real domain when ready), set `PRO_SSH_HOST=$TST_SSH_HOST` for the fake-pro phase, document the secret-flip required on real-pro-day
- `scripts/deploy-pro.sh` — verify `/srv/amg-pro/` paths, ensure it uses `--project-name amg_pro` so docker compose namespaces don't collide with tst on the same host

## Bootstrap sequence (one-time, manual SSH to tst VPS)

```bash
# As deploy user on tst VPS:
docker network create amg_edge

# Drop edge stack
mkdir -p /srv/amg-edge
scp infra/docker-compose.edge.yml deploy@tst:/srv/amg-edge/
scp infra/Caddyfile.edge deploy@tst:/srv/amg-edge/

# Stop tst stack, restart on shared network
cd /srv/amg
docker compose down
# (apply the new docker-compose.tst.yml that joins amg_edge)
docker compose up -d

# Bring edge up
cd /srv/amg-edge
docker compose -f docker-compose.edge.yml up -d

# Bring pro stack up (first time)
mkdir -p /srv/amg-pro
# (drop docker-compose.pro.yml, Caddyfile.pro, .env.pro)
cd /srv/amg-pro
docker compose -p amg_pro -f docker-compose.pro.yml up -d
```

Documented in detail in `docs/runbooks/fake-pro-bootstrap.md`.

## Acceptance

1. `https://tst.178-104-237-14.sslip.io` still works — no regression on the tst customer flow.
2. `https://pro.178-104-237-14.sslip.io` returns the pro stack's homepage with a valid LE cert.
3. Both hostnames pass `tests/smoke/post-deploy.spec.ts` against their respective `BASE_URL`.
4. `deploy-pro.yml` runs end-to-end (manual dispatch + approval) and turns green:
   - SSH succeeds with `PRO_SSH_HOST=$TST_SSH_HOST`
   - Snapshot of pro `pb_data` succeeds in `/srv/amg-pro/`
   - `apply-schema.ts` runs against pro's PB, exits 0 (idempotent on a freshly seeded PB)
   - Container swap succeeds
   - Health check + schema-contract + smoke pass against `https://pro.178-104-237-14.sslip.io`
5. Tearing down `amg_pro` stack (`docker compose -p amg_pro down`) does not touch tst's containers or affect tst's traffic.
6. The `pro` GitHub Environment requires admin reviewer approval before the deploy job starts (visible in the PR check timeline).

## Real-pro-day delta (when the real pro VPS arrives)

Single-PR migration:

1. `infra/docker-compose.pro.yml`: re-add `ports: ["80:80", "443:443"]` to caddy; remove `amg_edge` from caddy networks.
2. `infra/Caddyfile.pro`: re-enable `auto_https`, drop `:80`-only listener.
3. GitHub secrets: `PRO_SSH_HOST` flips from tst host to real pro host. `PRO_DOMAIN` flips to real prod domain (e.g., `app.amgtalleres.es`).
4. tst VPS: `infra/Caddyfile.edge` removes the `pro.*` block; restart edge stack.

Total diff: ~10 lines compose, ~5 lines Caddyfile, 2 secret flips, 1 edge config push. Verifiable in PR before flipping the secrets.

## Risks

- **Cert issuance failures at edge.** LE rate-limits or DNS issues block both hostnames. Mitigation: edge config has staging fallback documented; runbook includes "if cert issuance fails" step.
- **Header propagation bug.** Inner stacks miss `X-Forwarded-Proto` and generate `http://` redirects on `https://` traffic. Mitigation: smoke spec asserts the `Location` header in a 30x response is `https://`; mandatory in acceptance.
- **Compose project-name collisions.** Default project name comes from directory name. Both stacks live under different paths (`/srv/amg`, `/srv/amg-pro`) but the deploy script must explicitly pass `-p amg_pro` to avoid container name collisions if anyone runs `docker compose` from the wrong directory. Mitigation: `deploy-pro.sh` passes `--project-name amg_pro` explicitly.
- **Volume name collisions.** `pb_data`, `caddy_data`, `caddy_config` named volumes would collide if both stacks used default naming. Compose namespaces volumes by project, so `amg_pro_pb_data` ≠ `amg_pb_data`. Verify after first `docker compose up` that two distinct volumes exist.
- **Network cleanup on real-pro-day.** After flipping pro to its real VPS, the `amg_edge` network on tst still exists with only edge + tst caddy attached. Document the cleanup step in the migration PR.

## Out of scope

- Real production VPS provisioning, DNS, secret rotation. That's the real-pro-day delta listed above.
- mTLS or any auth on the pb_admin backdoor (covered separately by FEAT-055 cutover plan).
- Visual regression on pro (no fake-pro frontend differs from tst's at this stage).
- Rate limiting / WAF at the edge (FEAT-034 covers that).

## Tasks

1. **Edge stack files** — `infra/docker-compose.edge.yml`, `infra/Caddyfile.edge`, `scripts/deploy-edge.sh`.
2. **Tst stack updates** — modify `infra/docker-compose.tst.yml`, `infra/Caddyfile` for HTTP-only inner serving.
3. **Pro stack updates** — modify `infra/docker-compose.pro.yml`, `infra/Caddyfile.pro` for HTTP-only inner serving.
4. **Workflow + script updates** — `.github/workflows/deploy-pro.yml` (PRO_SSH_HOST/PRO_DOMAIN values), `scripts/deploy-pro.sh` (`--project-name amg_pro`).
5. **Runbook** — `docs/runbooks/fake-pro-bootstrap.md` with the SSH bootstrap sequence.
6. **Edge workflow** — `.github/workflows/deploy-edge.yml` for future edge config updates.
7. **Verification** — once deployed, run the acceptance checklist; document results in PR description.

Acceptance for each task: passes `npm run lint`, `npm run type-check`, `npm test`. Per-acceptance criteria above as functional gates verified after VPS bootstrap.
