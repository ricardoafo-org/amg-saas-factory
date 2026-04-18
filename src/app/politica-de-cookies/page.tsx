import { loadClientConfig } from '@/lib/config';

export const metadata = {
  title: 'Política de Cookies — Talleres AMG',
  description: 'Información sobre las cookies utilizadas en este sitio web conforme a la LSSI-CE.',
  robots: { index: true, follow: true },
};

export default function CookiePolicyPage() {
  const config = loadClientConfig('talleres-amg');
  const { businessName, contact } = config;
  const dpoEmail = config.legal?.dpoEmail ?? contact.email;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-16 space-y-10">
        {/* Header */}
        <header className="space-y-2 border-b border-border/50 pb-8">
          <p className="text-xs font-mono uppercase tracking-widest text-primary">Legal</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Política de Cookies
          </h1>
          <p className="text-sm text-muted-foreground">
            Última actualización: abril de 2026 · En cumplimiento de la LSSI-CE (Ley 34/2002) y
            la Guía de Cookies de la AEPD 2023.
          </p>
        </header>

        {/* ¿Qué son las cookies? */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">¿Qué son las cookies?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Las cookies son pequeños archivos de texto que los sitios web almacenan en tu
            dispositivo cuando los visitas. Permiten que el sitio recuerde tus preferencias y
            mejore tu experiencia. Según la LSSI-CE, las cookies no estrictamente necesarias
            requieren tu consentimiento previo e informado.
          </p>
        </section>

        {/* Cookies que utilizamos */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Cookies que utilizamos</h2>

          {/* Necesarias */}
          <div className="rounded-[--radius-lg] border border-border/50 bg-card/40 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border-b border-border/50">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
                Siempre activas
              </span>
              <h3 className="text-sm font-semibold text-foreground">Cookies necesarias</h3>
            </div>
            <div className="p-4 space-y-3 text-sm text-muted-foreground">
              <p>
                Son imprescindibles para el correcto funcionamiento del sitio. No pueden
                desactivarse. No almacenan información personal identificable.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/40">
                      <th className="text-left py-2 pr-4 font-semibold text-foreground">Nombre</th>
                      <th className="text-left py-2 pr-4 font-semibold text-foreground">Proveedor</th>
                      <th className="text-left py-2 pr-4 font-semibold text-foreground">Finalidad</th>
                      <th className="text-left py-2 font-semibold text-foreground">Duración</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    <tr>
                      <td className="py-2 pr-4 font-mono">pb_auth</td>
                      <td className="py-2 pr-4">PocketBase (propio)</td>
                      <td className="py-2 pr-4">Sesión autenticada del chatbot de reservas</td>
                      <td className="py-2">Sesión</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-mono">amg_cookie_consent</td>
                      <td className="py-2 pr-4">Local Storage (propio)</td>
                      <td className="py-2 pr-4">Guarda tus preferencias de cookies para no mostrar el aviso en cada visita</td>
                      <td className="py-2">Permanente hasta borrar datos</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Analíticas */}
          <div className="rounded-[--radius-lg] border border-border/50 bg-card/40 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-card/60 border-b border-border/50">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-secondary text-secondary-foreground border border-border">
                Opcional
              </span>
              <h3 className="text-sm font-semibold text-foreground">Cookies analíticas</h3>
            </div>
            <div className="p-4 space-y-3 text-sm text-muted-foreground">
              <p>
                Nos permiten medir el tráfico y el comportamiento de los usuarios para mejorar el
                servicio. Solo se activan con tu consentimiento.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/40">
                      <th className="text-left py-2 pr-4 font-semibold text-foreground">Herramienta</th>
                      <th className="text-left py-2 pr-4 font-semibold text-foreground">Proveedor</th>
                      <th className="text-left py-2 pr-4 font-semibold text-foreground">Finalidad</th>
                      <th className="text-left py-2 font-semibold text-foreground">Datos personales</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 pr-4 font-medium text-foreground">Plausible Analytics</td>
                      <td className="py-2 pr-4">Plausible Insights OÜ (Estonia, UE)</td>
                      <td className="py-2 pr-4">
                        Estadísticas de visitas y páginas vistas. Sin cookies, sin
                        identificadores persistentes.
                      </td>
                      <td className="py-2">Ninguno (solución sin cookies)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Marketing */}
          <div className="rounded-[--radius-lg] border border-border/50 bg-card/40 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-card/60 border-b border-border/50">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-secondary text-secondary-foreground border border-border">
                Opcional
              </span>
              <h3 className="text-sm font-semibold text-foreground">Cookies de marketing</h3>
            </div>
            <div className="p-4 text-sm text-muted-foreground">
              <p>
                Actualmente este sitio <strong className="text-foreground">no utiliza</strong>{' '}
                cookies de marketing. Esta categoría está reservada para futuras integraciones
                (p. ej. píxel de WhatsApp Business). Solo se activarían con tu consentimiento
                explícito.
              </p>
            </div>
          </div>
        </section>

        {/* ¿Cómo cambiar tus preferencias? */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            ¿Cómo cambiar tus preferencias?
          </h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Puedes modificar tus preferencias de cookies en cualquier momento de las siguientes
              formas:
            </p>
            <ol className="space-y-3 pl-0 list-none">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center text-[10px] font-mono text-primary">
                  1
                </span>
                <span>
                  <strong className="text-foreground">Desde el aviso de cookies:</strong> al
                  visitar el sitio por primera vez, el aviso te permite elegir tus preferencias.
                  Para volver a verlo, borra los datos de navegación de tu navegador
                  (localStorage).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center text-[10px] font-mono text-primary">
                  2
                </span>
                <span>
                  <strong className="text-foreground">Desde tu navegador:</strong> la mayoría de
                  navegadores permiten gestionar las cookies en sus ajustes. Puedes bloquear o
                  eliminar cookies de terceros. Consulta la ayuda de tu navegador para más
                  información.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center text-[10px] font-mono text-primary">
                  3
                </span>
                <span>
                  <strong className="text-foreground">Contactando con nosotros:</strong> escríbenos
                  a{' '}
                  <a
                    href={`mailto:${dpoEmail}`}
                    className="text-primary underline underline-offset-2"
                  >
                    {dpoEmail}
                  </a>{' '}
                  y gestionaremos tu solicitud en un plazo máximo de 30 días.
                </span>
              </li>
            </ol>
          </div>
        </section>

        {/* Más información */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Más información</h2>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              Para más información sobre cómo tratamos tus datos personales, consulta nuestra{' '}
              <a
                href="/politica-de-privacidad"
                className="text-primary underline underline-offset-2 hover:brightness-125"
              >
                Política de Privacidad
              </a>
              .
            </p>
            <p>
              Para reclamaciones ante la autoridad de control, puedes dirigirte a la{' '}
              <a
                href="https://www.aepd.es"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:brightness-125"
              >
                Agencia Española de Protección de Datos (aepd.es)
              </a>
              .
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/50 pt-6 text-[11px] text-muted-foreground/50 font-mono">
          {businessName} · {contact.email} · LSSI-CE Ley 34/2002
        </footer>
      </div>
    </main>
  );
}
