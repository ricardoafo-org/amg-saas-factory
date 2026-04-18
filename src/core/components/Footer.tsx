import { Phone, MessageCircle, MapPin, Mail, ExternalLink } from 'lucide-react';
import type { LocalBusiness } from '@/core/types/adapter';

export function Footer({ config }: { config: LocalBusiness }) {
  const { businessName, contact, address, operatingHours, legal } = config;
  const currentYear = new Date().getFullYear();
  const waNumber = contact.whatsapp?.replace(/\D/g, '');

  const weekHours = operatingHours?.find((h) => h.day === 'monday');
  const satHours = operatingHours?.find((h) => h.day === 'saturday');

  return (
    <footer className="relative border-t border-border/50 bg-card/30">
      <div className="mx-auto max-w-6xl px-5 py-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {/* Brand */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt={businessName} className="h-8 w-8" />
            <span className="font-bold tracking-wider text-sm uppercase">{businessName}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
            Tu taller de confianza en Cartagena. Mecánica general, cambios de aceite, revisiones pre-ITV y mucho más.
          </p>
          <p className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest">
            RD 920/2017 · LOPDGDD · IVA incluido
          </p>
        </div>

        {/* Contact */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground">Contacto</h3>
          <div className="space-y-2 text-sm">
            <a href={`tel:${contact.phone}`} className="flex items-center gap-2.5 text-foreground/80 hover:text-primary transition-colors">
              <Phone className="h-4 w-4 text-primary/50" />
              {contact.phone}
            </a>
            {waNumber && (
              <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-foreground/80 hover:text-green-400 transition-colors">
                <MessageCircle className="h-4 w-4 text-green-500/50" />
                WhatsApp
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-2.5 text-foreground/80 hover:text-primary transition-colors">
                <Mail className="h-4 w-4 text-primary/50" />
                {contact.email}
              </a>
            )}
            <div className="flex items-start gap-2.5 text-foreground/60">
              <MapPin className="h-4 w-4 text-primary/50 shrink-0 mt-0.5" />
              <span>{address.street}, {address.city}</span>
            </div>
          </div>
        </div>

        {/* Hours */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground">Horario</h3>
          <div className="space-y-1.5 text-sm">
            {weekHours && !weekHours.closed && (
              <div className="flex justify-between text-foreground/80">
                <span>Lunes — Viernes</span>
                <span className="font-mono text-xs">{weekHours.open} – {weekHours.close}</span>
              </div>
            )}
            {satHours && !satHours.closed && (
              <div className="flex justify-between text-foreground/80">
                <span>Sábado</span>
                <span className="font-mono text-xs">{satHours.open} – {satHours.close}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground/50">
              <span>Domingo</span>
              <span className="font-mono text-xs">Cerrado</span>
            </div>
          </div>
        </div>
      </div>

      {/* Consumer rights note */}
      <div className="border-t border-border/30 px-5 py-3 flex items-center justify-center gap-2">
        <p className="text-[10px] text-muted-foreground/35 font-mono text-center">
          Tus derechos como consumidor:{' '}
          <a
            href="https://www.ocu.org"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground/60 transition-colors inline-flex items-center gap-0.5"
          >
            ocu.org <ExternalLink className="h-2.5 w-2.5 inline" />
          </a>
          {' '}·{' '}
          <a
            href="https://sede.dgt.gob.es"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground/60 transition-colors inline-flex items-center gap-0.5"
          >
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
            ? ` — Inscrito en el Registro de Talleres de la Región de Murcia n.º ${legal.registrationNumber}`
            : ''}
        </p>
        <nav className="flex items-center gap-3 flex-wrap justify-center">
          <a
            href="/politica-de-privacidad"
            className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            Privacidad
          </a>
          <span className="text-muted-foreground/20 text-[11px]">·</span>
          <a
            href="/politica-de-cookies"
            className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            Cookies
          </a>
          <span className="text-muted-foreground/20 text-[11px]">·</span>
          <a
            href={config.privacyPolicy?.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            Política de Privacidad
          </a>
        </nav>
      </div>
    </footer>
  );
}
