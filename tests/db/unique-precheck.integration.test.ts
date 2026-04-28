// Pure-logic tests for scripts/lib/unique-precheck.ts. Lives under
// tests/db/*.integration.test.ts so the integration runner picks it up
// (the file is co-located with other DB-adjacent tests even though it
// does not need a live PB connection).

import { describe, it, expect } from 'vitest';
import {
  findDuplicateTuples,
  parseUniqueIndexColumns,
} from '../../scripts/lib/unique-precheck';

describe('parseUniqueIndexColumns', () => {
  it('parses a single-column UNIQUE index', () => {
    const sql = 'CREATE UNIQUE INDEX idx_x ON t (col1)';
    expect(parseUniqueIndexColumns(sql)).toEqual({ columns: ['col1'] });
  });

  it('parses a multi-column UNIQUE index', () => {
    const sql = 'CREATE UNIQUE INDEX idx_config_tenant_key ON config (tenant_id, key)';
    expect(parseUniqueIndexColumns(sql)).toEqual({
      columns: ['tenant_id', 'key'],
    });
  });

  it('tolerates IF NOT EXISTS', () => {
    const sql = 'CREATE UNIQUE INDEX IF NOT EXISTS idx_x ON t (a, b)';
    expect(parseUniqueIndexColumns(sql)).toEqual({ columns: ['a', 'b'] });
  });

  it('strips double-quote identifiers', () => {
    const sql = 'CREATE UNIQUE INDEX idx_x ON "t" ("col with space", "other")';
    expect(parseUniqueIndexColumns(sql)).toEqual({
      columns: ['col with space', 'other'],
    });
  });

  it('strips backtick identifiers', () => {
    const sql = 'CREATE UNIQUE INDEX idx_x ON t (`col1`, `col2`)';
    expect(parseUniqueIndexColumns(sql)).toEqual({ columns: ['col1', 'col2'] });
  });

  it('returns null for non-UNIQUE indexes', () => {
    const sql = 'CREATE INDEX idx_x ON t (col1)';
    expect(parseUniqueIndexColumns(sql)).toBeNull();
  });

  it('returns null for malformed SQL', () => {
    expect(parseUniqueIndexColumns('not even close')).toBeNull();
  });

  it('is case-insensitive on the keywords', () => {
    const sql = 'create unique index idx_x on t (col1)';
    expect(parseUniqueIndexColumns(sql)).toEqual({ columns: ['col1'] });
  });
});

describe('findDuplicateTuples', () => {
  const cols = ['tenant_id', 'key'];

  it('returns empty array when no duplicates', () => {
    const records = [
      { id: '1', tenant_id: 't1', key: 'a' },
      { id: '2', tenant_id: 't1', key: 'b' },
      { id: '3', tenant_id: 't2', key: 'a' },
    ];
    expect(findDuplicateTuples(records, cols)).toEqual([]);
  });

  it('groups duplicate (tenant_id, key) tuples', () => {
    const records = [
      { id: '1', tenant_id: 't1', key: 'iva_rate' },
      { id: '2', tenant_id: 't1', key: 'iva_rate' },
      { id: '3', tenant_id: 't1', key: 'iva_rate' },
    ];
    const dups = findDuplicateTuples(records, cols);
    expect(dups).toHaveLength(1);
    expect(dups[0].ids).toEqual(['1', '2', '3']);
    expect(dups[0].values).toEqual({ tenant_id: 't1', key: 'iva_rate' });
  });

  it('separates groups for distinct tuples', () => {
    const records = [
      { id: '1', tenant_id: 't1', key: 'a' },
      { id: '2', tenant_id: 't1', key: 'a' },
      { id: '3', tenant_id: 't2', key: 'b' },
      { id: '4', tenant_id: 't2', key: 'b' },
    ];
    const dups = findDuplicateTuples(records, cols);
    expect(dups).toHaveLength(2);
    expect(dups.map((g) => g.values)).toEqual(
      expect.arrayContaining([
        { tenant_id: 't1', key: 'a' },
        { tenant_id: 't2', key: 'b' },
      ]),
    );
  });

  it('skips records missing one of the columns', () => {
    const records = [
      { id: '1', tenant_id: 't1' }, // missing key
      { id: '2', tenant_id: 't1', key: 'a' },
      { id: '3', tenant_id: 't1', key: 'a' },
    ];
    const dups = findDuplicateTuples(records, cols);
    expect(dups).toHaveLength(1);
    expect(dups[0].ids).toEqual(['2', '3']);
  });

  it('treats null as a value, not missing', () => {
    const records = [
      { id: '1', tenant_id: 't1', key: null },
      { id: '2', tenant_id: 't1', key: null },
    ];
    const dups = findDuplicateTuples(records, cols);
    expect(dups).toHaveLength(1);
    expect(dups[0].ids).toEqual(['1', '2']);
  });

  it('coerces number/string values to the same group', () => {
    const records = [
      { id: '1', tenant_id: 't1', key: 1 },
      { id: '2', tenant_id: 't1', key: '1' },
    ];
    const dups = findDuplicateTuples(records, cols);
    expect(dups).toHaveLength(1);
  });

  it('handles a single column index', () => {
    const records = [
      { id: '1', tenant_id: 't1' },
      { id: '2', tenant_id: 't1' },
      { id: '3', tenant_id: 't2' },
    ];
    const dups = findDuplicateTuples(records, ['tenant_id']);
    expect(dups).toHaveLength(1);
    expect(dups[0].ids).toEqual(['1', '2']);
  });

  it('uses an empty id when record has no id field', () => {
    const records = [
      { tenant_id: 't1', key: 'a' },
      { tenant_id: 't1', key: 'a' },
    ];
    const dups = findDuplicateTuples(records, cols);
    expect(dups[0].ids).toEqual(['', '']);
  });
});
