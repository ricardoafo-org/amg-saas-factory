---
id: ADR-010
title: Deployment architecture — local dev + Hetzner tst (pro deferred)
status: accepted
date: 2026-04-24
supersedes: —
---

## Context

The project is approaching MVP readiness (security hardened, compliance UI done, admin dashboard done, chatbot stable, SMS wired). We need a remote environment to validate every `main` build before it can be promoted to a paying customer site.

Budget is tight — the product has no paying customers yet. A full three-environment setup (`dev` / `tst` / `pro`) on Hetzner would cost €12–15/month with little benefit over a local `dev`. The developer already runs the full stack locally (`npm run dev` + `npm run pb:serve`), so a remote `dev` adds cost without speeding anything up.

Production (`pro`) will be provisioned only when the first paying tenant signs up. Until then, `tst` acts as both staging **and** the public demo site for sales.

## Decision

- **dev** = local only (`npm run dev` on developer machine, PocketBase at `127.0.0.1:8090`)
- **tst** = single Hetzner VPS (CX21, Falkenstein DE), Docker Compose stack, auto-deploy on push to `main`
- **pro** = **deferred** — branch and GitHub Environment will be created the day the first paying tenant is onboarded
- Reverse proxy: **Caddy** (auto-manages Let's Encrypt certificates)
- CI/CD: **GitHub Actions** (test → build image → push to GHCR → SSH deploy)

## Rationale

- Local `dev` is faster (no push-to-see latency) and free
- One remote env per funded use case — adding `pro` now would just sit idle
- CX21 (2 vCPU / 4 GB RAM / 40 GB SSD, €4.99/mo) has enough headroom to run Next.js + PocketBase + Caddy in Docker with room to grow to 2–3 tenants before we must split
- Falkenstein region → ~30 ms latency from Spain, EU data residency for LOPDGDD/GDPR
- Caddy over Nginx: 80% fewer config lines, automatic SSL, zero ops burden
- Deploying the same commit to `tst` that will later be promoted to `pro` gives us a genuine smoke-test environment — no "works in dev, breaks in prod" surprises

## Alternatives Considered

| Option | Rejected because |
|---|---|
| Three envs (dev/tst/pro) on Hetzner | €12+/mo, remote dev adds zero value over local |
| Vercel + external PocketBase | PocketBase self-hosting is the whole point; Vercel cold-starts hurt chatbot UX |
| Railway / Render | 3–5× Hetzner cost at our scale; no EU-only region guarantee on cheapest tiers |
| Nginx reverse proxy | More config, manual Certbot renewal cron, no real benefit |
| Kubernetes (k3s) | Massive over-engineering for one app + one DB |
| Two VPSes (one `tst`, one `pro`) from day 1 | Extra €5/mo for an idle `pro` machine before MVP launch |

## Consequences

**Positive:**
- €5/month infrastructure cost until first paying tenant
- One push to `main` → live `tst` in ~3 minutes; fast iteration
- `tst` doubles as a live demo URL for sales
- Caddy's auto-SSL removes a whole class of "cert expired" outages

**Negative / tradeoffs:**
- `tst` is a single point of failure — if the VPS dies, the demo is down until we redeploy
- No `pro` isolation yet — promoting to `pro` will require a second VPS + a day of runbook work (acceptable because it happens exactly once, when we have revenue)
- PocketBase data on `tst` is ephemeral in spirit — we will wipe it periodically to keep the demo clean; no backup strategy for `tst`
- GitHub Actions deploy uses SSH key — rotating that key touches both GHA secrets and the server

**Neutral:**
- Docker images stored in GHCR (free for public, but this repo is private — counts against GitHub storage quota; acceptable at our image size)

## Branch → environment mapping

```
feature/*  ──PR──►  main  ──auto-deploy──►  tst.amg-talleres.com
                           ──PR (fast-fwd)──►  pro  ──manual approval──►  talleres-amg.com  [deferred]
```

## Review trigger

Revisit this ADR when ANY of the following is true:
- First paying tenant signs up → provision `pro` VPS, add GitHub Environment with approval gate
- `tst` VPS hits 70% CPU or 80% memory sustained for 24 h → scale up (CX31) or split tenants
- Second tenant onboarded → decide whether to multi-tenant on one VPS or split
- Any regulatory request for data residency certification → document current Falkenstein hosting
