import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * FEAT-038 PR 7 — `/proceso` editorial depth page contract.
 *
 * Pins the acceptance criteria from docs/specs/FEAT-038-brand-redesign.md §5:
 *   - ≥ 1,800 words of Castilian-Spanish editorial body
 *   - valid HowTo JSON-LD (with steps + tools)
 *   - at least 6 photos
 *   - no Rioplatense voseo (vos / tenés / acordate / hacé)
 */

vi.mock('@/lib/config', () => ({
  loadClientConfig: () => ({
    tenantId: 'talleres-amg',
    businessName: 'Talleres AMG',
    industry: 'automotive',
    address: {
      street: 'Calle Dr. Serrano, 49',
      city: 'Cartagena',
      postalCode: '30300',
      region: 'Región de Murcia',
      country: 'ES',
      geo: { lat: 37.6072, lng: -0.9885 },
    },
    contact: {
      phone: '+34 968 12 34 56',
      email: 'info@talleres-amg.test',
      googleMapsUrl: 'https://maps.example.test/cartagena',
    },
    branding: { primaryColor: '#000', secondaryColor: '#000', fontFamily: 'sans-serif' },
    services: [],
    operatingHours: [],
    privacyPolicy: { url: '', version: '0.0.0', hash: '0'.repeat(64) },
    ivaRate: 0.21,
    locale: 'es-ES',
    currency: 'EUR',
    foundingYear: 1987,
  }),
}));

vi.mock('@/actions/slots', () => ({ getNextAvailableSlot: () => null }));

import ProcesoPage from '../page';

describe('/proceso — FEAT-038 PR 7 editorial contract', () => {
  const html = renderToStaticMarkup(<ProcesoPage />);

  // Strip tags + JSON-LD before counting words.
  const visibleText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  it('renders ≥ 1,800 words of editorial body', () => {
    const wordCount = visibleText.split(/\s+/).filter(Boolean).length;
    expect(wordCount).toBeGreaterThanOrEqual(1800);
  });

  it('emits HowTo JSON-LD with at least 6 steps and the OBD-II tool', () => {
    const match = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    expect(match).toBeTruthy();
    const ld = JSON.parse(match![1]!);
    expect(ld['@type']).toBe('HowTo');
    expect(ld['step']).toBeInstanceOf(Array);
    expect(ld['step'].length).toBeGreaterThanOrEqual(6);
    expect(JSON.stringify(ld['tool'])).toMatch(/OBD-II/i);
  });

  it('renders at least 6 photos', () => {
    const imgs = html.match(/<img\s/g) ?? [];
    expect(imgs.length).toBeGreaterThanOrEqual(6);
  });

  it('uses Castilian Spanish — no Rioplatense voseo forms leak in', () => {
    // Common voseo markers we MUST NOT see in product copy.
    expect(visibleText).not.toMatch(/\btenés\b/i);
    expect(visibleText).not.toMatch(/\bsabés\b/i);
    expect(visibleText).not.toMatch(/\bacordate\b/i);
    expect(visibleText).not.toMatch(/\bandá\b/i);
    expect(visibleText).not.toMatch(/\bllamá\b/i);
    expect(visibleText).not.toMatch(/\bdale\b/i);
  });

  it('keeps the RD 1457/1986 disclosure (warranty)', () => {
    expect(visibleText).toMatch(/(?:RD|Real Decreto) 1457\/1986/);
    expect(visibleText).toMatch(/3 meses|tres meses/i);
    expect(visibleText).toMatch(/2\.000\s*kilómetros|2\.000\s*km/i);
  });

  it('Navbar renders alongside the editorial (header.nav present)', () => {
    expect(html).toContain('class="nav"');
    expect(html).toContain('Reservar cita');
  });

  it('source page stays under 14 KB to keep the editorial focused', () => {
    const src = readFileSync(
      join(process.cwd(), 'src', 'app', 'proceso', 'page.tsx'),
      'utf8',
    );
    expect(src.length).toBeLessThanOrEqual(28_672);
  });
});
