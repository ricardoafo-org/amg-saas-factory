import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '@/core/components/layout/Navbar';
import { Footer } from '@/core/components/Footer';
import { loadClientConfig } from '@/lib/config';
import { CASE_STUDIES } from './cases';

export const metadata = {
  title: 'Novedades · Casos reales — Talleres AMG · Cartagena',
  description:
    'Casos reales de diagnóstico electrónico resueltos en Talleres AMG: averías eléctricas, ECU, ADAS y batería híbrida. Cómo lo identificamos, qué medimos y cómo lo arreglamos.',
  robots: { index: true, follow: true },
};

const TENANT_ID = process.env['TENANT_ID'] ?? 'talleres-amg';

export default function NovedadesPage() {
  const config = loadClientConfig(TENANT_ID);

  return (
    <>
      <Navbar config={config} />
      <main className="novedades-page paper">
        <div className="novedades-inner">
          <header className="novedades-header">
            <p className="novedades-eyebrow">Novedades · Casos reales</p>
            <h1 className="novedades-title">
              Lo que <em>vemos</em> en el taller
            </h1>
            <p className="novedades-lead">
              Tres casos recientes de diagnóstico electrónico, contados sin marketing y sin
              jerga. Lo que nos dijo el cliente, lo que medimos, lo que cambiamos y por qué.
            </p>
          </header>

          <ul className="novedades-grid">
            {CASE_STUDIES.map((c) => (
              <li key={c.slug} className="case-card">
                <Link href={`/novedades/${c.slug}`} className="case-card-link">
                  <Image
                    src={c.image}
                    alt={c.imageAlt}
                    width={1280}
                    height={720}
                    sizes="(max-width: 720px) 100vw, 380px"
                    className="case-card-photo"
                  />
                  <div className="case-card-body">
                    <p className="case-card-meta">
                      <span>{c.tag}</span>
                      <span aria-hidden="true"> · </span>
                      <time dateTime={c.datePublished}>{c.dateLabel}</time>
                    </p>
                    <h2 className="case-card-title">{c.headline}</h2>
                    <p className="case-card-excerpt">{c.excerpt}</p>
                    <span className="case-card-cta">Leer caso completo →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer config={config} />
    </>
  );
}
