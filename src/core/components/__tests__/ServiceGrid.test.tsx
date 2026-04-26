import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ServiceGrid, BUNDLE_SERVICES } from '../ServiceGrid';
import type { Service } from '@/core/types/adapter';

const services: Service[] = BUNDLE_SERVICES.map((s) => ({
  id: s.id,
  name: s.title,
  basePrice: 50,
  duration: 60,
  description: s.desc,
}));

describe('ServiceGrid — warranty disclosure', () => {
  it('renders the "Garantía 3 meses" pill on every card', () => {
    const html = renderToStaticMarkup(
      <ServiceGrid services={services} ivaRate={0.21} />,
    );
    const matches = html.match(/Garantía 3 meses/g) ?? [];
    expect(matches.length).toBe(BUNDLE_SERVICES.length);
  });

  it('uses the .svc-warranty utility class so styling stays in globals.css', () => {
    const html = renderToStaticMarkup(
      <ServiceGrid services={services} ivaRate={0.21} />,
    );
    expect(html).toContain('svc-warranty');
  });
});

describe('ServiceGrid — CTA label', () => {
  it('CTA reads "Reservar" (legacy "Pedir" label is gone)', () => {
    const html = renderToStaticMarkup(
      <ServiceGrid services={services} ivaRate={0.21} />,
    );
    const reservar = html.match(/>Reservar</g) ?? [];
    expect(reservar.length).toBeGreaterThanOrEqual(BUNDLE_SERVICES.length);
    expect(html).not.toMatch(/>Pedir</);
  });

  it('every CTA keeps an aria-label that names the service for screen readers', () => {
    const html = renderToStaticMarkup(
      <ServiceGrid services={services} ivaRate={0.21} />,
    );
    for (const svc of BUNDLE_SERVICES) {
      expect(html).toContain(`aria-label="Reservar ${svc.title}"`);
    }
  });
});
