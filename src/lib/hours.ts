import type { OperatingHours } from '@/core/types/adapter';

const DAY_ORDER: OperatingHours['day'][] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const DAY_LABEL_ES: Record<OperatingHours['day'], string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const JS_DAY_TO_KEY: OperatingHours['day'][] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

function isClosed(h: OperatingHours): boolean {
  return Boolean(h.closed) || h.open === h.close;
}

function rangeKey(h: OperatingHours): string {
  return isClosed(h) ? 'closed' : `${h.open}-${h.close}`;
}

export type HoursGroup =
  | { kind: 'open'; label: string; open: string; close: string }
  | { kind: 'closed'; label: string };

/**
 * Group consecutive days that share the same hours into a single label like
 * "Lunes — Viernes". Ordering is fixed Mon→Sun so display is deterministic.
 */
export function groupHours(hours: OperatingHours[]): HoursGroup[] {
  const byDay = new Map(hours.map((h) => [h.day, h]));
  const groups: HoursGroup[] = [];

  let i = 0;
  while (i < DAY_ORDER.length) {
    const dayKey = DAY_ORDER[i];
    const entry = byDay.get(dayKey);
    if (!entry) {
      i += 1;
      continue;
    }
    const key = rangeKey(entry);
    let j = i;
    while (j + 1 < DAY_ORDER.length) {
      const next = byDay.get(DAY_ORDER[j + 1]);
      if (!next || rangeKey(next) !== key) break;
      j += 1;
    }
    const startLabel = DAY_LABEL_ES[dayKey];
    const endLabel = DAY_LABEL_ES[DAY_ORDER[j]];
    const label = i === j ? startLabel : `${startLabel} — ${endLabel}`;

    if (isClosed(entry)) {
      groups.push({ kind: 'closed', label });
    } else {
      groups.push({ kind: 'open', label, open: entry.open, close: entry.close });
    }
    i = j + 1;
  }

  return groups;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map((s) => Number.parseInt(s, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Convert an instant to wall-clock fields (weekday + minutes-since-midnight)
 * in the target IANA timezone. Uses Intl.DateTimeFormat so DST transitions
 * are handled correctly without pulling a tz library.
 */
function wallClockIn(now: Date, timeZone: string): { day: OperatingHours['day']; minutes: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';

  const wkShort = get('weekday').toLowerCase();
  const map: Record<string, OperatingHours['day']> = {
    mon: 'monday',
    tue: 'tuesday',
    wed: 'wednesday',
    thu: 'thursday',
    fri: 'friday',
    sat: 'saturday',
    sun: 'sunday',
  };
  const day = map[wkShort] ?? JS_DAY_TO_KEY[now.getUTCDay()];

  const hourRaw = get('hour');
  const hour = hourRaw === '24' ? 0 : Number.parseInt(hourRaw, 10);
  const minute = Number.parseInt(get('minute'), 10);
  return { day, minutes: hour * 60 + minute };
}

export type OpenStatus =
  | { state: 'open'; closesAt: string }
  | { state: 'closing-soon'; closesAt: string; minutesLeft: number }
  | { state: 'closed'; nextOpenLabel: string; nextOpenAt: string };

/**
 * Pure status computation against a known instant. Caller controls `now` so
 * tests can pin time and skip mocking Date globally.
 */
export function computeOpenStatus(
  hours: OperatingHours[],
  now: Date,
  timeZone = 'Europe/Madrid',
): OpenStatus {
  const byDay = new Map(hours.map((h) => [h.day, h]));
  const { day: today, minutes } = wallClockIn(now, timeZone);
  const todayEntry = byDay.get(today);

  if (todayEntry && !isClosed(todayEntry)) {
    const openMin = timeToMinutes(todayEntry.open);
    const closeMin = timeToMinutes(todayEntry.close);
    if (minutes >= openMin && minutes < closeMin) {
      const minutesLeft = closeMin - minutes;
      if (minutesLeft <= 30) {
        return { state: 'closing-soon', closesAt: todayEntry.close, minutesLeft };
      }
      return { state: 'open', closesAt: todayEntry.close };
    }
  }

  // Find next open slot scanning today (later same-day) → next 7 days.
  const todayIdx = DAY_ORDER.indexOf(today);
  for (let offset = 0; offset < 8; offset += 1) {
    const dayKey = DAY_ORDER[(todayIdx + offset) % DAY_ORDER.length];
    const entry = byDay.get(dayKey);
    if (!entry || isClosed(entry)) continue;
    if (offset === 0 && minutes >= timeToMinutes(entry.open)) continue;

    const label =
      offset === 0
        ? 'hoy'
        : offset === 1
          ? 'mañana'
          : DAY_LABEL_ES[dayKey].toLowerCase();
    return { state: 'closed', nextOpenLabel: label, nextOpenAt: entry.open };
  }

  return { state: 'closed', nextOpenLabel: '', nextOpenAt: '' };
}
