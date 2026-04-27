#!/usr/bin/env tsx
/**
 * apply-schema.ts — idempotent PocketBase schema application
 *
 * Reads every src/schemas/*.schema.json, diffs against the live PocketBase
 * instance, and applies field/index/rule changes. Replaces db-setup.js
 * (one-shot setup) and migrations-apply.js (env-locked migration files).
 *
 * Usage:
 *   tsx scripts/apply-schema.ts                # diff + apply additive changes
 *   tsx scripts/apply-schema.ts --dry-run      # diff only, no writes
 *   tsx scripts/apply-schema.ts --allow-destructive
 *                                              # allow field/collection deletions
 *
 * Env:
 *   POCKETBASE_URL                  default http://127.0.0.1:8090
 *   PB_BOOTSTRAP_EMAIL              superuser email (preferred)
 *   PB_BOOTSTRAP_PASSWORD           superuser password (preferred)
 *   POCKETBASE_ADMIN_EMAIL          fallback (legacy)
 *   POCKETBASE_ADMIN_PASSWORD       fallback (legacy)
 *
 * Exit codes:
 *   0  in sync OR additive changes applied
 *   1  destructive changes required without --allow-destructive
 *   2  PB unreachable / auth failure / write error
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const EMAIL =
  process.env.PB_BOOTSTRAP_EMAIL ||
  process.env.POCKETBASE_ADMIN_EMAIL;
const PASSWORD =
  process.env.PB_BOOTSTRAP_PASSWORD ||
  process.env.POCKETBASE_ADMIN_PASSWORD;

const SCHEMAS_DIR = path.join(process.cwd(), 'src', 'schemas');

const ARGS = new Set(process.argv.slice(2));
const DRY_RUN = ARGS.has('--dry-run');
const ALLOW_DESTRUCTIVE = ARGS.has('--allow-destructive');

if (!EMAIL || !PASSWORD) {
  console.error(
    'Missing PB_BOOTSTRAP_EMAIL / PB_BOOTSTRAP_PASSWORD (or legacy POCKETBASE_ADMIN_*)',
  );
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JsonSchema {
  title?: string;
  description?: string;
  type: 'object';
  required?: string[];
  properties: Record<string, JsonSchemaProp>;
  'x-pb-collection': {
    type: 'base' | 'auth';
    name: string;
    auth?: {
      allowEmailAuth?: boolean;
      allowOAuth2Auth?: boolean;
      allowUsernameAuth?: boolean;
      requireEmail?: boolean;
      minPasswordLength?: number;
      identityFields?: string[];
    };
  };
  'x-pb-indexes'?: string[];
  'x-pb-rules'?: {
    listRule?: string | null;
    viewRule?: string | null;
    createRule?: string | null;
    updateRule?: string | null;
    deleteRule?: string | null;
  };
}

interface JsonSchemaProp {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  format?: 'email' | 'date' | 'date-time' | 'uri';
  enum?: string[];
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  items?: { type?: string };
  description?: string;
  'x-pb-field'?: Partial<PbField>;
}

interface PbField {
  id?: string;
  name: string;
  type: string;
  required?: boolean;
  presentable?: boolean;
  system?: boolean;
  hidden?: boolean;
  // type-specific options live at the top level in PB 0.23+
  min?: number | null;
  max?: number | null;
  pattern?: string;
  values?: string[];
  maxSelect?: number;
  onlyDomains?: string[] | null;
  exceptDomains?: string[] | null;
  autogeneratePattern?: string;
  primaryKey?: boolean;
}

interface PbCollection {
  id?: string;
  name: string;
  type: 'base' | 'auth';
  fields: PbField[];
  indexes: string[];
  listRule: string | null;
  viewRule: string | null;
  createRule: string | null;
  updateRule: string | null;
  deleteRule: string | null;
  // Auth options (PB 0.23+ moved these onto the collection itself)
  passwordAuth?: { enabled: boolean; identityFields?: string[] };
  emailAuth?: { enabled: boolean; identityFields?: string[] };
  oauth2?: { enabled: boolean };
  authToken?: { duration: number };
  passwordResetToken?: { duration: number };
  emailChangeToken?: { duration: number };
  verificationToken?: { duration: number };
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function pbRequest<T = unknown>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
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

// ---------------------------------------------------------------------------
// JSON Schema -> PB field mapping
// ---------------------------------------------------------------------------

function inferPbField(
  name: string,
  prop: JsonSchemaProp,
  required: boolean,
): PbField {
  const override = prop['x-pb-field'] || {};
  const base: PbField = { name, type: 'text' };

  if (prop.enum) {
    base.type = 'select';
    base.values = prop.enum;
    base.maxSelect = 1;
  } else if (prop.type === 'string') {
    if (prop.format === 'email') base.type = 'email';
    else if (prop.format === 'date' || prop.format === 'date-time')
      base.type = 'date';
    else if (prop.format === 'uri') base.type = 'url';
    else base.type = 'text';
    if (prop.pattern) base.pattern = prop.pattern;
    if (prop.minLength !== undefined && base.type === 'text')
      base.min = prop.minLength;
    if (prop.maxLength !== undefined && base.type === 'text')
      base.max = prop.maxLength;
  } else if (prop.type === 'number') {
    base.type = 'number';
    if (prop.minimum !== undefined) base.min = prop.minimum;
    if (prop.maximum !== undefined) base.max = prop.maximum;
  } else if (prop.type === 'boolean') {
    base.type = 'bool';
  } else if (prop.type === 'array' || prop.type === 'object') {
    base.type = 'json';
  }

  base.required = required;
  return { ...base, ...override };
}

function buildDesiredFields(schema: JsonSchema): PbField[] {
  const required = new Set(schema.required || []);
  const fields: PbField[] = [];
  for (const [name, prop] of Object.entries(schema.properties)) {
    if (name === 'id' || name === 'created' || name === 'updated') continue;
    if (schema['x-pb-collection'].type === 'auth' && name === 'email') continue;
    fields.push(inferPbField(name, prop, required.has(name)));
  }
  return fields;
}

// ---------------------------------------------------------------------------
// Diff
// ---------------------------------------------------------------------------

interface FieldDiff {
  kind: 'add' | 'update' | 'delete';
  field: PbField;
  reason?: string;
}

interface CollectionDiff {
  name: string;
  exists: boolean;
  fieldDiffs: FieldDiff[];
  indexDiffs: { add: string[]; remove: string[] };
  ruleDiffs: Partial<Record<keyof PbCollection, string | null>>;
}

function fieldsEquivalent(a: PbField, b: PbField): boolean {
  if (a.type !== b.type) return false;
  if (Boolean(a.required) !== Boolean(b.required)) return false;
  if (a.type === 'select') {
    const av = (a.values || []).slice().sort().join(',');
    const bv = (b.values || []).slice().sort().join(',');
    if (av !== bv) return false;
    if ((a.maxSelect || 1) !== (b.maxSelect || 1)) return false;
  }
  return true;
}

function diffCollection(
  schema: JsonSchema,
  pbCol: PbCollection | undefined,
): CollectionDiff {
  const desired = buildDesiredFields(schema);
  const fieldDiffs: FieldDiff[] = [];

  if (!pbCol) {
    return {
      name: schema['x-pb-collection'].name,
      exists: false,
      fieldDiffs: desired.map((f) => ({ kind: 'add' as const, field: f })),
      indexDiffs: { add: schema['x-pb-indexes'] || [], remove: [] },
      ruleDiffs: { ...(schema['x-pb-rules'] || {}) },
    };
  }

  const live = new Map(
    (pbCol.fields || []).filter((f) => !f.system).map((f) => [f.name, f]),
  );

  for (const want of desired) {
    const have = live.get(want.name);
    if (!have) {
      fieldDiffs.push({ kind: 'add', field: want });
    } else if (!fieldsEquivalent(have, want)) {
      fieldDiffs.push({
        kind: 'update',
        field: { ...want, id: have.id },
        reason: `type/required mismatch (live=${have.type}, want=${want.type})`,
      });
    }
    live.delete(want.name);
  }

  for (const stale of live.values()) {
    fieldDiffs.push({ kind: 'delete', field: stale });
  }

  const liveIdx = new Set(pbCol.indexes || []);
  const wantIdx = new Set(schema['x-pb-indexes'] || []);
  const addIdx = [...wantIdx].filter((i) => !liveIdx.has(i));
  const removeIdx = [...liveIdx].filter((i) => !wantIdx.has(i));

  const ruleDiffs: CollectionDiff['ruleDiffs'] = {};
  const rules = schema['x-pb-rules'] || {};
  for (const k of [
    'listRule',
    'viewRule',
    'createRule',
    'updateRule',
    'deleteRule',
  ] as const) {
    const want = rules[k] ?? null;
    const have = pbCol[k] ?? null;
    if (want !== have) ruleDiffs[k] = want;
  }

  return {
    name: schema['x-pb-collection'].name,
    exists: true,
    fieldDiffs,
    indexDiffs: { add: addIdx, remove: removeIdx },
    ruleDiffs,
  };
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

function buildAuthOptions(schema: JsonSchema): Partial<PbCollection> {
  if (schema['x-pb-collection'].type !== 'auth') return {};
  const auth = schema['x-pb-collection'].auth || {};
  return {
    passwordAuth: {
      enabled: auth.allowEmailAuth ?? true,
      identityFields: auth.identityFields ?? ['email'],
    },
    oauth2: { enabled: auth.allowOAuth2Auth ?? false },
  };
}

async function createCollection(
  schema: JsonSchema,
  diff: CollectionDiff,
  token: string,
): Promise<void> {
  const desired = buildDesiredFields(schema);
  const payload: Partial<PbCollection> = {
    name: schema['x-pb-collection'].name,
    type: schema['x-pb-collection'].type,
    fields: desired,
    indexes: schema['x-pb-indexes'] || [],
    listRule: schema['x-pb-rules']?.listRule ?? null,
    viewRule: schema['x-pb-rules']?.viewRule ?? null,
    createRule: schema['x-pb-rules']?.createRule ?? null,
    updateRule: schema['x-pb-rules']?.updateRule ?? null,
    deleteRule: schema['x-pb-rules']?.deleteRule ?? null,
    ...buildAuthOptions(schema),
  };
  const res = await pbRequest('POST', '/api/collections', payload, token);
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(
      `create ${diff.name} failed (${res.status}): ${JSON.stringify(res.body)}`,
    );
  }
}

async function updateCollection(
  schema: JsonSchema,
  diff: CollectionDiff,
  pbCol: PbCollection,
  token: string,
): Promise<void> {
  // Build merged field list. PB 0.23+ PATCH /api/collections/:id replaces fields
  // wholesale, so we send the full desired list (preserving live ids on updates).
  const desired = buildDesiredFields(schema);
  const liveById = new Map((pbCol.fields || []).map((f) => [f.name, f]));
  const merged: PbField[] = [
    ...(pbCol.fields || []).filter((f) => f.system),
    ...desired.map((d) => {
      const live = liveById.get(d.name);
      return live?.id ? { ...d, id: live.id } : d;
    }),
  ];

  const payload: Partial<PbCollection> = {
    fields: merged,
    indexes: schema['x-pb-indexes'] || [],
    listRule: schema['x-pb-rules']?.listRule ?? null,
    viewRule: schema['x-pb-rules']?.viewRule ?? null,
    createRule: schema['x-pb-rules']?.createRule ?? null,
    updateRule: schema['x-pb-rules']?.updateRule ?? null,
    deleteRule: schema['x-pb-rules']?.deleteRule ?? null,
    ...buildAuthOptions(schema),
  };

  const res = await pbRequest(
    'PATCH',
    `/api/collections/${pbCol.id}`,
    payload,
    token,
  );
  if (res.status !== 200) {
    throw new Error(
      `update ${diff.name} failed (${res.status}): ${JSON.stringify(res.body)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!fs.existsSync(SCHEMAS_DIR)) {
    console.error(`No schemas directory at ${SCHEMAS_DIR}`);
    process.exit(2);
  }

  // Auth as superuser
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

  // Snapshot live collections
  const live = await pbRequest<{ items: PbCollection[] }>(
    'GET',
    '/api/collections?perPage=500',
    undefined,
    token,
  );
  if (live.status !== 200) {
    console.error(`List collections failed (${live.status})`);
    process.exit(2);
  }
  const liveByName = new Map(live.body.items.map((c) => [c.name, c]));

  // Load all schemas
  const files = fs
    .readdirSync(SCHEMAS_DIR)
    .filter((f) => f.endsWith('.schema.json'))
    .sort();

  const diffs: { schema: JsonSchema; diff: CollectionDiff }[] = [];
  for (const file of files) {
    const schema = JSON.parse(
      fs.readFileSync(path.join(SCHEMAS_DIR, file), 'utf8'),
    ) as JsonSchema;
    const pbCol = liveByName.get(schema['x-pb-collection'].name);
    diffs.push({ schema, diff: diffCollection(schema, pbCol) });
  }

  // Report
  let drifts = 0;
  let destructive = 0;
  for (const { diff } of diffs) {
    const lines: string[] = [];
    if (!diff.exists) {
      lines.push(`  CREATE collection`);
      drifts++;
    }
    for (const fd of diff.fieldDiffs) {
      if (fd.kind === 'add') lines.push(`  + field ${fd.field.name} (${fd.field.type})`);
      else if (fd.kind === 'update')
        lines.push(`  ~ field ${fd.field.name} (${fd.reason})`);
      else {
        lines.push(`  - field ${fd.field.name} (DESTRUCTIVE)`);
        destructive++;
      }
      drifts++;
    }
    for (const idx of diff.indexDiffs.add) {
      lines.push(`  + index ${idx.split(' ON ')[0]}`);
      drifts++;
    }
    for (const idx of diff.indexDiffs.remove) {
      lines.push(`  - index ${idx.split(' ON ')[0]} (DESTRUCTIVE)`);
      destructive++;
      drifts++;
    }
    for (const k of Object.keys(diff.ruleDiffs)) {
      lines.push(`  ~ ${k} -> ${JSON.stringify(diff.ruleDiffs[k as keyof PbCollection])}`);
      drifts++;
    }
    if (lines.length > 0) {
      console.log(`\n[${diff.name}]`);
      for (const l of lines) console.log(l);
    } else {
      console.log(`OK ${diff.name}`);
    }
  }

  console.log(`\nSummary: ${drifts} drift(s), ${destructive} destructive.`);

  if (destructive > 0 && !ALLOW_DESTRUCTIVE) {
    console.error('Refusing to apply destructive changes. Re-run with --allow-destructive.');
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log('Dry run — no changes applied.');
    process.exit(drifts > 0 ? 0 : 0);
  }

  if (drifts === 0) {
    console.log('Schema in sync.');
    process.exit(0);
  }

  // Apply
  for (const { schema, diff } of diffs) {
    if (!diff.exists) {
      console.log(`Creating ${diff.name}...`);
      await createCollection(schema, diff, token);
    } else if (
      diff.fieldDiffs.length > 0 ||
      diff.indexDiffs.add.length > 0 ||
      diff.indexDiffs.remove.length > 0 ||
      Object.keys(diff.ruleDiffs).length > 0
    ) {
      const pbCol = liveByName.get(schema['x-pb-collection'].name);
      if (!pbCol) continue;
      console.log(`Updating ${diff.name}...`);
      await updateCollection(schema, diff, pbCol, token);
    }
  }

  console.log('Apply complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
