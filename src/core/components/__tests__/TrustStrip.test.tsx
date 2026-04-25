import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TrustStrip } from '../TrustStrip';

/**
 * TrustStrip — bundle Section B.
 *
 * The component is now static (no config prop) — all copy is canonical brand copy
 * matching Website.html lines 84-112.
 *
 * Counter animation runs in the browser via TrustCounter ('use client').
 * renderToStaticMarkup gets the SSR snapshot which shows the final display string.
 */
describe('TrustStrip', () => {
  it('renders without throwing', () => {
    expect(() => renderToStaticMarkup(<TrustStrip />)).not.toThrow();
  });

  it('renders 4 trust cells', () => {
    const html = renderToStaticMarkup(<TrustStrip />);
    const matches = html.match(/trust-cell/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });

  it('shows 38 años', () => {
    const html = renderToStaticMarkup(<TrustStrip />);
    expect(html).toContain('38');
    expect(html).toContain('Reparando coches en Cartagena');
  });

  it('shows clientes atendidos', () => {
    const html = renderToStaticMarkup(<TrustStrip />);
    expect(html).toContain('Clientes atendidos');
  });

  it('shows review score', () => {
    const html = renderToStaticMarkup(<TrustStrip />);
    expect(html).toContain('4,9');
    expect(html).toContain('342 reseñas en Google');
  });

  it('shows garantía', () => {
    const html = renderToStaticMarkup(<TrustStrip />);
    expect(html).toContain('Garant\u00EDa en cada reparaci\u00F3n');
  });

  it('uses semantic trust utility classes', () => {
    const html = renderToStaticMarkup(<TrustStrip />);
    expect(html).toContain('trust-inner');
    expect(html).toContain('trust-icon');
    expect(html).toContain('trust-lab');
  });
});
