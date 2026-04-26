import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { UrgencyBand } from '../UrgencyBand';
import type { LocalBusiness } from '@/core/types/adapter';

/**
 * Audit row F2 — Pre-footer urgency band.
 * Asserts: phone tap-to-call, chat-open trigger via data-action, no PII leak,
 * landmark heading, and tenant-data sourcing (no hardcoded phone).
 */

const fixture: LocalBusiness = {
  tenantId: 't',
  businessName: 'Talleres AMG',
  industry: 'automotive',
  address: {
    street: 'X', city: 'X', postalCode: '00000',
    region: 'X', country: 'ES', geo: { lat: 0, lng: 0 },
  },
  contact: { phone: '+34 968 123 456', email: 'a@b.c' },
  branding: { primaryColor: '#000', secondaryColor: '#000', fontFamily: 'sans-serif' },
  services: [],
  operatingHours: [],
  privacyPolicy: { url: '', version: '0.0.0', hash: '0'.repeat(64) },
  ivaRate: 0.21,
  locale: 'es-ES',
  currency: 'EUR',
};

describe('UrgencyBand — F2', () => {
  it('renders a section landmark with an aria-labelledby heading', () => {
    const html = renderToStaticMarkup(<UrgencyBand config={fixture} />);
    expect(html).toContain('aria-labelledby="urgency-heading"');
    expect(html).toContain('id="urgency-heading"');
  });

  it('exposes a Reservar CTA wired through the global open-chat delegation', () => {
    // Same data-action pattern the footer service rows use — delegated
    // listener in ChatWidget.handleDocClick already handles it.
    const html = renderToStaticMarkup(<UrgencyBand config={fixture} />);
    expect(html).toMatch(/data-action="open-chat"[^>]*>\s*Reservar ahora/);
  });

  it('renders the workshop phone as a tel: link with stripped whitespace', () => {
    const html = renderToStaticMarkup(<UrgencyBand config={fixture} />);
    expect(html).toContain('href="tel:+34968123456"');
    // Visible text retains the formatted number — accessibility + readability.
    expect(html).toContain('+34 968 123 456');
  });

  it('sources phone from config.contact.phone (no hardcoded number)', () => {
    const altered = { ...fixture, contact: { ...fixture.contact, phone: '+34 600 000 000' } };
    const html = renderToStaticMarkup(<UrgencyBand config={altered} />);
    expect(html).toContain('href="tel:+34600000000"');
    expect(html).toContain('+34 600 000 000');
    expect(html).not.toContain('968 123 456');
  });

  it('aria-label on the tel link names the number for screen readers', () => {
    const html = renderToStaticMarkup(<UrgencyBand config={fixture} />);
    expect(html).toContain('aria-label="Llamar al +34 968 123 456"');
  });

  it('does not leak email or other contact fields in the rendered band', () => {
    const html = renderToStaticMarkup(<UrgencyBand config={fixture} />);
    expect(html).not.toContain('a@b.c');
  });
});
