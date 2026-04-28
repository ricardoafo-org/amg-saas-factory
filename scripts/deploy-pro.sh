#!/usr/bin/env bash
# deploy-pro.sh — runs ON the pro VPS; called by .github/workflows/deploy-pro.yml.
# Usage: ./deploy-pro.sh <image-tag>   e.g. ./deploy-pro.sh sha-abc1234
#
# Deliberately mirrors deploy-tst.sh — same shape, different paths + compose file.
# The ONLY behavioural difference vs tst is rollback hygiene: pro snapshots run
# in the workflow before this script (same retention) and a manual approval
# gates the workflow itself.
set -euo pipefail

IMAGE_TAG="${1:?Usage: deploy-pro.sh <image-tag>}"

cd /srv/amg-pro

export IMAGE_TAG

echo "[deploy-pro] Pulling new app image (tag: ${IMAGE_TAG})..."
docker compose -f docker-compose.pro.yml --env-file .env.pro pull app

echo "[deploy-pro] Starting updated stack..."
docker compose -f docker-compose.pro.yml --env-file .env.pro up -d app

echo "[deploy-pro] Waiting for health endpoint..."
MAX_RETRIES=30
RETRY_DELAY=2
for i in $(seq 1 "${MAX_RETRIES}"); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || true)
  if [ "${STATUS}" = "200" ]; then
    echo "[deploy-pro] Health check passed (attempt ${i}/${MAX_RETRIES})."
    break
  fi
  if [ "${i}" = "${MAX_RETRIES}" ]; then
    echo "[deploy-pro] ERROR: health check never returned 200 after ${MAX_RETRIES} attempts." >&2
    exit 1
  fi
  echo "[deploy-pro] Attempt ${i}/${MAX_RETRIES}: got HTTP ${STATUS}, retrying in ${RETRY_DELAY}s..."
  sleep "${RETRY_DELAY}"
done

echo "[deploy-pro] Pruning images older than 7 days..."
docker image prune -f --filter "until=168h"

echo "[deploy-pro] Done. Running image: ${IMAGE_TAG}"
