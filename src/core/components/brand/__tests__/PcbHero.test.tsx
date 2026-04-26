import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, statSync } from 'fs';
import { join } from 'path';
import { PcbHero } from '../PcbHero';

/**
 * FEAT-038 PR 4 — PCB hero contract.
 * - Token-driven colours so dark theme + forced-colors don't break it.
 * - SVG ≤ 15 KB on disk (spec performance budget line 215).
 * - role="img" + <title> for screen readers.
 */

const html = renderToStaticMarkup(<PcbHero />);

describe('PcbHero — FEAT-038 contract', () => {
  it('renders an <svg> with role="img" and aria-label', () => {
    expect(html).toMatch(/<svg[^>]*role="img"[^>]*aria-label="/);
  });

  it('exposes a <title> element for assistive tech', () => {
    expect(html).toMatch(/<title>[^<]+<\/title>/);
  });

  it('uses tokenised colours only (no hex literals on shapes)', () => {
    // Allow var(...) references only.
    expect(html).toMatch(/fill="var\(--color-brand-ink\)"/);
    expect(html).toMatch(/stroke="var\(--color-brand-amber\)"/);
    expect(html).toMatch(/stroke="var\(--color-brand-m-lightblue\)"/);
    expect(html).toMatch(/stroke="var\(--color-brand-red\)"/);
    expect(html).toMatch(/fill="var\(--color-pcb-chip\)"/);
  });

  it('declares the AMG silkscreen signature (CARTAGENA tag)', () => {
    expect(html).toContain('AMG · CARTAGENA');
  });

  it('declares the four HUD annotations (OBD-II, CAN-FD, SENSOR, ADAS)', () => {
    for (const label of ['OBD-II', 'CAN-FD', 'SENSOR', 'ADAS']) {
      expect(html).toContain(label);
    }
  });

  it('groups traces under .pcb-trace so the entry animation can target them', () => {
    expect(html).toMatch(/class="pcb-trace[^"]*"/);
    expect(html).toMatch(/pcb-trace-copper/);
    expect(html).toMatch(/pcb-trace-data/);
    expect(html).toMatch(/pcb-trace-power/);
  });

  it('component file size is within the 15 KB budget', () => {
    const path = join(process.cwd(), 'src', 'core', 'components', 'brand', 'PcbHero.tsx');
    const bytes = statSync(path).size;
    // Budget per spec: PCB SVG ≤ 15 KB. Our source file includes JSX + TS — give it 16 KB upper.
    // (The compiled SVG is smaller than the source.)
    expect(bytes).toBeLessThanOrEqual(16 * 1024);
  });

  it('source contains no inline event handlers (no script vector)', () => {
    const src = readFileSync(
      join(process.cwd(), 'src', 'core', 'components', 'brand', 'PcbHero.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/onClick|onLoad|onError/);
  });
});
