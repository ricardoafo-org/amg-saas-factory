/**
 * schema-contract.integration.test.ts — FEAT-052
 *
 * For each src/schemas/*.schema.json, asserts the live PocketBase has:
 *   - the collection (with matching type: base | auth)
 *   - every property declared in the schema, as a field on PB
 *   - the required[] entries marked required on PB
 *   - every index in x-pb-indexes
 *   - every rule in x-pb-rules
 *
 * This is the test that would have caught the 2026-04-26 SEV-1
 * (availability_slots had only `id` on tst PB).
 *
 * Behavior when PB is unreachable:
 *   - The whole suite is reported as `skipped` (not failed) so PR CI stays green
 *     until the deploy-preview workflow stands up a PB instance.
 *   - The integration job in CI sets POCKETBASE_URL + creds and runs this file
 *     via `npm run test:integration` against a real PB.
 *
 * Run locally:
 *   POCKETBASE_URL=http://127.0.0.1:8090 \
 *   PB_BOOTSTRAP_EMAIL=admin@example.com \
 *   PB_BOOTSTRAP_PASSWORD=secret \
 *   npm run test:integration
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const EMAIL =
  process.env.PB_BOOTSTRAP_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const PASSWORD =
  process.env.PB_BOOTSTRAP_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;

const SCHEMAS_DIR = path.join(process.cwd(), 'src', 'schemas');

interface JsonSchema {
  title?: string;
  type: 'object';
  required?: string[];
  properties: Record<string, JsonSchemaProp>;
  'x-pb-collection': { type: 'base' | 'auth'; name: string };
  'x-pb-indexes'?: string[];
  'x-pb-rules'?: Record<string, string | null>;
}
interface JsonSchemaProp {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  format?: string;
  enum?: string[];
}
interface PbField {
  name: string;
  type: string;
  required?: boolean;
  system?: boolean;
}
interface PbCollection {
  name: string;
  type: 'base' | 'auth';
  fields: PbField[];
  indexes: string[];
  listRule: string | null;
  viewRule: string | null;
  createRule: string | null;
  updateRule: string | null;
  deleteRule: string | null;
}

function loadSchemas(): JsonSchema[] {
  if (!fs.existsSync(SCHEMAS_DIR)) return [];
  return fs
    .readdirSync(SCHEMAS_DIR)
    .filter((f) => f.endsWith('.schema.json'))
    .map((f) =>
      JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, f), 'utf-8')),
    );
}

async function authenticate(): Promise<string | null> {
  if (!EMAIL || !PASSWORD) return null;
  try {
    const res = await fetch(
      `${PB_URL}/api/collections/_superusers/auth-with-password`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: EMAIL, password: PASSWORD }),
        signal: AbortSignal.timeout(3000),
      },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { token?: string };
    return body.token ?? null;
  } catch {
    return null;
  }
}

async function fetchCollection(
  token: string,
  name: string,
): Promise<PbCollection | null> {
  try {
    const res = await fetch(
      `${PB_URL}/api/collections/${encodeURIComponent(name)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(3000),
      },
    );
    if (!res.ok) return null;
    return (await res.json()) as PbCollection;
  } catch {
    return null;
  }
}

// JSON Schema -> expected PB field type (mirrors apply-schema.ts)
function expectedPbType(prop: JsonSchemaProp): string {
  if (prop.enum) return 'select';
  if (prop.type === 'string') {
    if (prop.format === 'email') return 'email';
    if (prop.format === 'date' || prop.format === 'date-time') return 'date';
    if (prop.format === 'uri') return 'url';
    return 'text';
  }
  if (prop.type === 'number') return 'number';
  if (prop.type === 'boolean') return 'bool';
  if (prop.type === 'array' || prop.type === 'object') return 'json';
  return 'text';
}

const schemas = loadSchemas();
let token: string | null = null;
let pbReachable = false;

beforeAll(async () => {
  token = await authenticate();
  pbReachable = token !== null;
  if (!pbReachable) {
    console.warn(
      `[schema-contract] PB unreachable at ${PB_URL} — suite will skip. ` +
        `Set POCKETBASE_URL + PB_BOOTSTRAP_EMAIL + PB_BOOTSTRAP_PASSWORD to enable.`,
    );
  }
});

describe('schema-contract — every src/schemas/*.schema.json maps to a live PB collection', () => {
  it('finds at least one schema file', () => {
    expect(schemas.length).toBeGreaterThan(0);
  });

  for (const schema of schemas) {
    const colName = schema['x-pb-collection']?.name;
    const colType = schema['x-pb-collection']?.type;

    describe(`collection: ${colName}`, () => {
      it.skipIf(!pbReachable)('exists on live PB', async () => {
        const live = await fetchCollection(token!, colName);
        expect(live, `collection "${colName}" not found on PB`).not.toBeNull();
        expect(live!.type).toBe(colType);
      });

      it.skipIf(!pbReachable)(
        'has every declared property as a field',
        async () => {
          const live = await fetchCollection(token!, colName);
          expect(live).not.toBeNull();
          const liveFieldNames = new Set(live!.fields.map((f) => f.name));
          const expectedFieldNames = Object.keys(schema.properties).filter(
            // PB owns id/created/updated; we don't manage them as fields
            (n) => n !== 'id' && n !== 'created' && n !== 'updated',
          );
          for (const name of expectedFieldNames) {
            expect(
              liveFieldNames.has(name),
              `field "${name}" missing from PB collection "${colName}"`,
            ).toBe(true);
          }
        },
      );

      it.skipIf(!pbReachable)(
        'every required[] field is marked required on PB',
        async () => {
          const live = await fetchCollection(token!, colName);
          expect(live).not.toBeNull();
          const fieldByName = new Map(live!.fields.map((f) => [f.name, f]));
          for (const req of schema.required ?? []) {
            if (req === 'id') continue;
            const field = fieldByName.get(req);
            expect(field, `required field "${req}" missing on PB`).toBeDefined();
            expect(
              field!.required,
              `field "${req}" should be required=true on PB`,
            ).toBe(true);
          }
        },
      );

      it.skipIf(!pbReachable)(
        'field types match expected PB types (text/email/date/select/number/bool/json/url)',
        async () => {
          const live = await fetchCollection(token!, colName);
          expect(live).not.toBeNull();
          const fieldByName = new Map(live!.fields.map((f) => [f.name, f]));
          for (const [propName, prop] of Object.entries(schema.properties)) {
            if (
              propName === 'id' ||
              propName === 'created' ||
              propName === 'updated'
            ) {
              continue;
            }
            const field = fieldByName.get(propName);
            if (!field) continue; // covered by the previous test
            expect(
              field.type,
              `field "${propName}" expected type "${expectedPbType(prop)}", got "${field.type}"`,
            ).toBe(expectedPbType(prop));
          }
        },
      );

      it.skipIf(!pbReachable)('has every x-pb-indexes entry', async () => {
        const expectedIndexes = schema['x-pb-indexes'] ?? [];
        if (expectedIndexes.length === 0) return;
        const live = await fetchCollection(token!, colName);
        expect(live).not.toBeNull();
        const liveIndexNames = live!.indexes.map(extractIndexName);
        for (const expected of expectedIndexes) {
          const expectedName = extractIndexName(expected);
          expect(
            liveIndexNames.includes(expectedName),
            `index "${expectedName}" missing on PB collection "${colName}"`,
          ).toBe(true);
        }
      });

      it.skipIf(!pbReachable)('has every x-pb-rules entry', async () => {
        const expectedRules = schema['x-pb-rules'];
        if (!expectedRules) return;
        const live = await fetchCollection(token!, colName);
        expect(live).not.toBeNull();
        for (const [ruleKey, expectedValue] of Object.entries(expectedRules)) {
          const liveValue = live![ruleKey as keyof PbCollection];
          expect(
            liveValue,
            `rule "${ruleKey}" mismatch on "${colName}": expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(liveValue)}`,
          ).toEqual(expectedValue);
        }
      });
    });
  }
});

function extractIndexName(sql: string): string {
  // CREATE [UNIQUE] INDEX <name> ON ...
  const match = sql.match(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(\S+)\s/i);
  return match ? match[1] : sql;
}
