import { describe, it, expect } from 'vitest';
import { groupHours, computeOpenStatus } from '../hours';
import type { OperatingHours } from '@/core/types/adapter';

const AMG_HOURS: OperatingHours[] = [
  { day: 'monday', open: '08:00', close: '18:00' },
  { day: 'tuesday', open: '08:00', close: '18:00' },
  { day: 'wednesday', open: '08:00', close: '18:00' },
  { day: 'thursday', open: '08:00', close: '18:00' },
  { day: 'friday', open: '08:00', close: '18:00' },
  { day: 'saturday', open: '09:00', close: '14:00' },
  { day: 'sunday', open: '00:00', close: '00:00', closed: true },
];

describe('groupHours', () => {
  it('collapses consecutive matching days into a range', () => {
    const groups = groupHours(AMG_HOURS);
    expect(groups).toEqual([
      { kind: 'open', label: 'Lunes — Viernes', open: '08:00', close: '18:00' },
      { kind: 'open', label: 'Sábado', open: '09:00', close: '14:00' },
      { kind: 'closed', label: 'Domingo' },
    ]);
  });

  it('does not merge across mismatched hours', () => {
    const groups = groupHours([
      { day: 'monday', open: '08:00', close: '18:00' },
      { day: 'tuesday', open: '09:00', close: '18:00' },
      { day: 'wednesday', open: '09:00', close: '18:00' },
    ]);
    expect(groups.map((g) => g.label)).toEqual(['Lunes', 'Martes — Miércoles']);
  });

  it('treats open === close as closed (defensive)', () => {
    const groups = groupHours([{ day: 'monday', open: '00:00', close: '00:00' }]);
    expect(groups).toEqual([{ kind: 'closed', label: 'Lunes' }]);
  });
});

// Time pinned via UTC; computeOpenStatus converts to Europe/Madrid wall clock.
// 2026-04-27 is a Monday; Madrid is UTC+2 (CEST) on that date.
const monday10MadridUtc = new Date('2026-04-27T08:00:00Z'); // 10:00 Madrid Mon
const monday17_45MadridUtc = new Date('2026-04-27T15:45:00Z'); // 17:45 Madrid Mon
const monday19_00MadridUtc = new Date('2026-04-27T17:00:00Z'); // 19:00 Madrid Mon (after close)
const monday07_30MadridUtc = new Date('2026-04-27T05:30:00Z'); // 07:30 Madrid Mon
const sunday12MadridUtc = new Date('2026-04-26T10:00:00Z'); // 12:00 Madrid Sun
const saturday14MadridUtc = new Date('2026-04-25T12:00:00Z'); // 14:00 Madrid Sat (just closed)

describe('computeOpenStatus', () => {
  it('reports open with closing time during business hours', () => {
    const status = computeOpenStatus(AMG_HOURS, monday10MadridUtc);
    expect(status).toEqual({ state: 'open', closesAt: '18:00' });
  });

  it('flags closing-soon in the last 30 minutes', () => {
    const status = computeOpenStatus(AMG_HOURS, monday17_45MadridUtc);
    expect(status.state).toBe('closing-soon');
    if (status.state === 'closing-soon') {
      expect(status.closesAt).toBe('18:00');
      expect(status.minutesLeft).toBe(15);
    }
  });

  it('reports closed and points to next opening (mañana) once past close', () => {
    const status = computeOpenStatus(AMG_HOURS, monday19_00MadridUtc);
    expect(status).toEqual({ state: 'closed', nextOpenLabel: 'mañana', nextOpenAt: '08:00' });
  });

  it('reports closed before opening time (same day = hoy)', () => {
    const status = computeOpenStatus(AMG_HOURS, monday07_30MadridUtc);
    expect(status).toEqual({ state: 'closed', nextOpenLabel: 'hoy', nextOpenAt: '08:00' });
  });

  it('skips closed days when picking next open slot', () => {
    const status = computeOpenStatus(AMG_HOURS, sunday12MadridUtc);
    expect(status.state).toBe('closed');
    if (status.state === 'closed') {
      expect(status.nextOpenLabel).toBe('mañana');
      expect(status.nextOpenAt).toBe('08:00');
    }
  });

  it('right at close time is closed, not open (boundary check)', () => {
    // Saturday closes at 14:00 — exactly 14:00 should already be closed.
    const status = computeOpenStatus(AMG_HOURS, saturday14MadridUtc);
    expect(status.state).toBe('closed');
  });
});
