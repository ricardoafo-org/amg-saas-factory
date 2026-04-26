import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MobileContactBar } from '../MobileContactBar';

const PHONE = '+34 604 273 678';

describe('MobileContactBar — tap targets', () => {
  it('renders a tel: link using the phone with whitespace stripped', () => {
    const html = renderToStaticMarkup(<MobileContactBar phone={PHONE} />);
    expect(html).toContain('href="tel:+34604273678"');
  });

  it('renders Llamar label', () => {
    const html = renderToStaticMarkup(<MobileContactBar phone={PHONE} />);
    expect(html).toContain('Llamar');
  });

  it('renders WhatsApp link with non-digits stripped when whatsapp is provided', () => {
    const html = renderToStaticMarkup(
      <MobileContactBar phone={PHONE} whatsapp="+34 604 273 678" />,
    );
    expect(html).toContain('href="https://wa.me/34604273678"');
    expect(html).toContain('WhatsApp');
  });

  it('omits the WhatsApp button when whatsapp is undefined', () => {
    const html = renderToStaticMarkup(<MobileContactBar phone={PHONE} />);
    expect(html).not.toContain('wa.me');
    expect(html).not.toContain('WhatsApp');
  });

  it('renders a Reservar button wired to the chat open-action delegation', () => {
    const html = renderToStaticMarkup(<MobileContactBar phone={PHONE} />);
    expect(html).toContain('data-action="open-chat"');
    expect(html).toContain('Reservar');
  });

  it('exposes a region landmark with a Spanish aria-label', () => {
    const html = renderToStaticMarkup(<MobileContactBar phone={PHONE} />);
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Contacto rápido"');
  });

  it('starts with chat closed (data-chat-open="false")', () => {
    const html = renderToStaticMarkup(<MobileContactBar phone={PHONE} />);
    expect(html).toContain('data-chat-open="false"');
  });

  it('uses the contact-bar utility classes (defined in globals.css)', () => {
    const html = renderToStaticMarkup(<MobileContactBar phone={PHONE} />);
    expect(html).toContain('contact-bar');
    expect(html).toContain('contact-bar-btn');
    expect(html).toContain('contact-bar-btn--primary');
  });
});

describe('MobileContactBar — accessibility labels', () => {
  it('phone link aria-label includes the human-readable phone for screen readers', () => {
    const html = renderToStaticMarkup(<MobileContactBar phone={PHONE} />);
    expect(html).toContain(`aria-label="Llamar al ${PHONE}"`);
  });

  it('reserva button has an explicit aria-label', () => {
    const html = renderToStaticMarkup(<MobileContactBar phone={PHONE} />);
    expect(html).toContain('aria-label="Reservar cita"');
  });

  it('whatsapp link opens in a new tab with safe rel attributes', () => {
    const html = renderToStaticMarkup(
      <MobileContactBar phone={PHONE} whatsapp="+34604273678" />,
    );
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
