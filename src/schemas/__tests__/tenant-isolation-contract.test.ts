// SEV-1: Security axis rows S1 (cross-tenant PII leak) and S2 (tenant-isolation IDOR).
//
// Static contract test over src/schemas/*.schema.json. Asserts every collection
// encodes the security invariants AT THE SCHEMA LEVEL — so regressions show up
// in unit CI, not in production.
//
// What this enforces:
//
// 1. Every collection that has a `tenant_id` property MUST list it as required.
//    A tenant-aware row missing tenant_id is the BUG-015 anti-pattern.
//
// 2. listRule / viewRule on tenant-aware collections must EITHER:
//    - be null (server-action-only, safer than open access), OR
//    - scope by `@request.auth.tenant_id`, OR
//    - for auth collections, scope by `id = @request.auth.id` (own-row only,
//      even more restrictive than tenant)
//
// 3. createRule / deleteRule MUST be null for every collection. Per ADR-014,
//    writes go through Server Actions only — direct REST writes are forbidden.
//    updateRule may be `id = @request.auth.id` on auth collections (PB owns the
//    password-change / email-change flows for that pattern).

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const SCHEMAS_DIR = join(__dirname, '..');

interface Schema {
  title?: string;
  required?: string[];
  properties: Record<string, { type?: string }>;
  'x-pb-collection': { type: 'base' | 'auth'; name: string };
  'x-pb-rules'?: {
    listRule?: string | null;
    viewRule?: string | null;
    createRule?: string | null;
    updateRule?: string | null;
    deleteRule?: string | null;
  };
}

function loadSchemas(): Array<{ file: string; schema: Schema }> {
  return readdirSync(SCHEMAS_DIR)
    .filter((f) => f.endsWith('.schema.json'))
    .map((f) => ({
      file: f,
      schema: JSON.parse(
        readFileSync(join(SCHEMAS_DIR, f), 'utf-8'),
      ) as Schema,
    }));
}

const schemas = loadSchemas();
const tenantAware = schemas.filter(
  ({ schema }) => 'tenant_id' in (schema.properties ?? {}),
);

const TENANT_RULE = /tenant_id\s*=\s*@request\.auth\.tenant_id/;
const SELF_RULE = /id\s*=\s*@request\.auth\.id/;

function isAcceptableReadRule(
  rule: string | null | undefined,
  collectionType: 'base' | 'auth',
): { ok: boolean; reason: string } {
  if (rule === null || rule === undefined) {
    return { ok: true, reason: 'null rule — server-action-only via superuser' };
  }
  if (TENANT_RULE.test(rule)) {
    return { ok: true, reason: 'scoped by @request.auth.tenant_id' };
  }
  if (collectionType === 'auth' && SELF_RULE.test(rule)) {
    return { ok: true, reason: 'auth collection scoped by id = @request.auth.id (own-row)' };
  }
  return {
    ok: false,
    reason: `rule "${rule}" must be null, scope by tenant_id, or (auth collections only) scope by id`,
  };
}

describe('schema contract — every collection', () => {
  it('loads at least one schema', () => {
    expect(schemas.length).toBeGreaterThan(0);
  });

  it.each(schemas)(
    '$file declares x-pb-collection.name and x-pb-collection.type',
    ({ schema }) => {
      expect(schema['x-pb-collection']).toBeDefined();
      expect(schema['x-pb-collection'].name).toBeTruthy();
      expect(['base', 'auth']).toContain(schema['x-pb-collection'].type);
    },
  );
});

describe('tenant isolation contract — collections with tenant_id', () => {
  it('finds at least one tenant-aware collection', () => {
    expect(tenantAware.length).toBeGreaterThan(0);
  });

  it.each(tenantAware)(
    '$file marks tenant_id as required (S1/S2: every row carries a tenant)',
    ({ schema }) => {
      expect(
        schema.required?.includes('tenant_id'),
        `tenant_id missing from required[]; rows without tenant scope are an S1 leak surface`,
      ).toBe(true);
    },
  );

  it.each(tenantAware)(
    '$file listRule is null OR scoped by tenant_id (or self for auth)',
    ({ file, schema }) => {
      const colType = schema['x-pb-collection'].type;
      const rule = schema['x-pb-rules']?.listRule;
      const verdict = isAcceptableReadRule(rule, colType);
      expect(verdict.ok, `${file}: listRule rejected — ${verdict.reason}`).toBe(true);
    },
  );

  it.each(tenantAware)(
    '$file viewRule is null OR scoped by tenant_id (or self for auth)',
    ({ file, schema }) => {
      const colType = schema['x-pb-collection'].type;
      const rule = schema['x-pb-rules']?.viewRule;
      const verdict = isAcceptableReadRule(rule, colType);
      expect(verdict.ok, `${file}: viewRule rejected — ${verdict.reason}`).toBe(true);
    },
  );
});

describe('write-path hardening — every collection (ADR-014)', () => {
  it.each(schemas)(
    '$file createRule is null (writes go through Server Actions)',
    ({ file, schema }) => {
      const rules = schema['x-pb-rules'];
      if (!rules) return;
      expect(
        rules.createRule,
        `${file}: open createRule violates ADR-014 — writes must flow through src/actions/**`,
      ).toBeNull();
    },
  );

  it.each(schemas)(
    '$file deleteRule is null (deletes go through Server Actions)',
    ({ file, schema }) => {
      const rules = schema['x-pb-rules'];
      if (!rules) return;
      expect(
        rules.deleteRule,
        `${file}: open deleteRule violates ADR-014`,
      ).toBeNull();
    },
  );

  it.each(schemas)(
    '$file updateRule is null OR own-row only on auth collections',
    ({ file, schema }) => {
      const rules = schema['x-pb-rules'];
      if (!rules) return;
      const colType = schema['x-pb-collection'].type;
      const rule = rules.updateRule;
      if (rule === null || rule === undefined) return;
      expect(
        colType,
        `${file}: non-null updateRule only allowed on auth collections, got base`,
      ).toBe('auth');
      expect(
        rule,
        `${file}: auth updateRule must be exactly "id = @request.auth.id"`,
      ).toMatch(SELF_RULE);
    },
  );
});

describe('public read carve-outs (documented exceptions)', () => {
  // availability_slots: the public booking flow needs unauthenticated SELECT.
  // Rule must still bind by tenant_id; an OR clause for the unauthenticated
  // case is acceptable. This is a documented exception, not a leak surface.
  it('availability_slots binds by tenant_id even when allowing unauthenticated read', () => {
    const slots = schemas.find(
      ({ schema }) => schema['x-pb-collection'].name === 'availability_slots',
    );
    expect(slots, 'availability_slots schema not found').toBeDefined();
    const listRule = slots!.schema['x-pb-rules']?.listRule;
    expect(listRule).toBeTruthy();
    expect(listRule).toMatch(TENANT_RULE);
  });
});
