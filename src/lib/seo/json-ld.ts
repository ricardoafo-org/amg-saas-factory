/**
 * FEAT-038 PR 7 — Centralised JSON-LD generators.
 *
 * Per the spec (acceptance criterion #5 + #6) the /proceso depth page
 * emits HowTo and the /novedades case studies emit Article. Keep all
 * generators here so the schema stays consistent across surfaces.
 */

export interface HowToStepInput {
  name: string;
  text: string;
  url?: string;
  image?: string;
}

export interface HowToInput {
  name: string;
  description: string;
  totalTime: string;
  steps: HowToStepInput[];
  image?: string;
  supply?: string[];
  tool?: string[];
}

export function buildHowToJsonLd(input: HowToInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: input.name,
    description: input.description,
    totalTime: input.totalTime,
    ...(input.image ? { image: input.image } : {}),
    ...(input.supply && input.supply.length
      ? { supply: input.supply.map((s) => ({ '@type': 'HowToSupply', name: s })) }
      : {}),
    ...(input.tool && input.tool.length
      ? { tool: input.tool.map((t) => ({ '@type': 'HowToTool', name: t })) }
      : {}),
    step: input.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
      ...(s.url ? { url: s.url } : {}),
      ...(s.image ? { image: s.image } : {}),
    })),
  };
}

export interface ArticleInput {
  headline: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  publisherName: string;
  url: string;
  image?: string;
}

export function buildArticleJsonLd(input: ArticleInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    author: { '@type': 'Person', name: input.authorName },
    publisher: { '@type': 'Organization', name: input.publisherName },
    mainEntityOfPage: input.url,
    ...(input.image ? { image: input.image } : {}),
  };
}
