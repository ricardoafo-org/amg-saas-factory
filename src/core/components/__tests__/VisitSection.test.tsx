import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { VisitSection } from '../VisitSection';
import type { LocalBusiness } from '@/core/types/adapter';

/**
 * BUG-014 regression: VisitSection MUST source address strings from `config.address.*`
 * and the maps href from `config.contact.googleMapsUrl`. Hardcoded address strings
 * are a CLAUDE.md violation (tenant data in component).
 */

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
  operatingHours: [],
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
