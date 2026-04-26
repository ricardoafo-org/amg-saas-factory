import Link from 'next/link';
import { PcbHero } from '@/core/components/brand/PcbHero';
import { Navbar } from '@/core/components/layout/Navbar';
import { Footer } from '@/core/components/Footer';
import { loadClientConfig } from '@/lib/config';

export const metadata = {
  title: 'Electrónica del automóvil — Talleres AMG · Cartagena',
  description:
    'Diagnóstico ECU, programación de llaves, calibración ADAS y baterías de híbridos y eléctricos. Especialistas en electrónica del automóvil en Cartagena, Murcia.',
  robots: { index: true, follow: true },
};

const TENANT_ID = process.env['TENANT_ID'] ?? 'talleres-amg';

const SUB_SERVICES = [
  {
    slug: 'diagnostico-ecu',
    title: 'Diagnóstico ECU',
    body: 'Lectura multi-protocolo, análisis en vivo y aislamiento del subsistema afectado.',
  },
  {
    slug: 'programacion-llaves',
    title: 'Programación de llaves',
    body: 'Codificación de transponder e inmovilizador para todas las marcas habituales.',
  },
  {
    slug: 'calibracion-adas',
    title: 'Calibración ADAS',
    body: 'Recalibración estática y dinámica tras sustitución de parabrisas o reparación frontal.',
  },
  {
    slug: 'baterias-hibridos-electricos',
    title: 'Híbridos y eléctricos',
    body: 'Diagnóstico de baterías de alta tensión y reparación de módulos de gestión.',
  },
] as const;

export default function ElectronicaPage() {
  const config = loadClientConfig(TENANT_ID);

  return (
    <>
      <Navbar config={config} />
      <main className="min-h-screen bg-background">
        <section className="mx-auto max-w-6xl px-5 py-16 space-y-12">
          <header className="space-y-4 max-w-2xl">
            <p className="text-xs font-mono uppercase tracking-widest text-primary">
              Electrónica del automóvil
            </p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              El taller donde la centralita se entiende.
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Diagnóstico electrónico real: lectura de códigos sí, pero también análisis
              en vivo, verificación con osciloscopio y comprobación física de cableado y
              conectores. Sin atajos, sin sustituciones a ciegas.
            </p>
          </header>

          <div
            className="rounded-[--radius-xl] border border-border/50 bg-card/40 p-4 md:p-8"
            style={{ contain: 'layout paint' }}
          >
            <PcbHero ariaLabel="Esquema estilizado de una placa de circuito impreso con conexiones OBD-II, CAN-FD, sensor y ADAS" />
          </div>

          <section className="grid gap-4 md:grid-cols-2">
            {SUB_SERVICES.map((svc) => (
              <Link
                key={svc.slug}
                href={`/electronica/${svc.slug}`}
                className="group block rounded-[--radius-lg] border border-border/50 bg-card/40 p-6 space-y-2 transition-colors hover:border-border"
              >
                <p className="text-xs font-mono uppercase tracking-widest text-primary">
                  {svc.slug.split('-').join(' · ')}
                </p>
                <h2 className="text-lg font-semibold text-foreground">{svc.title}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{svc.body}</p>
                <p className="text-xs font-mono uppercase tracking-widest text-foreground/70 pt-2 group-hover:text-foreground">
                  Saber más →
                </p>
              </Link>
            ))}
          </section>

          <section className="space-y-3 max-w-2xl">
            <h2 className="text-lg font-semibold text-foreground">¿Cómo trabajamos?</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Cada diagnóstico sigue el mismo proceso: lectura inicial, análisis en vivo,
              aislamiento del subsistema, verificación con instrumentación, comprobación
              física, reparación y validación. Lo contamos paso a paso en{' '}
              <Link className="underline" href="/proceso">
                /proceso
              </Link>
              .
            </p>
          </section>
        </section>
      </main>
      <Footer config={config} />
    </>
  );
}
