import { loadClientConfig } from '@/lib/config';

export const metadata = {
  title: 'Aviso Legal — Talleres AMG',
  description:
    'Información legal del titular del sitio web conforme a la LSSI-CE (Ley 34/2002).',
  robots: { index: true, follow: true },
};

export default function AvisoLegalPage() {
  const config = loadClientConfig('talleres-amg');
  const { businessName, address, contact, legal } = config;
  const cif = legal?.cif ?? 'B-30123456';
  const regNumber = legal?.registrationNumber ?? 'MU-1234';
  const dpoEmail = legal?.dpoEmail ?? contact.email;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-16 space-y-10">
        <header className="space-y-2 border-b border-border/50 pb-8">
          <p className="text-xs font-mono uppercase tracking-widest text-primary">Legal</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Aviso Legal</h1>
          <p className="text-sm text-muted-foreground">
            Última actualización: abril de 2026 · En cumplimiento de la LSSI-CE (Ley 34/2002, de
            Servicios de la Sociedad de la Información y Comercio Electrónico).
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">1. Datos identificativos del titular</h2>
          <div className="rounded-[--radius-lg] border border-border/50 bg-card/40 p-5 space-y-2 text-sm text-muted-foreground">
            <div className="grid grid-cols-[160px_1fr] gap-1">
              <span className="font-medium text-foreground">Denominación social</span>
              <span>{businessName}</span>
            </div>
            <div className="grid grid-cols-[160px_1fr] gap-1">
              <span className="font-medium text-foreground">CIF</span>
              <span>{cif}</span>
            </div>
            <div className="grid grid-cols-[160px_1fr] gap-1">
              <span className="font-medium text-foreground">Domicilio</span>
              <span>
                {address.street}, {address.postalCode} {address.city}, {address.region}
              </span>
            </div>
            <div className="grid grid-cols-[160px_1fr] gap-1">
              <span className="font-medium text-foreground">Inscripción registral</span>
              <span>{regNumber}</span>
            </div>
            <div className="grid grid-cols-[160px_1fr] gap-1">
              <span className="font-medium text-foreground">Teléfono</span>
              <span>{contact.phone}</span>
            </div>
            <div className="grid grid-cols-[160px_1fr] gap-1">
              <span className="font-medium text-foreground">Correo electrónico</span>
              <span>{contact.email}</span>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">2. Objeto</h2>
          <p className="text-sm text-muted-foreground">
            El presente aviso legal regula el uso del sitio web de {businessName}. La navegación
            por este sitio implica la aceptación plena y sin reservas de las disposiciones aquí
            recogidas. Si no está conforme con cualquiera de las cláusulas, le rogamos que no
            utilice este sitio web.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">3. Condiciones de uso</h2>
          <p className="text-sm text-muted-foreground">
            El usuario se compromete a hacer un uso adecuado de los contenidos y servicios
            ofrecidos a través del sitio web y a no emplearlos para incurrir en actividades
            ilícitas o contrarias a la buena fe y al ordenamiento legal. Queda prohibida la
            difusión de contenidos de carácter racista, xenófobo, pornográfico o que atenten
            contra los derechos humanos.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">4. Propiedad intelectual</h2>
          <p className="text-sm text-muted-foreground">
            Todos los contenidos del sitio web (textos, imágenes, logotipos, diseño gráfico,
            código fuente) son titularidad de {businessName} o cuentan con la correspondiente
            autorización para su uso. Queda prohibida su reproducción total o parcial sin
            autorización expresa.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">5. Exclusión de responsabilidad</h2>
          <p className="text-sm text-muted-foreground">
            {businessName} no se hace responsable de los daños y perjuicios que pudieran
            derivarse de interferencias, omisiones, interrupciones, virus informáticos, averías
            telefónicas o desconexiones en el funcionamiento operativo del sistema electrónico,
            motivadas por causas ajenas a {businessName}.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">6. Legislación aplicable y jurisdicción</h2>
          <p className="text-sm text-muted-foreground">
            La relación entre {businessName} y el usuario se regirá por la normativa española
            vigente. Para resolver cualquier controversia, ambas partes se someten a los
            Juzgados y Tribunales de Cartagena, salvo que la legislación aplicable disponga
            otra jurisdicción.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">7. Contacto</h2>
          <p className="text-sm text-muted-foreground">
            Para cualquier consulta relacionada con este aviso legal, puede dirigirse a{' '}
            <a className="underline" href={`mailto:${dpoEmail}`}>
              {dpoEmail}
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
