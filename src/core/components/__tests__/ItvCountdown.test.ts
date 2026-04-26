import { describe, it, expect } from 'vitest';
import { getItvDisplayState } from '../ItvCountdown';

/**
 * Audit row I2 regression: pure helper that decides which UI branch the
 * ItvCountdown renders. Negative `days` MUST resolve to an `expired` state
 * with `daysOverdue >= 0`, never a negative-number tween in the UI.
 */

const NOW = new Date('2026-04-26T12:00:00Z');

describe('getItvDisplayState — I2 expired branch', () => {
  it('returns "none" for empty input', () => {
    expect(getItvDisplayState('', NOW)).toEqual({ kind: 'none' });
  });

  it('returns "none" for malformed dates (defensive)', () => {
    expect(getItvDisplayState('not-a-date', NOW)).toEqual({ kind: 'none' });
  });

  it('returns "expired" with positive daysOverdue when last ITV was > 2 years ago', () => {
    const twoYearsAndOneMonth = '2024-03-26'; // +2y → 2026-03-26, ~31 days before NOW
    const result = getItvDisplayState(twoYearsAndOneMonth, NOW);
    expect(result.kind).toBe('expired');
    if (result.kind === 'expired') {
      expect(result.daysOverdue).toBeGreaterThan(0);
      expect(result.daysOverdue).toBe(31);
      expect(result.nextDate.toISOString().slice(0, 10)).toBe('2026-03-26');
    }
  });

  it('returns "urgent" when 0 < days <= 30', () => {
    const lastIs1Y11M11D = '2024-05-07'; // +2y → 2026-05-07, ~11 days from NOW
    const result = getItvDisplayState(lastIs1Y11M11D, NOW);
    expect(result.kind).toBe('urgent');
    if (result.kind === 'urgent') {
      expect(result.days).toBeGreaterThan(0);
      expect(result.days).toBeLessThanOrEqual(30);
    }
  });

  it('returns "normal" for > 30 days remaining', () => {
    const lastIs1YAgo = '2025-04-26'; // +2y → 2027-04-26, ~365 days
    const result = getItvDisplayState(lastIs1YAgo, NOW);
    expect(result.kind).toBe('normal');
    if (result.kind === 'normal') {
      expect(result.days).toBeGreaterThan(30);
    }
  });

  it('boundary: exactly at expiry (next == now) is urgent (0 days), not expired', () => {
    // last + 2y == NOW → days === 0 (Math.ceil of 0). This is "today is the
    // last day", which we still consider urgent rather than expired.
    const last = '2024-04-26'; // +2y == 2026-04-26 == NOW
    const result = getItvDisplayState(last, NOW);
    expect(result.kind).toBe('urgent');
    if (result.kind === 'urgent') {
      // Math.ceil(0 / DAY) is -0 in JS — semantically still "0 days remaining".
      expect(Math.abs(result.days)).toBe(0);
    }
  });

  it('boundary: 1 day after expiry is expired, not urgent', () => {
    const last = '2024-04-25'; // +2y == 2026-04-25 == NOW - 1 day
    const result = getItvDisplayState(last, NOW);
    expect(result.kind).toBe('expired');
    if (result.kind === 'expired') {
      expect(result.daysOverdue).toBe(1);
    }
  });

  it('expired state never carries a negative days value to the renderer', () => {
    // Audit guard: if a future refactor leaks `days: -N` through, the UI
    // would tween "−N días" which is the bug we are fixing.
    const veryOld = '2020-01-01';
    const result = getItvDisplayState(veryOld, NOW);
    expect(result.kind).toBe('expired');
    if (result.kind === 'expired') {
      expect(result.daysOverdue).toBeGreaterThan(0);
      expect(Object.keys(result)).not.toContain('days');
    }
  });
});
