import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { VisitSection } from '../VisitSection';
import type { LocalBusiness } from '@/core/types/adapter';

/**
 * BUG-014 regression: VisitSection MUST source address strings from `config.address.*`
 * and the maps href from `config.contact.googleMapsUrl`. Hardcoded address strings
 * are a CLAUDE.md violation (tenant data in component).
 */

const AMG_HOURS = [
  { day: 'monday' as const, open: '08:00', close: '18:00' },
  { day: 'tuesday' as const, open: '08:00', close: '18:00' },
  { day: 'wednesday' as const, open: '08:00', close: '18:00' },
  { day: 'thursday' as const, open: '08:00', close: '18:00' },
  { day: 'friday' as const, open: '08:00', close: '18:00' },
  { day: 'saturday' as const, open: '09:00', close: '14:00' },
  { day: 'sunday' as const, open: '00:00', close: '00:00', closed: true },
];

const makeFixture = (overrides: Partial<LocalBusiness> = {}): LocalBusiness => ({
  tenantId: 'fixture',
  businessName: 'Talleres Fixture',
  industry: 'automotive',
  address: {
    street: 'Calle Inventada, 123',
    city: 'CiudadFicticia',
    postalCode: '99999',
    region: 'Provincia Test',
    country: 'ES',
    geo: { lat: 0, lng: 0 },
  },
  contact: {
    phone: '+34 999 999 999',
    email: 'info@fixture.test',
    whatsapp: '+34 600000000',
    googleMapsUrl: 'https://maps.example.test/place/fixture',
  },
  branding: {
    primaryColor: '#000',
    secondaryColor: '#000',
    fontFamily: 'sans-serif',
  },
  services: [],
  operatingHours: AMG_HOURS,
  privacyPolicy: { url: '', version: '0.0.0', hash: '0'.repeat(64) },
  ivaRate: 0.21,
  locale: 'es-ES',
  currency: 'EUR',
  ...overrides,
});

describe('VisitSection — BUG-014 regression', () => {
  it('renders the street from config.address.street, not a hardcoded literal', () => {
    const html = renderToStaticMarkup(<VisitSection config={makeFixture()} />);
    expect(html).toContain('Calle Inventada, 123');
    expect(html).toContain('99999');
    expect(html).toContain('CiudadFicticia');
  });

  it('does not contain the legacy "Calle Mayor 42" placeholder anywhere', () => {
    const html = renderToStaticMarkup(<VisitSection config={makeFixture()} />);
    expect(html).not.toContain('Calle Mayor 42');
    expect(html).not.toContain('Ayuntamiento');
    expect(html).not.toContain('30201');
  });

  it('uses config.contact.googleMapsUrl as the Cómo llegar href', () => {
    const html = renderToStaticMarkup(<VisitSection config={makeFixture()} />);
    expect(html).toContain('href="https://maps.example.test/place/fixture"');
  });

  it('falls back to a deterministic search URL when googleMapsUrl is missing', () => {
    const html = renderToStaticMarkup(
      <VisitSection
        config={makeFixture({
          contact: { phone: '+34 0', email: 'a@b.c' },
        })}
      />,
    );
    expect(html).toContain('google.com/maps/search/');
    expect(html).toContain('Calle');
  });

  it('renders a tel: link on the visible phone number (V1 — tap-to-call)', () => {
    const html = renderToStaticMarkup(<VisitSection config={makeFixture()} />);
    // Phone is wrapped in <a href="tel:..."> with non-digits-and-+-stripped target.
    expect(html).toContain('href="tel:+34999999999"');
    expect(html).toContain('aria-label="Llamar al +34 999 999 999"');
  });

  it('renders an inline "Llamar ahora" CTA next to "Escribir por WhatsApp"', () => {
    const html = renderToStaticMarkup(<VisitSection config={makeFixture()} />);
    expect(html).toContain('Llamar ahora');
    expect(html).toContain('Escribir por WhatsApp');
    // Both CTAs share the .visit-phone-ctas container so they wrap together on mobile.
    expect(html).toContain('visit-phone-ctas');
  });

  it('omits the WhatsApp CTA when whatsapp is undefined but keeps the Llamar CTA', () => {
    const html = renderToStaticMarkup(
      <VisitSection
        config={makeFixture({
          contact: {
            phone: '+34 999 999 999',
            email: 'a@b.c',
            googleMapsUrl: 'https://maps.example.test/x',
          },
        })}
      />,
    );
    expect(html).toContain('Llamar ahora');
    expect(html).not.toContain('Escribir por WhatsApp');
    expect(html).not.toContain('wa.me');
  });

  it('sources hours from config.operatingHours instead of hardcoded literals (V2)', () => {
    // V2 audit: replacing the previously hardcoded "8:00 — 19:00" literals.
    // Config hours for AMG are 08:00–18:00 weekdays — the rendered string must follow.
    const html = renderToStaticMarkup(<VisitSection config={makeFixture()} />);
    expect(html).toContain('Lunes — Viernes');
    expect(html).toContain('08:00 — 18:00');
    expect(html).toContain('Sábado');
    expect(html).toContain('09:00 — 14:00');
    expect(html).toContain('Domingo');
    // The pre-V2 hardcoded "19:00" close must be gone — that was the bug.
    expect(html).not.toContain('8:00 — 19:00');
  });

  it('renders a live open-status pill driven by operatingHours (V2)', () => {
    const html = renderToStaticMarkup(<VisitSection config={makeFixture()} />);
    // Client component renders one of three states server-side based on `new Date()`.
    // We only assert the pill exists and carries one of the known data-state values.
    expect(html).toMatch(/class="visit-status[^"]*"/);
    expect(html).toMatch(/data-state="(open|closing-soon|closed)"/);
  });

  it('renders the Cartagena-locale tagline derived from address (no Madrid leak)', () => {
    const html = renderToStaticMarkup(
      <VisitSection
        config={makeFixture({
          address: {
            street: 'Calle Dr. Serrano, 49',
            city: 'Cartagena',
            postalCode: '30300',
            region: 'Región de Murcia',
            country: 'ES',
            geo: { lat: 37.6072, lng: -0.9885 },
          },
        })}
      />,
    );
    expect(html).toContain('Calle Dr. Serrano, 49');
    expect(html).toContain('Cartagena');
    expect(html).not.toContain('Madrid');
  });
});
