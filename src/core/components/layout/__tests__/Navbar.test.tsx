import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Navbar } from '../Navbar';
import type { LocalBusiness } from '@/core/types/adapter';

/**
 * FEAT-038 PR 2 — Navbar contract:
 * - Renders the brand <Logo> (NOT a raw /logo.svg <img>).
 * - Drops backdrop-blur entirely (saturated in 2026 per spec).
 * - Includes the AMG tri-stripe via .nav class hook in globals.css.
 * - Carries data-scrolled="false" by default for the suspension-bounce shrink.
 */

const fixture: LocalBusiness = {
  tenantId: 'fixture',
  businessName: 'Talleres Fixture',
  industry: 'automotive',
  foundingYear: 1987,
  address: {
    street: 'Calle X',
    city: 'CiudadX',
    postalCode: '00000',
    region: 'Provincia X',
    country: 'ES',
    geo: { lat: 0, lng: 0 },
  },
  contact: { phone: '+34 600 100 200', email: 'a@b.c' },
  branding: { primaryColor: '#000', secondaryColor: '#000', fontFamily: 'sans-serif' },
  services: [],
  operatingHours: [],
  privacyPolicy: { url: '', version: '0.0.0', hash: '0'.repeat(64) },
  ivaRate: 0.21,
  locale: 'es-ES',
  currency: 'EUR',
};

const html = renderToStaticMarkup(<Navbar config={fixture} />);

describe('Navbar — FEAT-038 contract', () => {
  it('renders a <header> with class "nav"', () => {
    expect(html).toMatch(/<header[^>]*class="nav"/);
  });

  it('initialises data-scrolled="false" so the scroll island can flip it', () => {
    expect(html).toMatch(/data-scrolled="false"/);
  });

  it('renders the brand Logo (amg-logo wrapper) and NOT a raw /logo.svg <img>', () => {
    expect(html).toMatch(/amg-logo/);
    expect(html).not.toMatch(/src="\/logo\.svg"/);
  });

  it('exposes the primary navigation landmark with the expected aria-label', () => {
    expect(html).toMatch(/aria-label="Navegación principal"/);
  });

  it('contains the four primary nav items', () => {
    for (const label of ['Servicios', 'ITV', 'Proceso', 'Visítanos']) {
      expect(html).toContain(label);
    }
  });

  it('exposes a tel: link with the configured phone', () => {
    expect(html).toMatch(/href="tel:\+34 600 100 200"/);
  });

  it('renders the "Reservar cita" CTA wired to the chat trigger', () => {
    expect(html).toMatch(/data-action="open-chat"/);
    expect(html).toContain('Reservar cita');
  });

  it('contains no inline backdrop-blur / backdrop-filter (spec rollback)', () => {
    expect(html).not.toMatch(/backdrop-blur/);
    expect(html).not.toMatch(/backdrop-filter/i);
  });
});
