import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Logo } from '../Logo';

describe('Logo', () => {
  it('renders without throwing', () => {
    expect(() => renderToStaticMarkup(<Logo />)).not.toThrow();
  });

  it('exposes role=img with the brand aria-label', () => {
    const html = renderToStaticMarkup(<Logo />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Talleres AMG"');
  });

  it('wraps glyphs with the .amg-logo class so global hover animations apply', () => {
    const html = renderToStaticMarkup(<Logo />);
    expect(html).toContain('amg-logo');
  });

  it('renders piston-l and piston-r groups + ring-sweep elements', () => {
    const html = renderToStaticMarkup(<Logo />);
    expect(html).toContain('piston-l');
    expect(html).toContain('piston-r');
    expect(html).toContain('ring-sweep-l');
    expect(html).toContain('ring-sweep-r');
  });

  it('uses the engrave filter on filled glyphs (default size >= 32)', () => {
    const html = renderToStaticMarkup(<Logo size={48} />);
    expect(html).toContain('amg-engrave');
    expect(html).toContain('filter="url(#amg-engrave)"');
  });

  it('switches to stroke-only variant under 32px (no engrave filter, no fill)', () => {
    const html = renderToStaticMarkup(<Logo size={20} />);
    expect(html).toContain('glyph-stroke');
    expect(html).not.toContain('filter="url(#amg-engrave)"');
  });

  it('omits lockup metadata in wordmark variant (default)', () => {
    const html = renderToStaticMarkup(<Logo />);
    expect(html).not.toContain('Cartagena');
  });

  it('renders Castilian Spanish lockup with city + ES + est. year', () => {
    const html = renderToStaticMarkup(<Logo variant="lockup" />);
    expect(html).toContain('Cartagena');
    expect(html).toContain('ES');
    expect(html).toContain('Est.');
    expect(html).toContain('1987');
  });

  it('tags est-year for the global brand-est-year find-and-replace', () => {
    const html = renderToStaticMarkup(<Logo variant="lockup" />);
    expect(html).toContain('data-todo="brand-est-year"');
  });

  it('honours custom establishedYear', () => {
    const html = renderToStaticMarkup(<Logo variant="lockup" establishedYear={2003} />);
    expect(html).toContain('2003');
  });

  it('honours custom ariaLabel for non-default placements', () => {
    const html = renderToStaticMarkup(<Logo ariaLabel="Volver al inicio" />);
    expect(html).toContain('aria-label="Volver al inicio"');
  });

  it('uses semantic --color-foreground (no hardcoded brand colour)', () => {
    const html = renderToStaticMarkup(<Logo />);
    expect(html).not.toMatch(/fill=["']#[0-9a-fA-F]{3,6}["']/);
  });
});
