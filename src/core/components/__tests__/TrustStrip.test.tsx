import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TrustStrip } from '../TrustStrip';
import type { LocalBusiness } from '@/core/types/adapter';

const BASE_CONFIG: LocalBusiness = {
  tenantId: 'test',
  businessName: 'Test Taller',
  industry: 'automotive',
  tagline: 'Tu taller',
  foundingYear: 1987,
  reviewRating: 4.9,
  reviewCount: 124,
  address: {
    street: 'Calle Test 1',
    city: 'Madrid',
    postalCode: '28001',
    region: 'Madrid',
    country: 'ES',
    geo: { lat: 40.4, lng: -3.7 },
  },
  contact: {
    phone: '+34 600 000 000',
    email: 'test@test.es',
  },
  branding: {
    primaryColor: '#e11d48',
    secondaryColor: '#1a1a2e',
    fontFamily: 'Inter',
  },
  services: [],
  operatingHours: [],
  privacyPolicy: {
    url: 'https://test.es/privacidad',
    version: '1.0.0',
    hash: '0000000000000000000000000000000000000000000000000000000000000000',
  },
  ivaRate: 0.21,
  locale: 'es-ES',
  currency: 'EUR',
};

describe('TrustStrip', () => {
  it('renders without throwing', () => {
    expect(() => renderToStaticMarkup(<TrustStrip config={BASE_CONFIG} />)).not.toThrow();
  });

  it('displays the review rating and count', () => {
    const html = renderToStaticMarkup(<TrustStrip config={BASE_CONFIG} />);
    expect(html).toContain('4.9');
    expect(html).toContain('124');
    expect(html).toContain('reseñas Google');
  });

  it('displays the founding year', () => {
    const html = renderToStaticMarkup(<TrustStrip config={BASE_CONFIG} />);
    expect(html).toContain('Desde 1987');
  });

  it('displays the warranty text', () => {
    const html = renderToStaticMarkup(<TrustStrip config={BASE_CONFIG} />);
    expect(html).toContain('Garantía 3 meses');
  });

  it('displays the no-obligation text', () => {
    const html = renderToStaticMarkup(<TrustStrip config={BASE_CONFIG} />);
    expect(html).toContain('Presupuesto sin compromiso');
  });

  it('falls back to defaults when optional fields are missing', () => {
    const cfg: LocalBusiness = {
      ...BASE_CONFIG,
      foundingYear: undefined,
      reviewRating: undefined,
      reviewCount: undefined,
    };
    const html = renderToStaticMarkup(<TrustStrip config={cfg} />);
    // Default foundingYear=1987
    expect(html).toContain('Desde 1987');
    // Default rating=4.9, count=124
    expect(html).toContain('4.9');
    expect(html).toContain('124');
  });
});
