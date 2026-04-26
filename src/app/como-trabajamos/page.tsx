import Link from 'next/link';
import { loadClientConfig } from '@/lib/config';

export const metadata = {
  title: 'Cómo trabajamos — Talleres AMG',
  description:
    'Diagnóstico, presupuesto transparente, reparación y garantía. Así trabajamos en Talleres AMG, sin sorpresas.',
  robots: { index: true, follow: true },
};

const STEPS = [
  {
    n: '01',
    title: 'Diagnóstico',
    body: 'Revisamos tu coche y escuchamos lo que has notado. Te explicamos qué le pasa con palabras claras.',
  },
  {
    n: '02',
    title: 'Presupuesto transparente',
    body: 'Antes de tocar nada, te enviamos el presupuesto detallado con IVA incluido. Tú decides si seguimos adelante.',
  },
  {
    n: '03',
    title: 'Reparación',
    body: 'Trabajamos con repuestos de calidad y te avisamos en cuanto el coche está listo. Si surge algo nuevo durante la intervención, te llamamos antes de continuar.',
  },
  {
    n: '04',
    title: 'Garantía',
    body: '3 meses o 2.000 kilómetros en cada reparación, conforme al Real Decreto 1457/1986. Si algo falla en ese plazo, lo arreglamos sin coste.',
  },
];

export default function ComoTrabajamosPage() {
  const config = loadClientConfig('talleres-amg');
  const { ivaRate } = config;
  const ivaPct = Math.round(ivaRate * 100);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-16 space-y-10">
        <header className="space-y-2 border-b border-border/50 pb-8">
          <p className="text-xs font-mono uppercase tracking-widest text-primary">Taller</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Cómo trabajamos</h1>
          <p className="text-sm text-muted-foreground">
            Cuatro pasos. Sin sorpresas. Con la honestidad por delante.
          </p>
        </header>

        <section className="space-y-6">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="rounded-[--radius-lg] border border-border/50 bg-card/40 p-6 space-y-2"
            >
              <p className="text-xs font-mono uppercase tracking-widest text-primary">
                {step.n}
              </p>
              <h2 className="text-lg font-semibold text-foreground">{step.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Transparencia con el IVA</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Todos los precios que ves en la web y en el presupuesto incluyen el {ivaPct}% de IVA
            general aplicable a las reparaciones de vehículos en España. En el desglose verás
            siempre la base imponible y el IVA por separado.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">¿Listo para empezar?</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Pide cita por{' '}
            <Link className="underline" href="/#servicios">
              uno de nuestros servicios
            </Link>{' '}
            o{' '}
            <Link className="underline" href="/#visitanos">
              ven a visitarnos
            </Link>
            . Si tienes dudas, escríbenos por WhatsApp y te respondemos en 15 minutos en
            horario laboral.
          </p>
        </section>
      </div>
    </main>
  );
}
