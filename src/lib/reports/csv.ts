/**
 * CSV generation helpers — pure, no I/O.
 */

import type { Booking } from '@/types/pb';

export type CsvRow = {
  date: string;
  service: string;
  customer: string;
  baseAmount: number;
  iva: number;
  total: number;
};

/** Escapes a CSV field value. Wraps in quotes if it contains comma, quote, or newline. */
export function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Converts completed bookings to a flat array of CsvRow objects.
 * Customer name is included in the export (admin-only route, not public-facing).
 */
export function bookingsToCsvRows(bookings: Booking[]): CsvRow[] {
  return bookings
    .filter((b) => b.status === 'completed')
    .map((b) => {
      const base = b.base_amount ?? 0;
      const iva = base * (b.iva_rate ?? 0);
      return {
        date: b.scheduled_at.slice(0, 10),
        service: b.service_type || '',
        customer: b.customer_name || '',
        baseAmount: Math.round(base * 100) / 100,
        iva: Math.round(iva * 100) / 100,
        total: Math.round((base + iva) * 100) / 100,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Serialises CsvRow array to a CSV string with header. */
export function rowsToCsvString(rows: CsvRow[]): string {
  const header = ['Fecha', 'Servicio', 'Cliente', 'Base (sin IVA)', 'IVA', 'Total'].join(',');
  const lines = rows.map((r) =>
    [
      escapeCsv(r.date),
      escapeCsv(r.service),
      escapeCsv(r.customer),
      r.baseAmount.toFixed(2),
      r.iva.toFixed(2),
      r.total.toFixed(2),
    ].join(','),
  );
  return [header, ...lines].join('\n');
}
