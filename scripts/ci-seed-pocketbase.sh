#!/usr/bin/env bash
# Boot PocketBase + seed test data for CI E2E admin specs.
#
# Required env vars (set by the workflow):
#   POCKETBASE_ADMIN_EMAIL     - superuser email
#   POCKETBASE_ADMIN_PASSWORD  - superuser password (>= 10 chars)
#   STAFF_OWNER_EMAIL          - test admin login (consumed by db-setup.js)
#   STAFF_OWNER_PASSWORD       - test admin password
#
# Leaves PocketBase serving on http://127.0.0.1:8090 in the background.
# Caller is responsible for stopping the process at job end.
set -euo pipefail

PB_URL="http://127.0.0.1:8090"
PB_BIN="./pocketbase"

if [[ ! -x "$PB_BIN" ]]; then
  bash scripts/setup-pocketbase.sh
fi

: "${POCKETBASE_ADMIN_EMAIL:?required}"
: "${POCKETBASE_ADMIN_PASSWORD:?required}"
: "${STAFF_OWNER_EMAIL:?required}"
: "${STAFF_OWNER_PASSWORD:?required}"

echo "==> Creating superuser"
"$PB_BIN" superuser upsert "$POCKETBASE_ADMIN_EMAIL" "$POCKETBASE_ADMIN_PASSWORD"

echo "==> Starting PocketBase (background)"
"$PB_BIN" serve --http=127.0.0.1:8090 > pb.log 2>&1 &
echo $! > pb.pid

echo "==> Waiting for PocketBase health"
for i in {1..30}; do
  if curl -fsS "$PB_URL/api/health" >/dev/null 2>&1; then
    echo "    ready"
    break
  fi
  sleep 1
done

if ! curl -fsS "$PB_URL/api/health" >/dev/null 2>&1; then
  echo "PocketBase failed to start. Last log lines:"
  tail -n 50 pb.log || true
  exit 1
fi

echo "==> Running db-setup.js (seeds tenant, config, services, staff)"
node scripts/db-setup.js

echo "==> Done. PocketBase pid: $(cat pb.pid)"
