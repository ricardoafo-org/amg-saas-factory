import { describe, it, expect } from 'vitest';
import {
  generateSlots,
  DEFAULT_OPERATING_HOURS,
} from '../../../scripts/generate-slots';

describe('generateSlots', () => {
  it('produces 8 hourly slots on a default weekday (9-18 minus 14-15 break)', () => {
    const monday = new Date('2026-05-04T00:00:00');
    const slots = generateSlots({
      tenantId: 't1',
      startDate: monday,
      days: 1,
    });
    expect(slots).toHaveLength(8);
    expect(slots.map((s) => s.start_time)).toEqual([
      '09:00',
      '10:00',
      '11:00',
      '12:00',
      '13:00',
      '15:00',
      '16:00',
      '17:00',
    ]);
    expect(slots.every((s) => s.tenant_id === 't1')).toBe(true);
    expect(slots.every((s) => s.is_available === true)).toBe(true);
    expect(slots[0]).toMatchObject({
      slot_date: '2026-05-04',
      start_time: '09:00',
      end_time: '10:00',
    });
  });

  it('skips Sundays', () => {
    const sunday = new Date('2026-05-03T00:00:00');
    const slots = generateSlots({
      tenantId: 't1',
      startDate: sunday,
      days: 1,
    });
    expect(slots).toHaveLength(0);
  });

  it('produces 5 Saturday slots on default config', () => {
    const saturday = new Date('2026-05-02T00:00:00');
    const slots = generateSlots({
      tenantId: 't1',
      startDate: saturday,
      days: 1,
    });
    expect(slots.map((s) => s.start_time)).toEqual([
      '09:00',
      '10:00',
      '11:00',
      '12:00',
      '13:00',
    ]);
  });

  it('produces 90 slots over 14 days from a Monday with default hours', () => {
    const monday = new Date('2026-05-04T00:00:00');
    const slots = generateSlots({
      tenantId: 't1',
      startDate: monday,
      days: 14,
    });
    expect(slots.length).toBe(90);
  });

  it('respects custom slotMinutes', () => {
    const monday = new Date('2026-05-04T00:00:00');
    const slots = generateSlots({
      tenantId: 't1',
      startDate: monday,
      days: 1,
      slotMinutes: 30,
      operatingHours: [
        { day: 'monday', open: '09:00', close: '11:00' },
      ],
    });
    expect(slots.map((s) => `${s.start_time}-${s.end_time}`)).toEqual([
      '09:00-09:30',
      '09:30-10:00',
      '10:00-10:30',
      '10:30-11:00',
    ]);
  });

  it('skips slots that fall inside the break window', () => {
    const monday = new Date('2026-05-04T00:00:00');
    const slots = generateSlots({
      tenantId: 't1',
      startDate: monday,
      days: 1,
      operatingHours: [
        {
          day: 'monday',
          open: '09:00',
          close: '13:00',
          breakStart: '11:00',
          breakEnd: '12:00',
        },
      ],
    });
    expect(slots.map((s) => s.start_time)).toEqual([
      '09:00',
      '10:00',
      '12:00',
    ]);
  });

  it('default operating hours include all 7 weekday entries', () => {
    expect(DEFAULT_OPERATING_HOURS).toHaveLength(7);
  });
});
