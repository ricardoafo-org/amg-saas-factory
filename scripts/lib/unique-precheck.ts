/**
 * unique-precheck — pure helpers for `apply-schema.ts` defensive pre-check.
 *
 * Before issuing a PATCH that adds a UNIQUE INDEX to an existing collection,
 * the applier fetches the indexed columns from live PB and groups rows by
 * tuple. Any group with count > 1 means the new constraint would fail at
 * SQLite level (error 2067). Surfacing the conflict here gives an actionable
 * error instead of PB's buried `data.indexes.message`.
 *
 * Helpers are extracted so they can be unit-tested without a live PB.
 */

export interface ParsedUniqueIndex {
  columns: string[];
}

export interface DuplicateGroup {
  values: Record<string, unknown>;
  ids: string[];
}

/**
 * Extract the column list from a `CREATE UNIQUE INDEX ... ON table (col, ...)`
 * statement. Returns null if the statement is not a UNIQUE index or cannot be
 * parsed. Tolerates `IF NOT EXISTS` and quoted identifiers (`"col"`, `` `col` ``).
 */
export function parseUniqueIndexColumns(sql: string): ParsedUniqueIndex | null {
  const re =
    /CREATE\s+UNIQUE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?\S+\s+ON\s+\S+\s*\(\s*([^)]+?)\s*\)/i;
  const m = sql.match(re);
  if (!m) return null;
  const columns = m[1]
    .split(',')
    .map((c) => c.trim().replace(/^["`]|["`]$/g, ''))
    .filter(Boolean);
  if (columns.length === 0) return null;
  return { columns };
}

/**
 * Group records by the tuple of `columns` values and return groups with more
 * than one row. Records missing any of the columns (undefined value) are
 * skipped — a missing column cannot violate a UNIQUE constraint at SQLite
 * level since the row would not satisfy NOT NULL anyway.
 *
 * Values are stringified for the grouping key to coerce mixed types
 * consistently (e.g. number vs numeric string), matching SQLite's permissive
 * type affinity behaviour.
 */
export function findDuplicateTuples(
  records: Record<string, unknown>[],
  columns: string[],
): DuplicateGroup[] {
  const groups = new Map<string, DuplicateGroup>();
  for (const rec of records) {
    const id = typeof rec.id === 'string' ? rec.id : '';
    const values: Record<string, unknown> = {};
    let skip = false;
    for (const col of columns) {
      const v = rec[col];
      if (v === undefined) {
        skip = true;
        break;
      }
      values[col] = v;
    }
    if (skip) continue;
    const key = columns.map((c) => String(values[c] ?? '')).join('\u0001');
    const existing = groups.get(key);
    if (existing) {
      existing.ids.push(id);
    } else {
      groups.set(key, { values, ids: [id] });
    }
  }
  return [...groups.values()].filter((g) => g.ids.length > 1);
}
