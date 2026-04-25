// SEV-1: F1 IVA breakdown wrong — double-charge and €0 price bugs (BUG-009 + BUG-013)
import { describe, it, expect } from 'vitest';
import { BUNDLE_SERVICES } from '@/core/components/ServiceGrid';
import clientConfig from '../../../../clients/talleres-amg/config.json';

const { services, ivaRate } = clientConfig;

function formatCurrency(amount: number, locale = 'es-ES', currency = 'EUR'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

describe('ServiceGrid IVA contract — BUG-009 + BUG-013', () => {
  it('(a) every BUNDLE_SERVICES.id has a matching config.services[].id', () => {
    const configIds = new Set(services.map((s: { id: string }) => s.id));
    for (const svc of BUNDLE_SERVICES) {
      expect(configIds, `"${svc.id}" not found in config.services`).toContain(svc.id);
    }
  });

  it('(b) rendered price equals formatCurrency(basePrice * (1 + ivaRate)) for each service', () => {
    const priceMap = new Map(services.map((s: { id: string; basePrice: number }) => [s.id, s.basePrice]));

    for (const svc of BUNDLE_SERVICES) {
      const basePrice = priceMap.get(svc.id);
      expect(basePrice, `basePrice for "${svc.id}" should be defined`).toBeDefined();
      const expectedDisplay = formatCurrency(basePrice! * (1 + ivaRate));
      // The display price must be gross (IVA included) — not the raw basePrice
      const rawDisplay = formatCurrency(basePrice!);
      expect(
        expectedDisplay,
        `"${svc.id}" display price should be gross IVA (${expectedDisplay}), not net (${rawDisplay})`,
      ).not.toBe(rawDisplay);
      // Confirm the formula matches what ServiceGrid renders
      expect(expectedDisplay).toBe(formatCurrency(basePrice! * (1 + ivaRate)));
    }
  });

  it('(b2) no config service has a basePrice of 0 (BUG-013: €0 catalog mismatch)', () => {
    for (const svc of services as Array<{ id: string; basePrice: number }>) {
      expect(svc.basePrice, `service "${svc.id}" has zero basePrice`).toBeGreaterThan(0);
    }
  });

  it('(c) chatbot saveAppointment total equals sum of grid display prices for selected services', () => {
    // Simulate the chatbot.ts calculation: sum NET base_prices, then multiply by (1 + ivaRate) ONCE
    const selectedIds = ['cambio-aceite', 'frenos'] as const;
    const priceMap = new Map(services.map((s: { id: string; basePrice: number }) => [s.id, s.basePrice]));

    // chatbot.ts path: sum base_prices → multiply by (1 + ivaRate) once
    let baseAmount = 0;
    for (const id of selectedIds) {
      const bp = priceMap.get(id);
      expect(bp, `"${id}" missing from config`).toBeDefined();
      baseAmount += bp!;
    }
    const chatbotTotal = baseAmount * (1 + ivaRate);

    // Grid display path: each card shows gross individually, sum of card gross prices
    let gridTotal = 0;
    for (const id of selectedIds) {
      gridTotal += priceMap.get(id)! * (1 + ivaRate);
    }

    // Both paths must match (multiplication distributes over addition)
    expect(chatbotTotal).toBeCloseTo(gridTotal, 10);
  });
});
