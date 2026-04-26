import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Logo } from '../Logo';

describe('Logo — FEAT-038 Direction A (punch-stamp)', () => {
  it('renders without throwing', () => {
    expect(() => renderToStaticMarkup(<Logo />)).not.toThrow();
  });

  it('exposes role=img with the brand aria-label', () => {
    const html = renderToStaticMarkup(<Logo />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Talleres AMG"');
  });

  it('wraps glyphs with the .amg-logo class so global animations apply', () => {
    const html = renderToStaticMarkup(<Logo />);
    expect(html).toContain('amg-logo');
  });

  it('marks the variant as a punch-stamp via .amg-logo--stamp', () => {
    const html = renderToStaticMarkup(<Logo />);
    expect(html).toContain('amg-logo--stamp');
  });

  it('renders piston-l and piston-r groups + ring-sweep elements', () => {
    const html = renderToStaticMarkup(<Logo />);
    expect(html).toContain('piston-l');
    expect(html).toContain('piston-r');
    expect(html).toContain('ring-sweep-l');
    expect(html).toContain('ring-sweep-r');
  });

  it('uses the punch-stamp filter on filled glyphs (default size >= 32)', () => {
    const html = renderToStaticMarkup(<Logo size={48} />);
    expect(html).toContain('amg-stamp');
    expect(html).toContain('filter="url(#amg-stamp)"');
  });

  it('switches to stroke-only variant under 32px (no stamp filter, no fill)', () => {
    const html = renderToStaticMarkup(<Logo size={20} />);
    expect(html).toContain('glyph-stroke');
    expect(html).not.toContain('filter="url(#amg-stamp)"');
  });

  it('omits the stripe ribbon in wordmark variant (default)', () => {
    const html = renderToStaticMarkup(<Logo />);
    expect(html).not.toContain('amg-logo-ribbon');
  });

  it('does not duplicate Hero "Cartagena · Desde …" copy in the lockup', () => {
    const html = renderToStaticMarkup(<Logo variant="lockup" />);
    expect(html).not.toContain('Cartagena');
    expect(html).not.toContain('Est.');
  });

  it('renders the lockup ribbon with brand-correct stripe palette (amber / paper / red)', () => {
    const html = renderToStaticMarkup(<Logo variant="lockup" />);
    expect(html).toContain('amg-logo-ribbon');
    expect(html).toContain('amg-logo-stripe--amber');
    expect(html).toContain('amg-logo-stripe--paper');
    expect(html).toContain('amg-logo-stripe--red');
  });

  it('honours custom ariaLabel for non-default placements', () => {
    const html = renderToStaticMarkup(<Logo ariaLabel="Volver al inicio" />);
    expect(html).toContain('aria-label="Volver al inicio"');
  });

  it('uses semantic --color-foreground (no hardcoded hex brand colour)', () => {
    const html = renderToStaticMarkup(<Logo />);
    expect(html).not.toMatch(/fill=["']#[0-9a-fA-F]{3,6}["']/);
  });
});

describe('globals.css — Logo Direction A motion + ribbon', () => {
  const CSS = readFileSync(join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');

  it('fires the piston animation once on first paint (no :hover gate)', () => {
    expect(CSS).toMatch(
      /\.amg-logo\s+\.piston-l\s*\{[^}]*animation:\s*amg-piston-fire[^}]*\b1\b/,
    );
  });

  it('respects prefers-reduced-motion by stilling the pistons', () => {
    expect(CSS).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.amg-logo\s+\.piston-l[\s\S]*?animation:\s*none/,
    );
  });

  it('declares the brand stripe palette tokens for the ribbon', () => {
    expect(CSS).toMatch(/\.amg-logo-stripe--amber\s*\{[^}]*var\(--color-brand-amber\)/);
    expect(CSS).toMatch(/\.amg-logo-stripe--paper\s*\{[^}]*var\(--color-brand-paper\)/);
    expect(CSS).toMatch(/\.amg-logo-stripe--red\s*\{[^}]*var\(--color-brand-red\)/);
  });
});
