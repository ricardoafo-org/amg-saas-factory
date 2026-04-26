import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Hero } from '../Hero';
import type { LocalBusiness } from '@/core/types/adapter';

const baseConfig: LocalBusiness = {
  tenantId: 't',
  businessName: 'Talleres Fixture',
  industry: 'automotive',
  address: {
    street: 'Calle Inventada, 1',
    city: 'CiudadFicticia',
    postalCode: '00000',
    region: 'X',
    country: 'ES',
    geo: { lat: 0, lng: 0 },
  },
  contact: { phone: '+34 604 273 678', email: 'a@b.c' },
  branding: { primaryColor: '#000', secondaryColor: '#000', fontFamily: 'sans-serif' },
  services: [],
  operatingHours: [],
  privacyPolicy: { url: '', version: '0.0.0', hash: '0'.repeat(64) },
  ivaRate: 0.21,
  locale: 'es-ES',
  currency: 'EUR',
  foundingYear: 1987,
};

describe('Hero — CTA stack', () => {
  it('renders the Reservar primary CTA wired to the chat open-action delegation', () => {
    const html = renderToStaticMarkup(<Hero config={baseConfig} nextSlot={null} />);
    expect(html).toContain('data-action="open-chat"');
    expect(html).toContain('Reservar cita');
  });

  it('renders the Llamar tel: link from config.contact.phone', () => {
    const html = renderToStaticMarkup(<Hero config={baseConfig} nextSlot={null} />);
    expect(html).toContain('href="tel:+34 604 273 678"');
    expect(html).toContain('Llamar ahora');
  });

  it('renders a WhatsApp CTA when contact.whatsapp is present, with non-digits stripped', () => {
    const html = renderToStaticMarkup(
      <Hero config={{ ...baseConfig, contact: { ...baseConfig.contact, whatsapp: '+34 604 273 678' } }} nextSlot={null} />,
    );
    expect(html).toContain('href="https://wa.me/34604273678"');
    expect(html).toContain('WhatsApp');
    expect(html).toContain('aria-label="Escribir por WhatsApp"');
  });

  it('omits the WhatsApp CTA when contact.whatsapp is undefined', () => {
    const html = renderToStaticMarkup(<Hero config={baseConfig} nextSlot={null} />);
    expect(html).not.toContain('wa.me');
    expect(html).not.toContain('WhatsApp');
  });

  it('WhatsApp link opens in a new tab with safe rel attributes', () => {
    const html = renderToStaticMarkup(
      <Hero config={{ ...baseConfig, contact: { ...baseConfig.contact, whatsapp: '+34604273678' } }} nextSlot={null} />,
    );
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
