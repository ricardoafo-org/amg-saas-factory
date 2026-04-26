import { describe, it, expect } from 'vitest';
import { buildHowToJsonLd, buildArticleJsonLd } from '../json-ld';

describe('buildHowToJsonLd', () => {
  const minimal = buildHowToJsonLd({
    name: 'Cómo hacemos un diagnóstico',
    description: 'Proceso de diagnóstico electrónico paso a paso.',
    totalTime: 'PT2H',
    steps: [
      { name: 'Paso 1', text: 'Escuchar al cliente.' },
      { name: 'Paso 2', text: 'Leer códigos OBD-II.' },
    ],
  });

  it('emits schema.org HowTo with required @context + @type', () => {
    expect(minimal['@context']).toBe('https://schema.org');
    expect(minimal['@type']).toBe('HowTo');
  });

  it('numbers steps starting at position 1', () => {
    const steps = minimal['step'] as Array<Record<string, unknown>>;
    expect(steps).toHaveLength(2);
    expect(steps[0]?.['@type']).toBe('HowToStep');
    expect(steps[0]?.['position']).toBe(1);
    expect(steps[1]?.['position']).toBe(2);
  });

  it('omits supply/tool keys entirely when not provided (no empty arrays)', () => {
    expect('supply' in minimal).toBe(false);
    expect('tool' in minimal).toBe(false);
    expect('image' in minimal).toBe(false);
  });

  it('wraps supply + tool entries with their schema.org types', () => {
    const ld = buildHowToJsonLd({
      name: 'X',
      description: 'X',
      totalTime: 'PT1H',
      supply: ['Hoja de orden'],
      tool: ['OBD-II', 'Osciloscopio'],
      steps: [{ name: 's', text: 't' }],
    });
    expect(ld['supply']).toEqual([{ '@type': 'HowToSupply', name: 'Hoja de orden' }]);
    expect(ld['tool']).toEqual([
      { '@type': 'HowToTool', name: 'OBD-II' },
      { '@type': 'HowToTool', name: 'Osciloscopio' },
    ]);
  });
});

describe('buildArticleJsonLd', () => {
  it('emits schema.org Article and defaults dateModified to datePublished', () => {
    const ld = buildArticleJsonLd({
      headline: 'Caso 1',
      description: 'desc',
      datePublished: '2026-04-26',
      authorName: 'Talleres AMG',
      publisherName: 'Talleres AMG',
      url: 'https://example.test/novedades/caso-1',
    });
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('Article');
    expect(ld['dateModified']).toBe('2026-04-26');
    expect((ld['author'] as Record<string, unknown>)['@type']).toBe('Person');
    expect((ld['publisher'] as Record<string, unknown>)['@type']).toBe('Organization');
  });
});
