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
    <footer className="relative border-t border-border/50 bg-card/30">
      <div className="mx-auto max-w-6xl px-5 py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">

        {/* Col 1: Brand + social links */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt={businessName} className="h-8 w-auto" />
          </div>
          {tagline && (
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">{tagline}</p>
          )}
          <p className="text-xs text-muted-foreground/60 leading-relaxed max-w-xs">
            Taller mecánico de confianza en {address.city}. Mecánica general, cambios de aceite, revisiones pre-ITV y mucho más.
          </p>

          {/* Social / contact actions */}
          <div className="flex flex-col gap-2 pt-1">
            <a
              href={`tel:${contact.phone}`}
              className="inline-flex items-center gap-2 text-sm text-foreground/80 hover:text-primary transition-colors w-fit"
            >
              <Phone className="h-4 w-4 text-primary/50 shrink-0" />
              {contact.phone}
            </a>

            {waNumber && (
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-foreground/80 hover:text-green-400 transition-colors w-fit"
              >
                <MessageCircle className="h-4 w-4 text-green-500/50 shrink-0" />
                WhatsApp
              </a>
            )}

            {contact.googleMapsUrl && (
              <a
                href={contact.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-foreground/80 hover:text-primary transition-colors w-fit"
              >
                <MapPin className="h-4 w-4 text-primary/50 shrink-0" />
                Ver en Google Maps
                <ExternalLink className="h-3 w-3 opacity-50" />
              </a>
            )}

            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="inline-flex items-center gap-2 text-sm text-foreground/80 hover:text-primary transition-colors w-fit"
              >
                <Mail className="h-4 w-4 text-primary/50 shrink-0" />
                {contact.email}
              </a>
            )}
          </div>

          <address className="not-italic text-xs text-muted-foreground/50 leading-snug">
            {address.street}<br />
            {address.postalCode} {address.city}, {address.region}
          </address>
        </div>

        {/* Col 2: Quick links */}
        <div className="space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground">Acceso rápido</h3>
          <nav aria-label="Navegación de pie de página">
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'Servicios', href: '#servicios' },
                { label: 'Reservar cita', href: '#', isAction: true },
                { label: 'Calculadora ITV', href: '#itv' },
                { label: 'Opiniones', href: '#testimonios' },
                { label: 'Política de Privacidad', href: config.privacyPolicy?.url, external: true },
              ].map(({ label, href, isAction, external }) => (
                <li key={label}>
                  {isAction ? (
                    <button
                      type="button"
                      data-action="open-chat"
                      className="open-chat-trigger text-foreground/70 hover:text-primary transition-colors text-left"
                    >
                      {label}
                    </button>
                  ) : (
                    <a
                      href={href}
                      target={external ? '_blank' : undefined}
                      rel={external ? 'noopener noreferrer' : undefined}
                      className="text-foreground/70 hover:text-primary transition-colors flex items-center gap-1"
                    >
                      {label}
                      {external && <ExternalLink className="h-2.5 w-2.5 opacity-50" />}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Col 3: Hours + address */}
        <div className="space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Horario
            </span>
          </h3>
          {operatingHours && operatingHours.length > 0 && (
            <table className="w-full text-xs text-foreground/75" aria-label="Horario de apertura">
              <tbody className="divide-y divide-border/20">
                {operatingHours.map((h) => (
                  <tr key={h.day} className={h.closed ? 'opacity-40' : ''}>
                    <td className="py-1.5 font-medium">{DAY_LABELS[h.day] ?? h.day}</td>
                    <td className="py-1.5 text-right font-mono text-muted-foreground">
                      {h.closed ? 'Cerrado' : `${h.open} – ${h.close}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Consumer rights bar */}
      <div className="border-t border-border/30 px-5 py-3 flex items-center justify-center gap-2">
        <p className="text-[10px] text-muted-foreground/35 font-mono text-center">
          Derechos del consumidor:{' '}
          <a href="https://www.ocu.org" target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground/60 transition-colors inline-flex items-center gap-0.5">
            ocu.org <ExternalLink className="h-2.5 w-2.5 inline" />
          </a>
          {' '}·{' '}
          <a href="https://sede.dgt.gob.es" target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground/60 transition-colors inline-flex items-center gap-0.5">
            ITV — DGT <ExternalLink className="h-2.5 w-2.5 inline" />
          </a>
        </p>
      </div>

      {/* Legal bottom bar */}
      <div className="border-t border-border/30 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground/40 font-mono text-center sm:text-left">
          © {currentYear} {businessName}
          {legal?.cif ? ` — CIF: ${legal.cif}` : ''}
          {legal?.registrationNumber
            ? ` — Reg. Talleres Murcia n.º ${legal.registrationNumber}`
            : ''}
          {' '}· RD 920/2017 · LOPDGDD · IVA incluido
        </p>
        <p className="text-[10px] text-muted-foreground/30 font-mono text-center sm:text-left mt-0.5">
          Garantía de reparación: 3 meses o 2.000 km (lo primero que ocurra) · RD 1457/1986 ·{' '}
          Precios orientativos sin IVA, sujetos a presupuesto previo
        </p>
        <nav className="flex items-center gap-3 flex-wrap justify-center" aria-label="Vínculos legales">
          <a href="/politica-de-privacidad" className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors">
            Privacidad
          </a>
          <span className="text-muted-foreground/20 text-[11px]" aria-hidden>·</span>
          <a href="/politica-de-cookies" className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors">
            Cookies
          </a>
          {legal?.dpoEmail && (
            <>
              <span className="text-muted-foreground/20 text-[11px]" aria-hidden>·</span>
              <a href={`mailto:${legal.dpoEmail}`} className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors">
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
