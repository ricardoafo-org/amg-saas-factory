import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navbar } from '@/core/components/layout/Navbar';
import { Footer } from '@/core/components/Footer';
import { loadClientConfig } from '@/lib/config';
import { CASE_STUDIES } from '../cases';
import { buildArticleJsonLd } from '@/lib/seo/json-ld';

const TENANT_ID = process.env['TENANT_ID'] ?? 'talleres-amg';
const SITE = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://talleres-amg.test';

interface Params { slug: string }

export function generateStaticParams() {
  return CASE_STUDIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const study = CASE_STUDIES.find((c) => c.slug === slug);
  if (!study) return { title: 'Caso no encontrado — Talleres AMG' };
  return {
    title: `${study.headline} — Talleres AMG · Cartagena`,
    description: study.excerpt,
    robots: { index: true, follow: true },
  };
}

export default async function CaseStudyPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const study = CASE_STUDIES.find((c) => c.slug === slug);
  if (!study) notFound();

  const config = loadClientConfig(TENANT_ID);
  const url = `${SITE}/novedades/${study.slug}`;

  const articleLd = buildArticleJsonLd({
    headline: study.headline,
    description: study.excerpt,
    datePublished: study.datePublished,
    authorName: 'Talleres AMG',
    publisherName: 'Talleres AMG · Cartagena',
    url,
    image: study.image,
  });

  return (
    <>
      <Navbar config={config} />
      <main className="case-page paper">
        <article className="case-inner">
          <header className="case-header">
            <p className="case-eyebrow">
              <Link href="/novedades">Novedades</Link>
              <span aria-hidden="true"> · </span>
              <span>{study.tag}</span>
              <span aria-hidden="true"> · </span>
              <time dateTime={study.datePublished}>{study.dateLabel}</time>
            </p>
            <h1 className="case-title">{study.headline}</h1>
            <p className="case-lead">{study.excerpt}</p>
          </header>

          <figure className="case-figure">
            <Image
              src={study.image}
              alt={study.imageAlt}
              width={1280}
              height={720}
              sizes="(max-width: 960px) 100vw, 800px"
              className="case-photo"
              priority
            />
          </figure>

          {study.body.map((section) => (
            <section key={section.heading} className="case-section">
              <h2>{section.heading}</h2>
              {section.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </section>
          ))}

          <footer className="case-footer">
            <p>
              ¿Tienes un caso parecido?{' '}
              <a href={`tel:${config.contact.phone}`} className="case-link">
                Llámanos
              </a>{' '}
              o{' '}
              <Link href="/proceso" className="case-link">
                lee cómo trabajamos
              </Link>
              .
            </p>
          </footer>
        </article>
      </main>
      <Footer config={config} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
    </>
  );
}
