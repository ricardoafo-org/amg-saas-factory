import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { RuleDivider } from '../RuleDivider';

/**
 * FEAT-038 — RuleDivider section divider contract.
 *
 * Replaces PcbMotif. Pins:
 *   - aria-hidden + role="presentation" so it never traps focus / AT
 *   - tokenised colours only (no hex / rgb in the SVG)
 *   - class hooks the CSS uses for animation + forced-colors overrides
 *   - source-size budget so it cannot creep past spec (4 KB)
 */

describe('RuleDivider — FEAT-038 contract', () => {
  const html = renderToStaticMarkup(<RuleDivider />);

  it('hides the divider from assistive tech (aria-hidden)', () => {
    expect(html).toMatch(/aria-hidden="true"/);
  });

  it('marks the inner SVG as presentational and unfocusable', () => {
    expect(html).toContain('role="presentation"');
    expect(html).toContain('focusable="false"');
  });

  it('exposes the .rule-divider hook the CSS targets', () => {
    expect(html).toContain('class="rule-divider"');
  });

  it('uses tokenised classes — no inline hex / rgb colours', () => {
    expect(html).toContain('rule-baseline');
    expect(html).toContain('rule-tick--major');
    expect(html).toContain('rule-tick--minor');
    expect(html).toContain('rule-label');
    expect(html).toContain('rule-marker');
    expect(html).not.toMatch(/#[0-9a-f]{3,6}/i);
    expect(html).not.toMatch(/rgb\(/i);
  });

  it('renders the five major tick labels (0/25/50/75/100)', () => {
    expect(html).toContain('>0<');
    expect(html).toContain('>25<');
    expect(html).toContain('>50<');
    expect(html).toContain('>75<');
    expect(html).toContain('>100<');
  });

  it('forwards extra className without dropping the base hook', () => {
    const out = renderToStaticMarkup(<RuleDivider className="my-custom" />);
    expect(out).toMatch(/class="rule-divider my-custom"/);
  });

  it('source file stays under the 4 KB editorial budget', () => {
    const src = readFileSync(
      join(process.cwd(), 'src', 'core', 'components', 'brand', 'RuleDivider.tsx'),
      'utf8',
    );
    expect(src.length).toBeLessThanOrEqual(4096);
  });

  it('starts with data-in-view="false" so the SSR markup does not bake the animation as already-played', () => {
    expect(html).toContain('data-in-view="false"');
  });
});

describe('globals.css — FEAT-038 RuleDivider polish', () => {
  const CSS = readFileSync(join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');

  it('defines a forced-colors override on .rule-divider', () => {
    expect(CSS).toMatch(/@media \(forced-colors: active\)\s*\{[\s\S]*?\.rule-divider/);
  });

  it('remaps logo strokes to CanvasText under forced-colors', () => {
    expect(CSS).toMatch(/\.amg-logo[^{]*\{[^}]*CanvasText/);
  });

  it('uses color-mix on the baseline so it tracks the theme palette', () => {
    expect(CSS).toMatch(/\.rule-baseline\s*\{[^}]*color-mix\(in oklch/);
  });

  it('declares the rule-marker-sweep keyframes for the registration tick', () => {
    expect(CSS).toMatch(/@keyframes\s+rule-marker-sweep/);
  });

  it('balances vertical rhythm with margin-block (no pinned-to-top regression)', () => {
    expect(CSS).toMatch(/\.rule-divider\s*\{[^}]*margin-block:/);
  });

  it('respects prefers-reduced-motion by stilling the marker', () => {
    expect(CSS).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.rule-marker[\s\S]*?animation:\s*none/,
    );
  });

  it('pauses the marker animation by default and runs it only when the divider is in view', () => {
    expect(CSS).toMatch(/\.rule-marker\s*\{[^}]*animation-play-state:\s*paused/);
    expect(CSS).toMatch(
      /\.rule-divider\[data-in-view="true"\]\s+\.rule-marker\s*\{[^}]*animation-play-state:\s*running/,
    );
  });
});
