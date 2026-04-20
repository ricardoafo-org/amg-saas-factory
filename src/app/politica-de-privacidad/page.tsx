import { loadClientConfig } from '@/lib/config';

export const metadata = {
  title: 'Política de Privacidad — Talleres AMG',
  description: 'Información sobre el tratamiento de tus datos personales conforme a la LOPDGDD.',
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  const config = loadClientConfig('talleres-amg');
  const { businessName, address, contact, legal } = config;
  const cif = legal?.cif ?? 'B-30123456';
  const regNumber = legal?.registrationNumber ?? 'MU-1234';
  const dpoEmail = legal?.dpoEmail ?? contact.email;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-16 space-y-10">
        {/* Header */}
        <header className="space-y-2 border-b border-border/50 pb-8">
          <p className="text-xs font-mono uppercase tracking-widest text-primary">Legal</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Política de Privacidad
          </h1>
          <p className="text-sm text-muted-foreground">
            Última actualización: abril de 2026 · En cumplimiento de la LOPDGDD (Ley Orgánica
            3/2018) y el RGPD (Reglamento UE 2016/679).
          </p>
        </header>

        {/* 1. Responsable del tratamiento */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            1. Responsable del tratamiento
          </h2>
          <div className="rounded-[--radius-lg] border border-border/50 bg-card/40 p-5 space-y-2 text-sm text-muted-foreground">
            <div className="grid grid-cols-[140px_1fr] gap-1">
              <span className="font-medium text-foreground">Denominación social</span>
              <span>{businessName}</span>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-1">
              <span className="font-medium text-foreground">CIF</span>
              <span>{cif}</span>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-1">
              <span className="font-medium text-foreground">Domicilio</span>
              <span>
                {address.street}, {address.postalCode} {address.city}, {address.region}
              </span>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-1">
              <span className="font-medium text-foreground">Registro Talleres</span>
              <span>n.º {regNumber} — Región de Murcia</span>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-1">
              <span className="font-medium text-foreground">Correo electrónico</span>
              <span>
                <a href={`mailto:${contact.email}`} className="text-primary underline underline-offset-2">
                  {contact.email}
                </a>
              </span>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-1">
              <span className="font-medium text-foreground">Delegado de Protección</span>
              <span>
                <a href={`mailto:${dpoEmail}`} className="text-primary underline underline-offset-2">
                  {dpoEmail}
                </a>
              </span>
            </div>
          </div>
        </section>

        {/* 2. Finalidades y base jurídica */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            2. Finalidades del tratamiento y base jurídica
          </h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Tratamos los datos personales que nos facilitas para las siguientes finalidades:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 pr-4 font-semibold text-foreground">Finalidad</th>
                    <th className="text-left py-2 pr-4 font-semibold text-foreground">Base jurídica</th>
                    <th className="text-left py-2 font-semibold text-foreground">Datos tratados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  <tr>
                    <td className="py-2.5 pr-4">Gestión de citas y reparaciones</td>
                    <td className="py-2.5 pr-4">Ejecución de contrato (Art. 6.1.b RGPD)</td>
                    <td className="py-2.5">Nombre, teléfono, email, matrícula</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4">Emisión de presupuestos y facturas</td>
                    <td className="py-2.5 pr-4">Obligación legal (Art. 6.1.c RGPD)</td>
                    <td className="py-2.5">Nombre o razón social, NIF/CIF, dirección</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4">Comunicaciones comerciales</td>
                    <td className="py-2.5 pr-4">Consentimiento (Art. 6.1.a RGPD)</td>
                    <td className="py-2.5">Email, teléfono</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4">Recordatorio de ITV y mantenimientos</td>
                    <td className="py-2.5 pr-4">Interés legítimo (Art. 6.1.f RGPD)</td>
                    <td className="py-2.5">Email, matrícula, fecha primera matriculación</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 3. Destinatarios */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            3. Destinatarios de los datos
          </h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              No cedemos tus datos a terceros salvo obligación legal. Utilizamos los siguientes
              encargados del tratamiento:
            </p>
            <ul className="space-y-2 pl-4 list-none">
              <li className="flex gap-3">
                <span className="text-primary mt-0.5 shrink-0">·</span>
                <span>
                  <strong className="text-foreground">Resend Inc.</strong> — envío de
                  confirmaciones de cita por email. Servidor en EE.UU. con Cláusulas
                  Contractuales Tipo (SCCs).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary mt-0.5 shrink-0">·</span>
                <span>
                  <strong className="text-foreground">Twilio Inc.</strong> — envío de SMS de
                  recordatorio. Servidor en EE.UU. con SCCs aplicables.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary mt-0.5 shrink-0">·</span>
                <span>
                  <strong className="text-foreground">Sentry (Functional Software, Inc.)</strong>{' '}
                  — registro de errores de la aplicación. No procesa datos de usuarios finales de
                  forma directa; los trazos se anonimizan. Servidor en EE.UU. con SCCs.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* 4. Transferencias internacionales */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            4. Transferencias internacionales
          </h2>
          <p className="text-sm text-muted-foreground">
            Resend, Twilio y Sentry tienen sede en Estados Unidos. Las transferencias se amparan en
            las Cláusulas Contractuales Tipo aprobadas por la Comisión Europea (Decisión de
            Ejecución UE 2021/914). Puedes solicitar copia de las garantías aplicables
            contactando con nosotros en{' '}
            <a href={`mailto:${dpoEmail}`} className="text-primary underline underline-offset-2">
              {dpoEmail}
            </a>
            .
          </p>
        </section>

        {/* 5. Plazos de conservación */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            5. Plazos de conservación
          </h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <ul className="space-y-2 pl-4 list-none">
              <li className="flex gap-3">
                <span className="text-primary mt-0.5 shrink-0">·</span>
                <span>
                  <strong className="text-foreground">Datos de citas y reparaciones:</strong>{' '}
                  5 años desde la prestación del servicio (Art. 30 Código de Comercio).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary mt-0.5 shrink-0">·</span>
                <span>
                  <strong className="text-foreground">Registros de consentimiento:</strong>{' '}
                  3 años desde que se otorgó el consentimiento (Art. 17 RGPD y
                  Art. 12.2 LOPDGDD).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary mt-0.5 shrink-0">·</span>
                <span>
                  <strong className="text-foreground">Facturas:</strong> 4 años (obligación
                  fiscal, Art. 30 Cco).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary mt-0.5 shrink-0">·</span>
                <span>
                  <strong className="text-foreground">Comunicaciones comerciales:</strong> hasta
                  que retires el consentimiento.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* 6. Derechos */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            6. Tus derechos (ARCO + Portabilidad + Limitación)
          </h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Puedes ejercer los siguientes derechos enviando un email a{' '}
              <a href={`mailto:${dpoEmail}`} className="text-primary underline underline-offset-2">
                {dpoEmail}
              </a>{' '}
              con copia de tu DNI o documento identificativo:
            </p>
            <ul className="grid sm:grid-cols-2 gap-2 pl-0 list-none mt-3">
              {[
                ['Acceso', 'Obtener copia de tus datos.'],
                ['Rectificación', 'Corregir datos inexactos o incompletos.'],
                ['Supresión', 'Solicitar la eliminación de tus datos cuando ya no sean necesarios.'],
                ['Oposición', 'Oponerte al tratamiento basado en interés legítimo.'],
                ['Portabilidad', 'Recibir tus datos en formato estructurado y legible.'],
                ['Limitación', 'Solicitar que suspendamos el tratamiento en determinados casos.'],
              ].map(([title, desc]) => (
                <li
                  key={title}
                  className="rounded-[--radius-lg] border border-border/50 bg-card/30 px-4 py-3"
                >
                  <p className="font-semibold text-foreground text-xs mb-1">{title}</p>
                  <p className="text-[11px] leading-relaxed">{desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 7. Reclamaciones */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">7. Reclamaciones ante la AEPD</h2>
          <p className="text-sm text-muted-foreground">
            Si consideras que el tratamiento de tus datos vulnera la normativa vigente, tienes
            derecho a presentar una reclamación ante la Agencia Española de Protección de Datos
            (AEPD) en{' '}
            <a
              href="https://www.aepd.es"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:brightness-125"
            >
              aepd.es
            </a>
            .
          </p>
        </section>

        {/* 8. Cookies */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">8. Cookies</h2>
          <p className="text-sm text-muted-foreground">
            Este sitio web utiliza cookies propias y de terceros. Para más información consulta
            nuestra{' '}
            <a
              href="/politica-de-cookies"
              className="text-primary underline underline-offset-2 hover:brightness-125"
            >
              Política de Cookies
            </a>
            .
          </p>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/50 pt-6 text-[11px] text-muted-foreground/50 font-mono">
          {businessName} · CIF {cif} · {address.street}, {address.postalCode} {address.city}
        </footer>
      </div>
    </main>
  );
}
