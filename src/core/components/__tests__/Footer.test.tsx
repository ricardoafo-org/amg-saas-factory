import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { existsSync } from 'fs';
import { join } from 'path';
import { Footer } from '../Footer';
import type { LocalBusiness } from '@/core/types/adapter';

/**
 * BUG-011 regression: every footer link must resolve.
 *
 * - Anchor links must point to existing in-page section ids on `/`.
 * - Route links must map to a `src/app/<route>/page.tsx` file.
 * - The dead `#nosotros` anchor (no section with that id existed) must NOT come back.
 */

const fixture: LocalBusiness = {
  tenantId: 't',
  businessName: 'Talleres AMG',
  industry: 'automotive',
  foundingYear: 1987,
  address: {
    street: 'X',
    city: 'X',
    postalCode: '00000',
    region: 'X',
    country: 'ES',
    geo: { lat: 0, lng: 0 },
  },
  contact: { phone: '+34 0', email: 'a@b.c' },
  branding: { primaryColor: '#000', secondaryColor: '#000', fontFamily: 'sans-serif' },
  services: [],
  operatingHours: [],
  privacyPolicy: { url: '', version: '0.0.0', hash: '0'.repeat(64) },
  ivaRate: 0.21,
  locale: 'es-ES',
  currency: 'EUR',
};

const KNOWN_PAGE_ANCHOR_IDS = new Set([
  // ids declared on `/` in real components — keep this in sync if a section is renamed.
  'servicios',
  'visitanos',
]);

const REPO_ROOT = join(process.cwd(), 'src', 'app');

function pageFileForRoute(route: string): string {
  // Strip leading slash and any in-page #anchor; route segment after slash maps to a folder.
  const cleanRoute = route.replace(/^\//, '').split('#')[0]!.split('?')[0];
  if (cleanRoute === '' || cleanRoute === '/') return join(REPO_ROOT, 'page.tsx');
  return join(REPO_ROOT, cleanRoute, 'page.tsx');
}

function extractHrefs(html: string): string[] {
  const re = /href="([^"]+)"/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]!);
  return out;
}

describe('Footer — BUG-011 dead-link regression', () => {
  const html = renderToStaticMarkup(<Footer config={fixture} />);
  const hrefs = extractHrefs(html);

  it('renders some footer links', () => {
    // Service rows are now data-action="open-chat" buttons (audit row F1) and do
    // not contribute hrefs — the remaining hrefs are taller (3) + legal (4).
    expect(hrefs.length).toBeGreaterThanOrEqual(7);
  });

  it('contains no dead #nosotros anchors (target id never existed)', () => {
    const dead = hrefs.filter((h) => h === '#nosotros' || h.endsWith('#nosotros'));
    expect(dead).toEqual([]);
  });

  it('contains no empty href="#" placeholders', () => {
    expect(hrefs.includes('#')).toBe(false);
  });

  it('every in-page anchor points to an id known to exist on the homepage', () => {
    const anchors = hrefs.filter((h) => h.startsWith('#') || h.startsWith('/#'));
    for (const a of anchors) {
      const id = a.replace(/^\/?#/, '');
      expect(KNOWN_PAGE_ANCHOR_IDS.has(id)).toBe(true);
    }
  });

  it('every service row is a data-action="open-chat" button with a service id (F1)', () => {
    // Audit row F1: clicking a footer service link should open the chat preselected
    // to that service. Each service row carries data-service-id matching the
    // BUNDLE_SERVICES catalog.
    const expected = [
      'cambio-aceite',
      'frenos',
      'pre-itv',
      'neumaticos',
      'aire-acondicionado',
      'diagnostico-obd',
    ];
    for (const id of expected) {
      expect(html).toContain(`data-action="open-chat"`);
      expect(html).toContain(`data-service-id="${id}"`);
    }
  });

  it('no footer service row links via href to #servicios anymore', () => {
    // Drift guard — if a future edit reverts service rows back to <a href="#servicios">
    // this test fails before the PR can land.
    const serviciosAnchors = hrefs.filter((h) => h === '#servicios' || h === '/#servicios');
    expect(serviciosAnchors).toEqual([]);
  });

  it('every internal route href maps to an app-router page.tsx file', () => {
    const internalRoutes = hrefs.filter(
      (h) => h.startsWith('/') && !h.startsWith('/#') && !h.startsWith('//'),
    );
    expect(internalRoutes.length).toBeGreaterThan(0);
    for (const route of internalRoutes) {
      const file = pageFileForRoute(route);
      expect(existsSync(file), `Missing page for footer href "${route}" — expected ${file}`).toBe(
        true,
      );
    }
  });
});
