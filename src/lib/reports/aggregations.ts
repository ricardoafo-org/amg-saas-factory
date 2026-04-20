/**
 * Pure aggregation helpers — operate on typed data arrays.
 * No PocketBase I/O here; tested in isolation.
 */

import type { Booking, Customer } from '@/types/pb';

export type DailyRevenue = {
  date: string; // YYYY-MM-DD
  base: number;
  iva: number;
  total: number;
};

export type ServiceRevenue = {
  service: string;
  total: number;
  percentage: number;
};

export type TopCustomer = {
  id: string;
  name: string;
  email: string;
  totalSpent: number;
  visits: number;
};

export type AppointmentVolume = {
  completed: number;
  cancelled: number;
  pending: number;
};

export type KpiSummary = {
  totalRevenue: number;
  totalBase: number;
  totalIva: number;
  appointmentCount: number;
  volume: AppointmentVolume;
};

/**
 * Aggregates bookings into daily revenue buckets.
 * Only includes bookings with status === 'completed'.
 */
export function aggregateDailyRevenue(bookings: Booking[]): DailyRevenue[] {
  const map = new Map<string, { base: number; iva: number }>();

  for (const b of bookings) {
    if (b.status !== 'completed') continue;
    const date = b.scheduled_at.slice(0, 10);
    const base = b.base_amount ?? 0;
    const iva = base * (b.iva_rate ?? 0);
    const existing = map.get(date) ?? { base: 0, iva: 0 };
    map.set(date, { base: existing.base + base, iva: existing.iva + iva });
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { base, iva }]) => ({
      date,
      base: round2(base),
      iva: round2(iva),
      total: round2(base + iva),
    }));
}

/**
 * Breaks down completed-booking revenue by service_type.
 */
export function aggregateServiceRevenue(bookings: Booking[]): ServiceRevenue[] {
  const map = new Map<string, number>();

  for (const b of bookings) {
    if (b.status !== 'completed') continue;
    const base = b.base_amount ?? 0;
    const iva = base * (b.iva_rate ?? 0);
    const total = base + iva;
    const key = b.service_type || 'Otros';
    map.set(key, (map.get(key) ?? 0) + total);
  }

  const grandTotal = Array.from(map.values()).reduce((s, v) => s + v, 0);

  return Array.from(map.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([service, total]) => ({
      service,
      total: round2(total),
      percentage: grandTotal > 0 ? round2((total / grandTotal) * 100) : 0,
    }));
}

/**
 * Returns top N customers sorted by total spent in the period.
 * Uses the Customer collection's total_spent field (pre-aggregated by PB).
 */
export function buildTopCustomers(customers: Customer[], limit = 10): TopCustomer[] {
  return customers
    .slice()
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, limit)
    .map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      totalSpent: round2(c.total_spent),
      visits: c.total_visits,
    }));
}

/**
 * Counts bookings by status.
 */
export function aggregateVolume(bookings: Booking[]): AppointmentVolume {
  let completed = 0;
  let cancelled = 0;
  let pending = 0;
  for (const b of bookings) {
    if (b.status === 'completed') completed++;
    else if (b.status === 'cancelled') cancelled++;
    else pending++;
  }
  return { completed, cancelled, pending };
}

/**
 * Computes KPI summary from a set of bookings.
 */
export function computeKpis(bookings: Booking[]): KpiSummary {
  let totalBase = 0;
  let totalIva = 0;

  for (const b of bookings) {
    if (b.status !== 'completed') continue;
    const base = b.base_amount ?? 0;
    totalBase += base;
    totalIva += base * (b.iva_rate ?? 0);
  }

  const totalRevenue = round2(totalBase + totalIva);

  return {
    totalRevenue,
    totalBase: round2(totalBase),
    totalIva: round2(totalIva),
    appointmentCount: bookings.length,
    volume: aggregateVolume(bookings),
  };
}

/** Formats a number as EUR with 2 decimal places, e.g. "1.234,56 €". */
export function formatEur(value: number): string {
  return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
