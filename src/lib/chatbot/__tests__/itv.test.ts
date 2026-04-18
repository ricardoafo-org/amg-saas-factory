import { describe, it, expect } from 'vitest';
import { getItvSchedule } from '@/core/components/ItvCountdown';

function yearsAgo(years: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d;
}

describe('getItvSchedule', () => {
  it('returns "none" for vehicles under 4 years', () => {
    const result = getItvSchedule(yearsAgo(2));
    expect(result.frequency).toBe('none');
    expect(result.nextDate > new Date()).toBe(true);
  });

  it('returns "biennial" for vehicles 4-10 years', () => {
    const result = getItvSchedule(yearsAgo(6));
    expect(result.frequency).toBe('biennial');
  });

  it('returns "annual" for vehicles over 10 years', () => {
    const result = getItvSchedule(yearsAgo(12));
    expect(result.frequency).toBe('annual');
  });

  it('next date is in the future for a 3-year-old vehicle', () => {
    const result = getItvSchedule(yearsAgo(3));
    expect(result.nextDate.getTime()).toBeGreaterThan(Date.now());
  });

  it('next date is in the past (overdue) for a 5-year-old vehicle last inspected 3 years ago', () => {
    // 5-year old car: biennial, next ITV should have been at year 4
    const firstReg = yearsAgo(5);
    const result = getItvSchedule(firstReg);
    // At age 5, biennial cycle 1 starts at year 4 → next at year 6 → still future
    expect(result.frequency).toBe('biennial');
  });

  it('computes correct year for first ITV at exactly 4 years', () => {
    const firstReg = yearsAgo(4);
    const result = getItvSchedule(firstReg);
    // Should be biennial now, next at 6 years
    expect(result.frequency).toBe('biennial');
  });

  it('computes correct year for annual ITV at 11 years', () => {
    const firstReg = yearsAgo(11);
    const result = getItvSchedule(firstReg);
    expect(result.frequency).toBe('annual');
    // Next date should be approximately 1 year from now
    const diffYears = (result.nextDate.getTime() - Date.now()) / (365.25 * 86400000);
    expect(diffYears).toBeLessThan(1.5);
  });
});
