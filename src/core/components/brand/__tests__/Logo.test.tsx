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

  it('omits the lockup ribbon in every variant — stripe lives on .nav', () => {
    const wordmark = renderToStaticMarkup(<Logo />);
    const lockup = renderToStaticMarkup(<Logo variant="lockup" />);
    expect(wordmark).not.toContain('amg-logo-ribbon');
    expect(lockup).not.toContain('amg-logo-ribbon');
    expect(lockup).not.toContain('amg-logo-stripe');
  });

  it('does not render Hero "Cartagena · Desde …" copy in any variant', () => {
    const html = renderToStaticMarkup(<Logo variant="lockup" />);
    expect(html).not.toContain('Cartagena');
    expect(html).not.toContain('Est.');
  });

  it('rotates pistons so tops converge to the apex (reads as A, not V/H)', () => {
    const html = renderToStaticMarkup(<Logo />);
    expect(html).toMatch(/rotate\(18\s+32\s+100\)/);
    expect(html).toMatch(/rotate\(-18\s+76\s+100\)/);
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

  it('moves the brand tri-stripe to the navbar bottom edge (red/blue/red)', () => {
    expect(CSS).toMatch(/\.nav::after\s*\{[\s\S]*?linear-gradient[\s\S]*?--color-brand-red[\s\S]*?--color-brand-m-darkblue[\s\S]*?--color-brand-red/);
  });

  it('drops the legacy amg-logo-ribbon stylesheet block', () => {
    expect(CSS).not.toContain('.amg-logo-ribbon');
    expect(CSS).not.toContain('.amg-logo-stripe');
  });
});
