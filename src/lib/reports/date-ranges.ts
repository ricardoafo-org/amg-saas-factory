/**
 * Pure date-range helpers for the reports page.
 * No I/O — safe to test without PocketBase.
 */

export type RangeKey = '7d' | '30d' | 'this_month' | 'last_month';

export type DateRange = {
  from: Date;
  to: Date;
  label: string;
};

/** Returns a { from, to } range for the given key relative to `now`. */
export function resolveDateRange(range: RangeKey, now: Date = new Date()): DateRange {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (range) {
    case '7d': {
      const from = new Date(start);
      from.setDate(from.getDate() - 6);
      return { from, to: now, label: 'Últimos 7 días' };
    }
    case '30d': {
      const from = new Date(start);
      from.setDate(from.getDate() - 29);
      return { from, to: now, label: 'Últimos 30 días' };
    }
    case 'this_month': {
      const from = new Date(start.getFullYear(), start.getMonth(), 1);
      const to = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
      return { from, to, label: 'Este mes' };
    }
    case 'last_month': {
      const from = new Date(start.getFullYear(), start.getMonth() - 1, 1);
      const to = new Date(start.getFullYear(), start.getMonth(), 0, 23, 59, 59, 999);
      return { from, to, label: 'Mes anterior' };
    }
  }
}

/** Formats a Date as YYYY-MM-DD for PocketBase filter strings. */
export function toPbDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Formats a Date as a readable Spanish day label: "lun 14". */
export function toShortDayLabel(d: Date): string {
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
}

/** Validates that a string is a known RangeKey; returns the default if not. */
export function parseRangeKey(value: string | undefined, fallback: RangeKey = '30d'): RangeKey {
  if (value === '7d' || value === '30d' || value === 'this_month' || value === 'last_month') {
    return value;
  }
  return fallback;
}
