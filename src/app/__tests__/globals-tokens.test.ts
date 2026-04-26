import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * FEAT-038 PR 3 — Type & Easing token contract.
 *
 * globals.css is the single source of design tokens. This test pins the
 * decisions taken in the brand redesign so a stylistic refactor can't
 * silently drift them back to defaults.
 */

const CSS = readFileSync(
  join(process.cwd(), 'src', 'app', 'globals.css'),
  'utf8',
);

describe('globals.css — FEAT-038 token contract', () => {
  it('--ease-out is material-standard (cubic-bezier(0.4, 0, 0.2, 1))', () => {
    expect(CSS).toMatch(/--ease-out:\s*cubic-bezier\(0\.4,\s*0,\s*0\.2,\s*1\)/);
  });

  it('--ease-mech is expo-out mechanical (cubic-bezier(0.16, 1, 0.3, 1))', () => {
    expect(CSS).toMatch(/--ease-mech:\s*cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/);
  });

  it('--surface-card-hover defined as 8% amber over card', () => {
    expect(CSS).toMatch(/--surface-card-hover:\s*color-mix\(in oklch,\s*var\(--color-card\)\s*92%,\s*var\(--color-brand-amber\)\s*8%\)/);
  });

  it('--color-pcb-chip defined and matches brand silver value', () => {
    expect(CSS).toMatch(/--color-pcb-chip:\s*oklch\(0\.78\s+0\.005\s+80\)/);
  });

  it('hero headline uses font-variation-settings opsz 72', () => {
    expect(CSS).toMatch(/font-variation-settings:\s*"opsz"\s*72/);
  });

  it('mono surfaces explicitly enable ss01 (machined digits)', () => {
    expect(CSS).toMatch(/code,\s*kbd,\s*samp,\s*pre,\s*\.font-mono[^{]*\{\s*[^}]*font-feature-settings:\s*"ss01"\s*1/);
  });

  it('.svc-card hover applies the heat surface', () => {
    expect(CSS).toMatch(/\.svc-card:hover\s*\{[^}]*background:\s*var\(--surface-card-hover\)/);
  });
});
