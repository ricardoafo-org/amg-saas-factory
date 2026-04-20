/**
 * Shared formatting utilities — no PII logged, no side effects.
 */

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/** Returns days until date (negative if past). */
export function daysUntil(iso: string): number {
  const target = new Date(iso);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** ITV urgency level for styling. */
export function itvUrgency(iso: string): 'expired' | 'soon' | 'ok' | 'unknown' {
  if (!iso) return 'unknown';
  const days = daysUntil(iso);
  if (isNaN(days)) return 'unknown';
  if (days < 0) return 'expired';
  if (days <= 30) return 'soon';
  return 'ok';
}
