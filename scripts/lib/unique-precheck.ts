/**
 * unique-precheck.ts — pure helpers for apply-schema's unique-index pre-check.
 *
 * The 2026-04-28 incident (BUG-017) was a UNIQUE INDEX request that
 * PocketBase refused because the existing data already contained duplicates.
 * The error came back as the cryptic SQLite code 2067 with no actionable
 * detail, and every CD run since has been red.
 *
 * These helpers let apply-schema.ts catch the conflict BEFORE asking PB to
 * create the index, and report it as "(tenant_id, key) duplicated 3x in 2
 * groups" — actionable instead of cryptic.
 */

export interface ParsedUniqueIndex {
  /** SQL-quoted column names (raw, untrimmed). */
  columns: string[];
}

/**
 * Parse a `CREATE UNIQUE INDEX ... ON <table> (col1, col2)` SQL string.
 * Returns null when the SQL is not a UNIQUE index declaration we recognize.
 *
 * Tolerant of whitespace, IF NOT EXISTS, quoted identifiers.
 */
export function parseUniqueIndexColumns(sql: string): ParsedUniqueIndex | null {
  // Match: CREATE UNIQUE INDEX [IF NOT EXISTS] name ON table (col, col, ...)
  const re = /CREATE\s+UNIQUE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?\S+\s+ON\s+\S+\s*\(\s*([^)]+?)\s*\)/i;
  const m = sql.match(re);
  if (!m) return null;
  const columns = m[1]
    .split(',')
    .map((c) => c.trim().replace(/^["`\[]|["`\]]$/g, ''))
    .filter((c) => c.length > 0);
  if (columns.length === 0) return null;
  return { columns };
}

export interface DuplicateGroup {
  tuple: string[];
  recordIds: string[];
}

/**
 * Group records by the values at `columns` and return only groups with >1 row.
 * Records missing any of the columns are skipped (treated as not-yet-set).
 */
export function findDuplicateTuples(
  records: ReadonlyArray<Record<string, unknown>>,
  columns: ReadonlyArray<string>,
): DuplicateGroup[] {
  const groups = new Map<string, { tuple: string[]; ids: string[] }>();
  for (const r of records) {
    const tuple: string[] = [];
    let skip = false;
    for (const col of columns) {
      const v = r[col];
      if (v === undefined || v === null || v === '') {
        skip = true;
        break;
      }
      tuple.push(String(v));
    }
    if (skip) continue;
    const k = tuple.join('\u0001');
    const existing = groups.get(k);
    const id = String((r as { id?: unknown }).id ?? '?');
    if (existing) {
      existing.ids.push(id);
    } else {
      groups.set(k, { tuple, ids: [id] });
    }
  }
  const dups: DuplicateGroup[] = [];
  for (const g of groups.values()) {
    if (g.ids.length > 1) {
      dups.push({ tuple: g.tuple, recordIds: g.ids });
    }
  }
  return dups;
}
