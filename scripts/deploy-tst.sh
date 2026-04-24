#!/usr/bin/env bash
# deploy-tst.sh — runs ON the VPS; called by the GitHub Actions SSH deploy step.
# Usage: ./deploy-tst.sh <image-tag>   e.g. ./deploy-tst.sh sha-abc1234
set -euo pipefail

IMAGE_TAG="${1:?Usage: deploy-tst.sh <image-tag>}"

cd /srv/amg

export IMAGE_TAG

echo "[deploy] Pulling new app image (tag: ${IMAGE_TAG})..."
docker compose -f docker-compose.tst.yml --env-file .env.tst pull app

echo "[deploy] Starting updated stack..."
docker compose -f docker-compose.tst.yml --env-file .env.tst up -d app

echo "[deploy] Waiting for health endpoint..."
MAX_RETRIES=30
RETRY_DELAY=2
for i in $(seq 1 "${MAX_RETRIES}"); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || true)
  if [ "${STATUS}" = "200" ]; then
    echo "[deploy] Health check passed (attempt ${i}/${MAX_RETRIES})."
    break
  fi
  if [ "${i}" = "${MAX_RETRIES}" ]; then
    echo "[deploy] ERROR: health check never returned 200 after ${MAX_RETRIES} attempts." >&2
    exit 1
  fi
  echo "[deploy] Attempt ${i}/${MAX_RETRIES}: got HTTP ${STATUS}, retrying in ${RETRY_DELAY}s..."
  sleep "${RETRY_DELAY}"
done

echo "[deploy] Pruning images older than 7 days..."
docker image prune -f --filter "until=168h"

echo "[deploy] Done. Running image: ${IMAGE_TAG}"
