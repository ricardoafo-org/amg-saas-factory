import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PcbMotif } from '../PcbMotif';

/**
 * FEAT-038 PR 6 — PCB section divider micro-motif contract.
 *
 * Server Component rendered as a presentational divider. Pins:
 *   - aria-hidden + role="presentation" so it never traps focus / AT
 *   - tokenised colours only (no hex / rgb in the SVG)
 *   - class hooks the CSS uses for animation + forced-colors overrides
 *   - source-size budget so it cannot creep past spec (4 KB)
 */

describe('PcbMotif — FEAT-038 PR 6 contract', () => {
  const html = renderToStaticMarkup(<PcbMotif />);

  it('hides the motif from assistive tech (aria-hidden)', () => {
    expect(html).toMatch(/aria-hidden="true"/);
  });

  it('marks the inner SVG as presentational and unfocusable', () => {
    expect(html).toContain('role="presentation"');
    expect(html).toContain('focusable="false"');
  });

  it('exposes the .pcb-motif hook the divider CSS targets', () => {
    expect(html).toContain('class="pcb-motif"');
  });

  it('uses tokenised stripe / trace classes — no inline hex colours', () => {
    expect(html).toContain('pcb-motif-trace--copper');
    expect(html).toContain('pcb-motif-trace--data');
    expect(html).toContain('pcb-motif-stripe--1');
    expect(html).toContain('pcb-motif-stripe--2');
    expect(html).toContain('pcb-motif-stripe--3');
    expect(html).not.toMatch(/#[0-9a-f]{3,6}/i);
    expect(html).not.toMatch(/rgb\(/i);
  });

  it('renders at least three traces and several vias to read as a PCB', () => {
    const traces = html.match(/pcb-motif-trace/g) ?? [];
    const vias = html.match(/pcb-motif-via/g) ?? [];
    expect(traces.length).toBeGreaterThanOrEqual(3);
    expect(vias.length).toBeGreaterThanOrEqual(5);
  });

  it('forwards extra className without dropping the base hook', () => {
    const out = renderToStaticMarkup(<PcbMotif className="my-custom" />);
    expect(out).toMatch(/class="pcb-motif my-custom"/);
  });

  it('source file stays under the 4 KB editorial budget', () => {
    const src = readFileSync(
      join(process.cwd(), 'src', 'core', 'components', 'brand', 'PcbMotif.tsx'),
      'utf8',
    );
    expect(src.length).toBeLessThanOrEqual(4096);
  });
});

describe('globals.css — FEAT-038 PR 6 forced-colors + motif polish', () => {
  const CSS = readFileSync(join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');

  it('defines a forced-colors override on .pcb-motif', () => {
    expect(CSS).toMatch(/@media \(forced-colors: active\)\s*\{[\s\S]*?\.pcb-motif/);
  });

  it('remaps logo strokes to CanvasText under forced-colors', () => {
    expect(CSS).toMatch(/\.amg-logo[^{]*\{[^}]*CanvasText/);
  });

  it('uses color-mix on the rail so it tracks the theme palette', () => {
    expect(CSS).toMatch(/\.pcb-motif-rail\s*\{[^}]*color-mix\(in oklch/);
  });
});
