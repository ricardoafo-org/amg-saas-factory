import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CASE_STUDIES } from '../cases';

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

vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND'); } }));

import NovedadesPage from '../page';
import CaseStudyPage, { generateStaticParams } from '../[slug]/page';

const stripHtml = (html: string) =>
  html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

describe('/novedades index — FEAT-038 PR 8 contract', () => {
  const html = renderToStaticMarkup(<NovedadesPage />);
  const text = stripHtml(html);

  it('seeds at least 3 case studies', () => {
    expect(CASE_STUDIES.length).toBeGreaterThanOrEqual(3);
  });

  it('renders one card per seeded case', () => {
    const cards = html.match(/class="case-card"/g) ?? [];
    expect(cards.length).toBe(CASE_STUDIES.length);
  });

  it('every card links to /novedades/<slug>', () => {
    for (const c of CASE_STUDIES) {
      expect(html).toContain(`/novedades/${c.slug}`);
    }
  });

  it('uses Castilian Spanish — no voseo leaks', () => {
    expect(text).not.toMatch(/\btenés\b/i);
    expect(text).not.toMatch(/\bsabés\b/i);
    expect(text).not.toMatch(/\bacordate\b/i);
  });

  it('mounts the Navbar landmark', () => {
    expect(html).toContain('class="nav"');
  });
});

describe('/novedades/[slug] — FEAT-038 PR 8 contract', () => {
  it('exposes generateStaticParams with one entry per case', () => {
    const params = generateStaticParams();
    expect(params).toHaveLength(CASE_STUDIES.length);
    expect(params.every((p) => typeof p.slug === 'string' && p.slug.length > 0)).toBe(true);
  });

  it('renders a full case study with the Article JSON-LD wired', async () => {
    const element = await CaseStudyPage({
      params: Promise.resolve({ slug: CASE_STUDIES[0]!.slug }),
    });
    const html = renderToStaticMarkup(element);
    const ldMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    expect(ldMatch).toBeTruthy();
    const ld = JSON.parse(ldMatch![1]!);
    expect(ld['@type']).toBe('Article');
    expect(ld['headline']).toBe(CASE_STUDIES[0]!.headline);
    expect(ld['datePublished']).toBe(CASE_STUDIES[0]!.datePublished);
    expect(ld['author']['@type']).toBe('Person');
  });

  it('every case body has at least 4 sections so the Article reads as content', () => {
    for (const c of CASE_STUDIES) {
      expect(c.body.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('throws on unknown slugs (notFound path)', async () => {
    await expect(
      CaseStudyPage({ params: Promise.resolve({ slug: 'no-existe' }) }),
    ).rejects.toThrow('NOT_FOUND');
  });
});
