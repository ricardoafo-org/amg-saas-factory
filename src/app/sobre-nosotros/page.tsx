import { loadClientConfig } from '@/lib/config';

export const metadata = {
  title: 'Sobre nosotros — Talleres AMG',
  description:
    'Taller mecánico familiar en Cartagena desde 1987. Conoce nuestra historia, nuestro equipo y nuestra forma de cuidar tu coche.',
  robots: { index: true, follow: true },
};

export default function SobreNosotrosPage() {
  const config = loadClientConfig('talleres-amg');
  const { businessName, foundingYear, address } = config;
  const year = foundingYear ?? 1987;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-16 space-y-10">
        <header className="space-y-2 border-b border-border/50 pb-8">
          <p className="text-xs font-mono uppercase tracking-widest text-primary">Taller</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Sobre nosotros</h1>
          <p className="text-sm text-muted-foreground">
            Taller familiar en {address.city} desde {year}.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Quiénes somos</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {businessName} nace en {year} con una idea muy sencilla: tratar el coche del cliente
            como si fuera nuestro. Tres generaciones después, seguimos en {address.city}
            cuidando los coches del barrio con la misma honestidad del primer día.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Nuestro compromiso</h2>
          <ul className="list-disc pl-5 text-sm leading-relaxed text-muted-foreground space-y-2">
            <li>
              <strong className="text-foreground">Diagnóstico honesto.</strong> Te explicamos
              qué le pasa a tu coche y qué se puede esperar.
            </li>
            <li>
              <strong className="text-foreground">Presupuesto antes de tocar.</strong> Sin
              sorpresas. Tú decides.
            </li>
            <li>
              <strong className="text-foreground">Garantía real.</strong> 3 meses o 2.000 km en
              cada reparación, conforme al Real Decreto 1457/1986.
            </li>
            <li>
              <strong className="text-foreground">Trato cercano.</strong> Hablamos claro, sin
              tecnicismos innecesarios.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Dónde nos encontrarás</h2>
          <p className="text-sm text-muted-foreground">
            {address.street}, {address.postalCode} {address.city}, {address.region}.
          </p>
          <p className="text-sm text-muted-foreground">
            ¿Quieres saber más?{' '}
            <a className="underline" href="/#visitanos">
              Visítanos
            </a>{' '}
            o consulta{' '}
            <a className="underline" href="/como-trabajamos">
              cómo trabajamos
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
