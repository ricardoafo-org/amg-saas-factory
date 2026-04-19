import { describe, it, expect } from 'vitest';
import { calcOilRecommendation } from '@/lib/oil';

describe('calcOilRecommendation', () => {
  it('marks as urgent when km driven exceeds interval', () => {
    const result = calcOilRecommendation('synthetic', 50000, 65500);
    expect(result.urgent).toBe(true);
    expect(result.kmLeft).toBeLessThan(0);
  });

  it('returns correct interval for synthetic oil (15000km)', () => {
    const result = calcOilRecommendation('synthetic', 0, 5000);
    expect(result.interval).toBe(15000);
    expect(result.kmLeft).toBe(10000);
  });

  it('returns correct interval for semi-synthetic oil (10000km)', () => {
    const result = calcOilRecommendation('semi', 0, 5000);
    expect(result.interval).toBe(10000);
    expect(result.kmLeft).toBe(5000);
  });

  it('returns correct interval for mineral oil (7500km)', () => {
    const result = calcOilRecommendation('mineral', 0, 5000);
    expect(result.interval).toBe(7500);
    expect(result.kmLeft).toBe(2500);
  });

  it('uses 10000km fallback for unknown oil type', () => {
    const result = calcOilRecommendation('unknown', 0, 5000);
    expect(result.interval).toBe(10000);
  });

  it('marks as urgent when less than 1000km left', () => {
    const result = calcOilRecommendation('synthetic', 0, 14500);
    expect(result.urgent).toBe(true);
    expect(result.kmLeft).toBe(500);
  });

  it('not urgent when plenty of km left', () => {
    const result = calcOilRecommendation('synthetic', 0, 1000);
    expect(result.urgent).toBe(false);
    expect(result.kmLeft).toBe(14000);
  });

  it('includes km numbers in the message', () => {
    const result = calcOilRecommendation('synthetic', 10000, 20000);
    expect(result.message).toContain('5.000');
  });
});

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

describe('calcOilRecommendation — property invariants', () => {
  const OIL_TYPES = ['mineral', 'semi', 'synthetic', 'unknown'] as const;
  const VALID_INTERVALS = [7500, 10000, 15000];

  it('interval is always one of [7500, 10000, 15000] for any oil type', () => {
    OIL_TYPES.forEach((oilType) => {
      const result = calcOilRecommendation(oilType, 0, 0);
      expect(VALID_INTERVALS).toContain(result.interval);
    });
  });

  it('for any kmNow > kmLast, kmLeft equals interval - (kmNow - kmLast)', () => {
    const pairs: Array<[number, number]> = [
      [0, 1000],
      [10000, 18000],
      [50000, 57500],
      [100000, 110000],
      [0, 20000],
    ];
    pairs.forEach(([kmLast, kmNow]) => {
      ['mineral', 'semi', 'synthetic'].forEach((oilType) => {
        const result = calcOilRecommendation(oilType, kmLast, kmNow);
        const driven = kmNow - kmLast;
        expect(result.kmLeft).toBe(result.interval - driven);
      });
    });
  });

  it('for any kmNow === kmLast, kmLeft equals the full interval', () => {
    [0, 10000, 50000, 99999].forEach((km) => {
      OIL_TYPES.forEach((oilType) => {
        const result = calcOilRecommendation(oilType, km, km);
        expect(result.kmLeft).toBe(result.interval);
      });
    });
  });

  it('if kmLeft <= 0, urgent must be true', () => {
    // Drive beyond the interval for each oil type
    const overduePairs: Array<[string, number, number]> = [
      ['mineral', 0, 8000],   // mineral interval = 7500, 8000 > 7500
      ['semi', 0, 11000],     // semi = 10000
      ['synthetic', 0, 16000], // synthetic = 15000
    ];
    overduePairs.forEach(([oilType, kmLast, kmNow]) => {
      const result = calcOilRecommendation(oilType, kmLast, kmNow);
      expect(result.kmLeft).toBeLessThanOrEqual(0);
      expect(result.urgent).toBe(true);
    });
  });

  it('urgent is true when kmLeft is exactly 0', () => {
    // mineral: interval 7500, drive exactly 7500
    const result = calcOilRecommendation('mineral', 0, 7500);
    expect(result.kmLeft).toBe(0);
    expect(result.urgent).toBe(true);
  });

  it('urgent is true when kmLeft is between 1 and 1000 inclusive', () => {
    // synthetic: interval 15000, drive 14500 → kmLeft = 500
    const result = calcOilRecommendation('synthetic', 0, 14500);
    expect(result.kmLeft).toBe(500);
    expect(result.urgent).toBe(true);
  });

  it('urgent is false when kmLeft is > 1000', () => {
    const result = calcOilRecommendation('synthetic', 0, 1000);
    expect(result.kmLeft).toBe(14000);
    expect(result.urgent).toBe(false);
  });

  it('unknown oil type uses 10000km interval (same as semi)', () => {
    const unknown = calcOilRecommendation('unknown', 0, 5000);
    const semi = calcOilRecommendation('semi', 0, 5000);
    expect(unknown.interval).toBe(semi.interval);
    expect(unknown.kmLeft).toBe(semi.kmLeft);
  });

  it('result shape always has all required fields', () => {
    OIL_TYPES.forEach((oilType) => {
      const result = calcOilRecommendation(oilType, 10000, 15000);
      expect(typeof result.kmLeft).toBe('number');
      expect(typeof result.interval).toBe('number');
      expect(typeof result.urgent).toBe('boolean');
      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
    });
  });
});
