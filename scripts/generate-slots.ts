/**
 * generate-slots.ts — pure helper to compute availability_slots for a date range.
 *
 * Used by seed-tenant.ts and (future) a slot-rolling cron. Pure function: given
 * inputs, returns a list of slot records ready to POST to PocketBase.
 *
 * Defaults match the 2026-04-26 manual-API seed pattern (8 weekday hourly slots,
 * 5 Saturday slots, no Sundays). Override via the OperatingHours[] argument.
 */

export interface OperatingDay {
  day:
    | 'sunday'
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday';
  open: string;
  close: string;
  closed?: boolean;
  /** Lunch / midday gap. Slots that start within [breakStart, breakEnd) are skipped. */
  breakStart?: string;
  breakEnd?: string;
}

export interface SlotRecord {
  tenant_id: string;
  service_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const DOW: OperatingDay['day'][] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export const DEFAULT_OPERATING_HOURS: OperatingDay[] = [
  { day: 'monday', open: '09:00', close: '18:00', breakStart: '14:00', breakEnd: '15:00' },
  { day: 'tuesday', open: '09:00', close: '18:00', breakStart: '14:00', breakEnd: '15:00' },
  { day: 'wednesday', open: '09:00', close: '18:00', breakStart: '14:00', breakEnd: '15:00' },
  { day: 'thursday', open: '09:00', close: '18:00', breakStart: '14:00', breakEnd: '15:00' },
  { day: 'friday', open: '09:00', close: '18:00', breakStart: '14:00', breakEnd: '15:00' },
  { day: 'saturday', open: '09:00', close: '14:00' },
  { day: 'sunday', open: '00:00', close: '00:00', closed: true },
];

function parseHM(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}

function fmtHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface GenerateSlotsOptions {
  tenantId: string;
  startDate: Date;
  /** Number of calendar days forward to generate (closed days are skipped). */
  days: number;
  /** Slot duration in minutes. Default 60. */
  slotMinutes?: number;
  /** Operating hours per day. Defaults to DEFAULT_OPERATING_HOURS. */
  operatingHours?: OperatingDay[];
  /** Defaults to '' (any service). */
  serviceId?: string;
}

/**
 * Generate availability_slots records for `days` calendar days starting at `startDate`.
 * Closed days are skipped. Within each open day, slots tile from `open` to `close` with
 * `slotMinutes` cadence; the optional break window is excluded.
 */
export function generateSlots(opts: GenerateSlotsOptions): SlotRecord[] {
  const slotMinutes = opts.slotMinutes ?? 60;
  const hours = opts.operatingHours ?? DEFAULT_OPERATING_HOURS;
  const byDay = new Map(hours.map((h) => [h.day, h]));
  const out: SlotRecord[] = [];

  const start = new Date(opts.startDate);
  start.setHours(0, 0, 0, 0);

  for (let i = 0; i < opts.days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dow = DOW[d.getDay()];
    const day = byDay.get(dow);
    if (!day || day.closed) continue;

    const open = parseHM(day.open);
    const close = parseHM(day.close);
    const breakStart = day.breakStart ? parseHM(day.breakStart) : null;
    const breakEnd = day.breakEnd ? parseHM(day.breakEnd) : null;

    for (let t = open; t + slotMinutes <= close; t += slotMinutes) {
      if (breakStart !== null && breakEnd !== null && t >= breakStart && t < breakEnd) {
        continue;
      }
      out.push({
        tenant_id: opts.tenantId,
        service_id: opts.serviceId ?? '',
        slot_date: fmtDate(d),
        start_time: fmtHM(t),
        end_time: fmtHM(t + slotMinutes),
        is_available: true,
      });
    }
  }

  return out;
}
