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
