#!/usr/bin/env bash
# deploy-edge.sh — runs ON the VPS that hosts the shared edge router.
# Idempotent: safe to re-run. Brings up (or refreshes) the edge stack.
#
# Bootstrap order on a fresh VPS:
#   1. mkdir -p /srv/amg-edge && cd /srv/amg-edge
#   2. drop docker-compose.edge.yml + Caddyfile.edge + .env.edge in place
#   3. ./deploy-edge.sh
#
# The .env.edge file must define:
#   TST_DOMAIN=tst.<host>.sslip.io
#   PRO_DOMAIN=pro.<host>.sslip.io
set -euo pipefail

cd /srv/amg-edge

# Ensure the shared external network exists. Other stacks (tst, pro) join it.
if ! docker network inspect amg_edge >/dev/null 2>&1; then
  echo "[deploy-edge] Creating shared docker network 'amg_edge'..."
  docker network create amg_edge
fi

echo "[deploy-edge] Pulling caddy image..."
docker compose -f docker-compose.edge.yml --env-file .env.edge pull

echo "[deploy-edge] Bringing edge stack up..."
docker compose -f docker-compose.edge.yml --env-file .env.edge up -d

echo "[deploy-edge] Waiting for Caddy to be reachable on :80..."
for i in $(seq 1 15); do
  if curl -sS -o /dev/null --max-time 2 http://127.0.0.1/; then
    echo "[deploy-edge] Edge is up."
    exit 0
  fi
  sleep 1
done

echo "[deploy-edge] WARN: edge did not respond on :80 within 15s; check 'docker compose logs caddy'." >&2
exit 1
