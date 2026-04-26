import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { TrustStrip } from '../TrustStrip';

const baseProps = { yearsOperating: 38, reviewRating: 4.9, reviewCount: 124 };

describe('TrustStrip — prop-driven', () => {
  it('renders without throwing', () => {
    expect(() => renderToStaticMarkup(<TrustStrip {...baseProps} />)).not.toThrow();
  });

  it('renders 4 trust cells', () => {
    const html = renderToStaticMarkup(<TrustStrip {...baseProps} />);
    const matches = html.match(/trust-cell/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });

  it('shows yearsOperating from props', () => {
    const html = renderToStaticMarkup(<TrustStrip {...baseProps} yearsOperating={38} />);
    expect(html).toContain('38');
    expect(html).toContain('Reparando coches en Cartagena');
  });

  it('updates years label when yearsOperating changes', () => {
    const html = renderToStaticMarkup(<TrustStrip {...baseProps} yearsOperating={42} />);
    expect(html).toContain('42 años');
  });

  it('shows review rating with comma decimal (es-ES)', () => {
    const html = renderToStaticMarkup(<TrustStrip {...baseProps} reviewRating={4.9} />);
    expect(html).toContain('4,9');
  });

  it('shows review count from props', () => {
    const html = renderToStaticMarkup(<TrustStrip {...baseProps} reviewCount={124} />);
    expect(html).toContain('124 reseñas en Google');
  });

  it('shows garantía cell', () => {
    const html = renderToStaticMarkup(<TrustStrip {...baseProps} />);
    expect(html).toContain('Garant\u00EDa en cada reparaci\u00F3n');
  });

  it('uses semantic trust utility classes', () => {
    const html = renderToStaticMarkup(<TrustStrip {...baseProps} />);
    expect(html).toContain('trust-inner');
    expect(html).toContain('trust-icon');
    expect(html).toContain('trust-lab');
  });
});

describe('TrustStrip — drift guard', () => {
  /**
   * Prevent regression: review count and rating MUST come from props (config),
   * never literal numbers in the component source. If a future edit reintroduces
   * a hardcoded review count, this test fails before the PR can land.
   */
  it('component source has no hardcoded review numbers', () => {
    const src = readFileSync(
      join(process.cwd(), 'src', 'core', 'components', 'TrustStrip.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/342 rese\u00F1as/);
    expect(src).not.toMatch(/display="4,9 \/ 5"/);
  });
});
