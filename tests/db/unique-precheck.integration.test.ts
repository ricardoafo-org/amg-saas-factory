// Pure-logic tests for the BUG-017 unique-index pre-check helpers.
// Named *.integration.test.ts so the integration vitest config picks it up
// (the unit suite is restricted to src/**). No external services touched.

import { describe, it, expect } from 'vitest';

import {
  findDuplicateTuples,
  parseUniqueIndexColumns,
} from '../../scripts/lib/unique-precheck';

describe('parseUniqueIndexColumns', () => {
  it('parses single-column UNIQUE index', () => {
    const r = parseUniqueIndexColumns('CREATE UNIQUE INDEX idx_x ON t (email)');
    expect(r).toEqual({ columns: ['email'] });
  });

  it('parses two-column UNIQUE index — the BUG-017 case', () => {
    const r = parseUniqueIndexColumns(
      'CREATE UNIQUE INDEX idx_config_tenant_key ON config (tenant_id, key)',
    );
    expect(r).toEqual({ columns: ['tenant_id', 'key'] });
  });

  it('handles IF NOT EXISTS', () => {
    const r = parseUniqueIndexColumns(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_x ON t (a, b, c)',
    );
    expect(r).toEqual({ columns: ['a', 'b', 'c'] });
  });

  it('strips quoted identifiers', () => {
    const r = parseUniqueIndexColumns(
      'CREATE UNIQUE INDEX idx_x ON t ("tenant_id", `key`)',
    );
    expect(r).toEqual({ columns: ['tenant_id', 'key'] });
  });

  it('returns null for non-UNIQUE indexes', () => {
    expect(parseUniqueIndexColumns('CREATE INDEX idx_x ON t (a)')).toBeNull();
  });

  it('returns null for unparseable SQL', () => {
    expect(parseUniqueIndexColumns('not a create-index statement')).toBeNull();
    expect(parseUniqueIndexColumns('')).toBeNull();
  });

  it('tolerates extra whitespace', () => {
    const r = parseUniqueIndexColumns(
      '  CREATE   UNIQUE   INDEX   idx_x   ON   t  (  a ,  b  )  ',
    );
    expect(r).toEqual({ columns: ['a', 'b'] });
  });
});

describe('findDuplicateTuples', () => {
  it('returns empty when all tuples are unique', () => {
    const records = [
      { id: 'r1', tenant_id: 't1', key: 'a' },
      { id: 'r2', tenant_id: 't1', key: 'b' },
      { id: 'r3', tenant_id: 't2', key: 'a' },
    ];
    expect(findDuplicateTuples(records, ['tenant_id', 'key'])).toEqual([]);
  });

  it('flags duplicate two-column tuples — the BUG-017 case', () => {
    const records = [
      { id: 'r1', tenant_id: 'talleres-amg', key: 'iva_rate' },
      { id: 'r2', tenant_id: 'talleres-amg', key: 'iva_rate' },
      { id: 'r3', tenant_id: 'talleres-amg', key: 'iva_rate' },
      { id: 'r4', tenant_id: 'talleres-amg', key: 'phone' },
    ];
    const dups = findDuplicateTuples(records, ['tenant_id', 'key']);
    expect(dups).toHaveLength(1);
    expect(dups[0].tuple).toEqual(['talleres-amg', 'iva_rate']);
    expect(dups[0].recordIds.sort()).toEqual(['r1', 'r2', 'r3']);
  });

  it('flags multiple independent duplicate groups', () => {
    const records = [
      { id: 'r1', tenant_id: 't1', key: 'a' },
      { id: 'r2', tenant_id: 't1', key: 'a' },
      { id: 'r3', tenant_id: 't2', key: 'b' },
      { id: 'r4', tenant_id: 't2', key: 'b' },
    ];
    const dups = findDuplicateTuples(records, ['tenant_id', 'key']);
    expect(dups).toHaveLength(2);
  });

  it('skips records missing any unique column (treated as not-yet-set)', () => {
    const records = [
      { id: 'r1', tenant_id: 't1', key: 'a' },
      { id: 'r2', tenant_id: 't1' }, // missing key
      { id: 'r3', tenant_id: 't1', key: '' }, // empty key
    ];
    expect(findDuplicateTuples(records, ['tenant_id', 'key'])).toEqual([]);
  });

  it('treats null and undefined as missing, not as a tuple value', () => {
    const records = [
      { id: 'r1', tenant_id: 't1', key: null },
      { id: 'r2', tenant_id: 't1', key: null },
    ];
    expect(findDuplicateTuples(records, ['tenant_id', 'key'])).toEqual([]);
  });

  it('coerces non-string values for tuple comparison', () => {
    const records = [
      { id: 'r1', tenant_id: 't1', priority: 1 },
      { id: 'r2', tenant_id: 't1', priority: 1 },
      { id: 'r3', tenant_id: 't1', priority: 2 },
    ];
    const dups = findDuplicateTuples(records, ['tenant_id', 'priority']);
    expect(dups).toHaveLength(1);
    expect(dups[0].tuple).toEqual(['t1', '1']);
  });
});
