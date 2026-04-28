#!/usr/bin/env tsx
/**
 * dedupe-config.ts — one-time deduplication for the `config` collection.
 *
 * Background: BUG-017. The live tst PB has duplicate `(tenant_id, key)` rows
 * predating the UNIQUE index added in `src/schemas/config.schema.json`. The
 * index cannot be created until duplicates are removed. This script keeps the
 * most-recently-`updated` row per tuple and deletes the rest.
 *
 * Idempotent: a clean DB exits 0 with "no duplicates found".
 *
 * Usage:
 *   tsx scripts/dedupe-config.ts                # DRY-RUN — reports, no writes
 *   tsx scripts/dedupe-config.ts --apply        # actually delete losers
 *
 * Env (same as apply-schema.ts):
 *   POCKETBASE_URL, PB_BOOTSTRAP_EMAIL, PB_BOOTSTRAP_PASSWORD
 *
 * Exit codes:
 *   0  no duplicates OR apply succeeded
 *   1  duplicates found in dry-run
 *   2  PB unreachable / auth failure / write error
 */

import { findDuplicateTuples } from './lib/unique-precheck';

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const EMAIL =
  process.env.PB_BOOTSTRAP_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const PASSWORD =
  process.env.PB_BOOTSTRAP_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;

const APPLY = process.argv.includes('--apply');

if (!EMAIL || !PASSWORD) {
  console.error(
    'Missing PB_BOOTSTRAP_EMAIL / PB_BOOTSTRAP_PASSWORD (or legacy POCKETBASE_ADMIN_*)',
  );
  process.exit(2);
}

interface ConfigRow {
  id: string;
  tenant_id: string;
  key: string;
  updated: string;
}

async function pbFetch<T>(
  method: 'GET' | 'POST' | 'DELETE',
  urlPath: string,
  token?: string,
): Promise<{ status: number; body: T }> {
  const res = await fetch(`${PB_URL}${urlPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, body: body as T };
}

async function main() {
  const authRes = await fetch(
    `${PB_URL}/api/collections/_superusers/auth-with-password`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: EMAIL, password: PASSWORD }),
    },
  );
  if (authRes.status !== 200) {
    console.error(`Auth failed (${authRes.status}). Check PB_BOOTSTRAP_* env.`);
    process.exit(2);
  }
  const { token } = (await authRes.json()) as { token: string };

  // Page through all config rows.
  const rows: ConfigRow[] = [];
  let page = 1;
  for (;;) {
    const r = await pbFetch<{ items: ConfigRow[]; totalPages: number }>(
      'GET',
      `/api/collections/config/records?perPage=500&page=${page}&fields=id,tenant_id,key,updated`,
      token,
    );
    if (r.status !== 200) {
      console.error(`List failed (${r.status})`);
      process.exit(2);
    }
    rows.push(...r.body.items);
    if (page >= r.body.totalPages) break;
    page++;
  } // end for(;;)

  console.log(`Loaded ${rows.length} config row(s).`);

  const groups = findDuplicateTuples(
    rows as unknown as Record<string, unknown>[],
    ['tenant_id', 'key'],
  );

  if (groups.length === 0) {
    console.log('No duplicates found. Nothing to do.');
    process.exit(0);
  }

  // For each duplicate group, keep the most-recently-`updated` row.
  const losers: string[] = [];
  for (const g of groups) {
    const groupRows = rows.filter(
      (r) => r.tenant_id === g.values.tenant_id && r.key === g.values.key,
    );
    groupRows.sort((a, b) => (a.updated < b.updated ? 1 : -1));
    const keeper = groupRows[0];
    const drops = groupRows.slice(1);
    console.log(
      `  ${JSON.stringify(g.values)} → keep ${keeper.id} (updated ${keeper.updated}), drop ${drops.length} loser(s): [${drops.map((d) => d.id).join(', ')}]`,
    );
    losers.push(...drops.map((d) => d.id));
  }

  console.log(
    `\n${groups.length} duplicate group(s); ${losers.length} loser row(s) total.`,
  );

  if (!APPLY) {
    console.log('Dry-run — no rows deleted. Re-run with --apply to mutate.');
    process.exit(1);
  }

  for (const id of losers) {
    const del = await pbFetch<unknown>('DELETE', `/api/collections/config/records/${id}`, token);
    if (del.status !== 204 && del.status !== 200) {
      console.error(`DELETE ${id} failed (${del.status})`);
      process.exit(2);
    }
    console.log(`  deleted ${id}`);
  }

  console.log(`\nDone. ${losers.length} row(s) deleted.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(2);
});
