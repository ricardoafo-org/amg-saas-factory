import { Phone, MessageCircle, MapPin, Wrench, Shield, Star } from 'lucide-react';
import type { LocalBusiness } from '@/core/types/adapter';
import type { AvailableSlot } from '@/actions/slots';

const STATS = [
  { label: 'Años de experiencia', value: '15+' },
  { label: 'Clientes satisfechos', value: '2.000+' },
  { label: 'Servicios realizados', value: '8.500+' },
  { label: 'Garantía de calidad', value: '100%' },
];

export function Hero({ config, nextSlot }: { config: LocalBusiness; nextSlot: AvailableSlot | null }) {
  const { businessName, tagline, contact, address } = config;
  const waNumber = contact.whatsapp?.replace(/\D/g, '');

  const nextSlotLabel = nextSlot
    ? new Date(nextSlot.slotDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long' }) +
      ' a las ' +
      nextSlot.startTime
    : null;

  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center px-5 py-20 text-center overflow-hidden noise-overlay">
      {/* Grid background */}
      <div className="absolute inset-0 grid-bg opacity-60" aria-hidden />

      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px] pointer-events-none" aria-hidden />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" aria-hidden />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="Talleres AMG" className="h-8 w-8" />
          <span className="font-bold tracking-wider text-sm uppercase text-foreground/80">Talleres AMG</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Abierto ahora
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-3xl w-full mt-16">
        {/* Logo */}
        <div className="relative">
          <img
            src="/logo.svg"
            alt={businessName}
            className="h-24 w-24 object-contain"
            style={{ filter: 'drop-shadow(0 0 20px hsl(349 90% 52% / 0.4))' }}
          />
        </div>

        {/* Label */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/8 text-xs font-mono text-primary tracking-widest uppercase">
          <Wrench className="h-3 w-3" />
          Taller Mecánico Autorizado · Cartagena
        </div>

        {/* Headline */}
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl leading-none">
          <span className="text-foreground">Tu taller</span>
          <br />
          <span className="gradient-text glow-text">{businessName}</span>
        </h1>

        {tagline && (
          <p className="text-lg text-muted-foreground max-w-md leading-relaxed">{tagline}</p>
        )}

        <address className="not-italic flex items-center gap-1.5 text-sm text-muted-foreground/70 font-mono">
          <MapPin className="h-3.5 w-3.5 text-primary/60 shrink-0" />
          {address.street}, {address.city}
        </address>

        {/* CTAs */}
        <div className="mt-2 flex flex-col w-full gap-3 sm:flex-row sm:justify-center">
          <a
            href={`tel:${contact.phone}`}
            className="group inline-flex items-center justify-center gap-2 h-14 px-8 rounded-[--radius-lg] bg-primary text-primary-foreground font-semibold text-sm tracking-wide transition-all duration-200 hover:bg-primary/90 hover:shadow-[0_0_24px_4px_hsl(349_90%_52%/0.3)]"
          >
            <Phone className="h-4.5 w-4.5" />
            {contact.phone}
          </a>

          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}?text=Hola,%20me%20gustar%C3%ADa%20pedir%20cita`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-[--radius-lg] glass-strong font-semibold text-sm tracking-wide border border-green-500/25 text-green-400 transition-all duration-200 hover:border-green-500/50 hover:bg-green-500/10"
            >
              <MessageCircle className="h-4.5 w-4.5" />
              WhatsApp
            </a>
          )}

          {contact.googleMapsUrl && (
            <a
              href={contact.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 h-14 px-6 rounded-[--radius-lg] glass text-muted-foreground text-sm transition-all duration-200 hover:text-foreground hover:border-border/80"
            >
              <MapPin className="h-4 w-4" />
              Cómo llegar
            </a>
          )}
        </div>

        {/* Availability badge */}
        {nextSlotLabel && (
          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground/70">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
            Próximo hueco: {nextSlotLabel}
          </div>
        )}

        {/* Trust badges */}
        <div className="flex items-center gap-4 mt-2 flex-wrap justify-center">
          {[
            { icon: Shield, text: 'Garantía oficial' },
            { icon: Star, text: '4.9 · Google' },
            { icon: Wrench, text: 'ITV · Mecánica · Aceite' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
              <Icon className="h-3 w-3 text-primary/50" />
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-border/50">
        <div className="grid grid-cols-2 sm:grid-cols-4">
          {STATS.map(({ label, value }, i) => (
            <div
              key={label}
              className={`flex flex-col items-center justify-center py-4 px-2 ${
                i < STATS.length - 1 ? 'border-r border-border/50' : ''
              }`}
            >
              <span className="text-xl font-bold gradient-text">{value}</span>
              <span className="text-[11px] text-muted-foreground mt-0.5 text-center">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
