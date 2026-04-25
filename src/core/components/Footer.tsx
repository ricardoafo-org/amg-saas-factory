import { Phone, MessageCircle, MapPin, Mail, ExternalLink, Clock } from 'lucide-react';
import type { LocalBusiness } from '@/core/types/adapter';
import { CommitSha } from '@/core/components/CommitSha';

const DAY_LABELS: Record<string, string> = {
  monday:    'Lunes',
  tuesday:   'Martes',
  wednesday: 'Miércoles',
  thursday:  'Jueves',
  friday:    'Viernes',
  saturday:  'Sábado',
  sunday:    'Domingo',
};

export function Footer({ config }: { config: LocalBusiness }) {
  const { businessName, tagline, contact, address, operatingHours, legal } = config;
  const currentYear = new Date().getFullYear();
  const waNumber = contact.whatsapp?.replace(/\D/g, '');

  return (
    <footer className="relative border-t border-border bg-card">
      <div className="amg-band w-full" aria-hidden />
      <div className="mx-auto max-w-6xl px-5 py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">

        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt={businessName} className="h-8 w-auto" />
          </div>
          {tagline && (
            <p className="text-sm text-[--fg-secondary] leading-relaxed max-w-xs">{tagline}</p>
          )}
          <p className="text-xs text-[--fg-secondary] leading-relaxed max-w-xs">
            Taller mecánico de confianza en {address.city}. Mecánica general, cambios de aceite, revisiones pre-ITV y mucho más.
          </p>

          <div className="flex flex-col gap-2 pt-1">
            <a
              href={`tel:${contact.phone}`}
              className="inline-flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors w-fit"
            >
              <Phone className="h-4 w-4 text-primary shrink-0" />
              <span className="font-mono">{contact.phone}</span>
            </a>

            {waNumber && (
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-foreground hover:text-success transition-colors w-fit"
              >
                <MessageCircle className="h-4 w-4 text-success shrink-0" />
                WhatsApp
              </a>
            )}

            {contact.googleMapsUrl && (
              <a
                href={contact.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors w-fit"
              >
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                Ver en Google Maps
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            )}

            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="inline-flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors w-fit"
              >
                <Mail className="h-4 w-4 text-primary shrink-0" />
                {contact.email}
              </a>
            )}
          </div>

          <address className="not-italic meta leading-snug">
            {address.street}<br />
            {address.postalCode} {address.city}, {address.region}
          </address>
        </div>

        <div className="space-y-4">
          <h3 className="eyebrow">Acceso rápido</h3>
          <nav aria-label="Navegación de pie de página">
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'Servicios', href: '#servicios' },
                { label: 'Reservar cita', href: '#', isAction: true },
                { label: 'Calculadora ITV', href: '#itv' },
                { label: 'Opiniones', href: '#testimonios' },
                {
                  label: 'Política de Privacidad',
                  href: config.privacyPolicy?.url ?? '/politica-de-privacidad',
                  external: !!config.privacyPolicy?.url,
                },
              ].map(({ label, href, isAction, external }) => (
                <li key={label}>
                  {isAction ? (
                    <button
                      type="button"
                      data-action="open-chat"
                      className="open-chat-trigger text-foreground hover:text-primary transition-colors text-left"
                    >
                      {label}
                    </button>
                  ) : (
                    <a
                      href={href}
                      target={external ? '_blank' : undefined}
                      rel={external ? 'noopener noreferrer' : undefined}
                      className="text-foreground hover:text-primary transition-colors flex items-center gap-1"
                    >
                      {label}
                      {external && <ExternalLink className="h-2.5 w-2.5 opacity-60" />}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="space-y-4">
          <h3 className="eyebrow inline-flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            Horario
          </h3>
          {operatingHours && operatingHours.length > 0 && (
            <table className="w-full text-sm" aria-label="Horario de apertura">
              <tbody className="divide-y divide-border">
                {operatingHours.map((h) => (
                  <tr key={h.day} className={h.closed ? 'opacity-50' : ''}>
                    <td className="py-1.5 font-medium text-foreground">{DAY_LABELS[h.day] ?? h.day}</td>
                    <td className="py-1.5 text-right price text-[--fg-secondary]">
                      {h.closed ? 'Cerrado' : `${h.open} – ${h.close}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="border-t border-border px-5 py-3 flex items-center justify-center gap-2">
        <p className="meta text-center">
          Derechos del consumidor:{' '}
          <a href="https://www.ocu.org" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors inline-flex items-center gap-0.5">
            ocu.org <ExternalLink className="h-2.5 w-2.5 inline" />
          </a>
          {' '}·{' '}
          <a href="https://sede.dgt.gob.es" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors inline-flex items-center gap-0.5">
            ITV — DGT <ExternalLink className="h-2.5 w-2.5 inline" />
          </a>
        </p>
      </div>

      <div className="border-t border-border px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col gap-1 text-center sm:text-left">
          <p className="meta">
            © {currentYear} {businessName}
            {legal?.cif ? ` — CIF: ${legal.cif}` : ''}
            {legal?.registrationNumber
              ? ` — Reg. Talleres Murcia n.º ${legal.registrationNumber}`
              : ''}
            {' '}· RD 920/2017 · LOPDGDD · IVA incluido
          </p>
          <p className="meta opacity-80">
            Garantía: 3 meses o 2.000 km · RD 1457/1986 · Precios orientativos sujetos a presupuesto previo
          </p>
        </div>
        <nav className="flex items-center gap-3 flex-wrap justify-center" aria-label="Vínculos legales">
          <a href="/politica-de-privacidad" className="meta hover:text-foreground transition-colors">
            Privacidad
          </a>
          <span className="text-border" aria-hidden>·</span>
          <a href="/politica-de-cookies" className="meta hover:text-foreground transition-colors">
            Cookies
          </a>
          {legal?.dpoEmail && (
            <>
              <span className="text-border" aria-hidden>·</span>
              <a href={`mailto:${legal.dpoEmail}`} className="meta hover:text-foreground transition-colors">
                DPO
              </a>
            </>
          )}
        </nav>
        <CommitSha />
      </div>
    </footer>
  );
}
