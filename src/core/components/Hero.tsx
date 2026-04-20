import Link from 'next/link';
import { Phone, MessageCircle, MapPin, CalendarCheck } from 'lucide-react';
import type { LocalBusiness } from '@/core/types/adapter';
import type { AvailableSlot } from '@/actions/slots';

export function Hero({ config, nextSlot }: { config: LocalBusiness; nextSlot: AvailableSlot | null }) {
  const { businessName, tagline, contact, address, foundingYear, reviewRating, reviewCount } = config;
  const waNumber = contact.whatsapp?.replace(/\D/g, '');

  const nextSlotLabel = nextSlot
    ? new Date(nextSlot.slotDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long' }) +
      ' a las ' +
      nextSlot.startTime
    : null;

  const year = foundingYear ?? 1987;
  const rating = reviewRating ?? 4.9;
  const reviews = reviewCount ?? 124;

  return (
    <>
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-50 w-full glass-strong border-b border-border/50">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-5 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label={businessName}>
            <img src="/logo.svg" alt={businessName} className="h-8 w-auto" />
          </Link>

          {/* Nav links — desktop only */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Navegación principal">
            <a href="#servicios" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Servicios</a>
            <a href="#itv" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Calculadora ITV</a>
            <a href="#testimonios" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Opiniones</a>
            <a href={`tel:${contact.phone}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              {contact.phone}
            </a>
          </nav>

          {/* CTA */}
          <button
            type="button"
            onClick={undefined}
            data-action="open-chat"
            aria-label="Reservar cita"
            className="open-chat-trigger inline-flex items-center gap-2 h-10 px-5 rounded-[--radius-lg] bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all duration-200 shadow-glow"
          >
            <CalendarCheck className="h-4 w-4" />
            <span>Reservar</span>
          </button>
        </div>
      </header>

      {/* ── Hero section ── */}
      <section className="relative flex min-h-[calc(100svh-56px)] flex-col items-center justify-center px-5 py-16 text-center overflow-hidden noise-overlay">
        {/* Background effects */}
        <div className="absolute inset-0 grid-bg opacity-60" aria-hidden />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-primary/8 blur-[130px] pointer-events-none" aria-hidden />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" aria-hidden />

        <div className="relative z-10 flex flex-col items-center gap-5 max-w-3xl w-full">

          {/* Trust strip */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground/70 font-mono">
            <span className="flex items-center gap-1">
              <span className="text-amber-400">★</span>
              {rating} ({reviews} reseñas)
            </span>
            <span className="text-border/60 hidden sm:inline">·</span>
            <span>Desde {year}</span>
            <span className="text-border/60 hidden sm:inline">·</span>
            <span>Garantía 3 meses</span>
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

          {/* Availability badge */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full glass border border-border/60 text-xs font-mono">
            {nextSlotLabel ? (
              <>
                <span className="dot-available" role="status" aria-label="Disponible" />
                <span className="text-foreground/80">Próximo hueco: <strong className="text-foreground">{nextSlotLabel}</strong></span>
              </>
            ) : (
              <>
                <span className="dot-warning" role="status" aria-label="Consultar" />
                <span className="text-muted-foreground">Llámanos para disponibilidad</span>
              </>
            )}
          </div>

          {/* CTA row */}
          <div className="flex flex-col w-full gap-3 sm:flex-row sm:justify-center mt-2">
            {/* Primary CTA — opens chatbot via custom event */}
            <button
              type="button"
              data-action="open-chat"
              aria-label="Reservar cita"
              className="open-chat-trigger group inline-flex items-center justify-center gap-2 h-14 px-8 rounded-[--radius-lg] bg-primary text-primary-foreground font-semibold text-sm tracking-wide transition-all duration-200 hover:bg-primary/90 shadow-glow"
            >
              <CalendarCheck className="h-5 w-5" />
              Reservar cita →
            </button>

            <a
              href={`tel:${contact.phone}`}
              className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-[--radius-lg] glass-strong font-semibold text-sm tracking-wide border border-border/60 text-foreground/80 transition-all duration-200 hover:border-primary/40 hover:text-foreground"
            >
              <Phone className="h-5 w-5" />
              {contact.phone}
            </a>

            {waNumber && (
              <a
                href={`https://wa.me/${waNumber}?text=Hola,%20me%20gustar%C3%ADa%20pedir%20cita`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-[--radius-lg] glass-strong font-semibold text-sm tracking-wide border border-green-500/25 text-green-400 transition-all duration-200 hover:border-green-500/50 hover:bg-green-500/10"
              >
                <MessageCircle className="h-5 w-5" />
                WhatsApp
              </a>
            )}
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-4 text-xs text-muted-foreground/60">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-1 h-1 rounded-full bg-primary/50" />
              {new Date().getFullYear() - year}+ años experiencia
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-1 h-1 rounded-full bg-primary/50" />
              +2.400 clientes
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-1 h-1 rounded-full bg-primary/50" />
              {rating}★
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
