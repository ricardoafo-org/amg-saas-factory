import { loadClientConfig } from '@/lib/config';
import { getTenantId } from '@/lib/tenant';

export const metadata = {
  title: 'Hojas de Reclamaciones — Talleres AMG',
  description:
    'Información sobre hojas de reclamaciones a disposición de los clientes conforme a la normativa de consumo de la Región de Murcia.',
  robots: { index: true, follow: true },
};

export default function ReclamacionesPage() {
  const config = loadClientConfig(getTenantId());
  const { businessName, address, contact } = config;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-16 space-y-10">
        <header className="space-y-2 border-b border-border/50 pb-8">
          <p className="text-xs font-mono uppercase tracking-widest text-primary">Legal</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Hojas de Reclamaciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Última actualización: abril de 2026 · Conforme al Decreto 3/2014, de 31 de enero,
            por el que se regulan las hojas de reclamaciones en la Comunidad Autónoma de la
            Región de Murcia.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">1. Disponibilidad</h2>
          <p className="text-sm text-muted-foreground">
            En cumplimiento de la normativa de consumo, {businessName} dispone de hojas de
            reclamaciones oficiales a disposición de los clientes. Puede solicitarlas en
            nuestras instalaciones o por teléfono.
          </p>
          <div className="rounded-[--radius-lg] border border-border/50 bg-card/40 p-5 space-y-2 text-sm text-muted-foreground">
            <div className="grid grid-cols-[140px_1fr] gap-1">
              <span className="font-medium text-foreground">Domicilio</span>
              <span>
                {address.street}, {address.postalCode} {address.city}, {address.region}
              </span>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-1">
              <span className="font-medium text-foreground">Teléfono</span>
              <span>{contact.phone}</span>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-1">
              <span className="font-medium text-foreground">Correo electrónico</span>
              <span>{contact.email}</span>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">2. Cómo presentar una reclamación</h2>
          <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-2">
            <li>Solicite una hoja de reclamaciones en nuestras instalaciones.</li>
            <li>Cumplimente todos los apartados con sus datos y la descripción de los hechos.</li>
            <li>Quédese con su copia (rosa) y entréguenos las copias blanca y verde.</li>
            <li>
              Puede remitir la copia rosa al organismo competente: Dirección General de Consumo
              de la Región de Murcia.
            </li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">3. Resolución alternativa de litigios (RAL)</h2>
          <p className="text-sm text-muted-foreground">
            Conforme al Reglamento UE 524/2013 sobre resolución de litigios en línea, ponemos a
            su disposición la plataforma europea de resolución de litigios:{' '}
            <a
              className="underline"
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://ec.europa.eu/consumers/odr
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">4. Contacto previo</h2>
          <p className="text-sm text-muted-foreground">
            Antes de presentar una reclamación formal, le animamos a contactarnos directamente.
            Trabajamos para resolver cualquier incidencia de forma rápida y satisfactoria. Puede
            escribirnos a{' '}
            <a className="underline" href={`mailto:${contact.email}`}>
              {contact.email}
            </a>{' '}
            o llamarnos al {contact.phone}.
          </p>
        </section>
      </div>
    </main>
  );
}
