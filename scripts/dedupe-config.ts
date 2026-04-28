#!/usr/bin/env tsx
/**
 * dedupe-config.ts — one-time destructive dedupe of config(tenant_id, key)
 *
 * Context: BUG-017. Pre-existing duplicate (tenant_id, key) rows in `config`
 * block creation of `idx_config_tenant_key` (UNIQUE), which in turn blocks
 * every CD run since 2026-04-28. This script clears the duplicates so
 * apply-schema.ts can install the UNIQUE index.
 *
 * Strategy: for each (tenant_id, key) group, keep the most-recently-updated
 * record and delete the rest. Idempotent: re-running on already-clean data is
 * a no-op (every group has size 1).
 *
 * Triggered EXCLUSIVELY via `.github/workflows/dedupe-config.yml`
 * (workflow_dispatch with explicit confirmation input). NEVER on push.
 *
 * Once tst is clean, delete this script + the workflow in a follow-up PR.
 *
 * Usage:
 *   tsx scripts/dedupe-config.ts                # dry-run by default
 *   tsx scripts/dedupe-config.ts --apply        # actually delete duplicates
 *
 * Env (same contract as apply-schema.ts):
 *   POCKETBASE_URL                  default http://127.0.0.1:8090
 *   PB_BOOTSTRAP_EMAIL / POCKETBASE_ADMIN_EMAIL
 *   PB_BOOTSTRAP_PASSWORD / POCKETBASE_ADMIN_PASSWORD
 *
 * Exit codes:
 *   0  no duplicates found, or duplicates resolved
 *   1  duplicates found in dry-run mode (informational)
 *   2  PB unreachable / auth failure / delete error
 */

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const EMAIL = process.env.PB_BOOTSTRAP_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const PASSWORD = process.env.PB_BOOTSTRAP_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;

const APPLY = process.argv.slice(2).includes('--apply');

if (!EMAIL || !PASSWORD) {
  console.error('Missing PB_BOOTSTRAP_EMAIL / PB_BOOTSTRAP_PASSWORD.');
  process.exit(2);
}

interface ConfigRecord {
  id: string;
  tenant_id: string;
  key: string;
  value?: string;
  updated?: string;
  created?: string;
}

async function pbRequest<T = unknown>(
  method: 'GET' | 'POST' | 'DELETE',
  urlPath: string,
  body?: unknown,
  token?: string,
): Promise<{ status: number; body: T }> {
  const res = await fetch(`${PB_URL}${urlPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    parsed = undefined;
  }
  return { status: res.status, body: parsed as T };
}

async function listAllConfig(token: string): Promise<ConfigRecord[]> {
  const all: ConfigRecord[] = [];
  let page = 1;
  for (;;) {
    const res = await pbRequest<{ items: ConfigRecord[]; totalPages: number }>(
      'GET',
      `/api/collections/config/records?page=${page}&perPage=200&sort=-updated`,
      undefined,
      token,
    );
    if (res.status !== 200) {
      throw new Error(`list config failed (${res.status}): ${JSON.stringify(res.body)}`);
    }
    all.push(...res.body.items);
    if (page >= res.body.totalPages) break;
    page++;
  }
  return all;
}

async function main() {
  const auth = await pbRequest<{ token: string }>(
    'POST',
    '/api/collections/_superusers/auth-with-password',
    { identity: EMAIL, password: PASSWORD },
  );
  if (auth.status !== 200) {
    console.error(`Auth failed (${auth.status}). Check PB_BOOTSTRAP_* env.`);
    process.exit(2);
  }
  const token = auth.body.token;

  const records = await listAllConfig(token);
  console.log(`Loaded ${records.length} config records.`);

  // Group by (tenant_id, key). Records arrive sorted -updated, so the first
  // entry in each group is the most-recently-updated and is kept.
  const groups = new Map<string, ConfigRecord[]>();
  for (const r of records) {
    const k = `${r.tenant_id}::${r.key}`;
    const arr = groups.get(k) || [];
    arr.push(r);
    groups.set(k, arr);
  }

  const duplicates: { tuple: string; keep: ConfigRecord; drop: ConfigRecord[] }[] = [];
  for (const [tuple, group] of groups) {
    if (group.length > 1) {
      duplicates.push({ tuple, keep: group[0], drop: group.slice(1) });
    }
  }

  if (duplicates.length === 0) {
    console.log('No duplicates. config is clean.');
    process.exit(0);
  }

  const dropCount = duplicates.reduce((acc, d) => acc + d.drop.length, 0);
  console.log(
    `\nFound ${duplicates.length} duplicate group(s), ${dropCount} record(s) to delete.`,
  );
  for (const d of duplicates) {
    console.log(`\n  ${d.tuple}`);
    console.log(`    KEEP  ${d.keep.id}  updated=${d.keep.updated}`);
    for (const drop of d.drop) {
      console.log(`    DROP  ${drop.id}  updated=${drop.updated}`);
    }
  }

  if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to delete the DROP rows.');
    process.exit(1);
  }

  console.log('\nDeleting duplicates...');
  let deleted = 0;
  for (const d of duplicates) {
    for (const drop of d.drop) {
      const res = await pbRequest(
        'DELETE',
        `/api/collections/config/records/${drop.id}`,
        undefined,
        token,
      );
      if (res.status !== 204 && res.status !== 200) {
        console.error(
          `  delete ${drop.id} failed (${res.status}): ${JSON.stringify(res.body)}`,
        );
        process.exit(2);
      }
      deleted++;
    }
  }
  console.log(`Deleted ${deleted} duplicate record(s). config is now clean.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
