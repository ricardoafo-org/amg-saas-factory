import Link from 'next/link';
import { Phone, MessageCircle, MapPin, CalendarCheck } from 'lucide-react';
import type { LocalBusiness } from '@/core/types/adapter';
import type { AvailableSlot } from '@/actions/slots';

export function Hero({ config, nextSlot }: { config: LocalBusiness; nextSlot: AvailableSlot | null }) {
  const { businessName, tagline, contact, address, foundingYear, reviewRating, reviewCount, customersServed } = config;
  const waNumber = contact.whatsapp?.replace(/\D/g, '');

  const nextSlotLabel = nextSlot
    ? new Date(nextSlot.slotDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long' }) +
      ' a las ' +
      nextSlot.startTime
    : null;

  const year = foundingYear ?? 1987;
  const rating = reviewRating ?? 4.9;
  const reviews = reviewCount ?? 124;
  const yearsOpen = new Date().getFullYear() - year;
  const customersLabel = customersServed
    ? customersServed >= 1000
      ? `${(customersServed / 1000).toFixed(1).replace('.', ',')}k`
      : `${customersServed}`
    : `${yearsOpen * 60}+`;

  return (
    <>
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-50 w-full bg-background/85 backdrop-blur-md border-b border-border">
        <div className="amg-band sm w-full" aria-hidden />
        <div className="mx-auto max-w-6xl flex items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label={businessName}>
            <img src="/logo.svg" alt={businessName} className="h-8 w-auto" />
          </Link>

          <nav className="hidden md:flex items-center gap-7" aria-label="Navegación principal">
            <a href="#servicios" className="text-sm text-[--fg-secondary] hover:text-foreground transition-colors">Servicios</a>
            <a href="#itv" className="text-sm text-[--fg-secondary] hover:text-foreground transition-colors">ITV</a>
            <a href="#testimonios" className="text-sm text-[--fg-secondary] hover:text-foreground transition-colors">Opiniones</a>
            <a
              href={`tel:${contact.phone}`}
              className="text-sm text-[--fg-secondary] hover:text-foreground transition-colors flex items-center gap-1.5 font-mono"
            >
              <Phone className="h-3.5 w-3.5" />
              {contact.phone}
            </a>
          </nav>

          <button
            type="button"
            data-action="open-chat"
            aria-label="Reservar cita"
            className="open-chat-trigger inline-flex items-center gap-2 h-10 px-4 rounded-[--radius-md] bg-primary text-primary-foreground text-sm font-semibold hover:bg-[--brand-red-dark] active:translate-y-px transition-all duration-150"
          >
            <CalendarCheck className="h-4 w-4" />
            <span>Reservar</span>
          </button>
        </div>
      </header>

      {/* ── Hero section ── */}
      <section className="relative paper">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24 md:py-28">
          <div className="grid gap-10 md:grid-cols-12 md:gap-12 items-center">
            <div className="md:col-span-7 flex flex-col gap-6">
              {/* Eyebrow */}
              <div className="flex items-center gap-3">
                <span className="amg-stripes" aria-hidden>
                  <span /><span /><span />
                </span>
                <span className="eyebrow">Mecánica de barrio · {address.city}</span>
              </div>

              {/* Headline — Archivo Black display */}
              <h1
                className="font-[family-name:var(--font-archivo-black)] text-foreground leading-[0.95] tracking-[-0.035em]"
                style={{ fontSize: 'clamp(2.5rem, 7vw, 5.25rem)' }}
              >
                Coche al día,
                <br />
                <span className="ink-underline">sin sorpresas.</span>
              </h1>

              {tagline && (
                <p className="lead max-w-xl">{tagline}</p>
              )}

              {/* Stamps row */}
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <span className="stamp">Desde {year}</span>
                <span className="stamp" style={{ transform: 'rotate(0.8deg)' }}>★ {rating} · {reviews} reseñas</span>
                <span className="stamp" style={{ transform: 'rotate(-0.6deg)' }}>Garantía 3 meses</span>
              </div>

              {/* Availability ticket */}
              <div className="ticket inline-flex items-center gap-3 self-start px-4 py-3">
                {nextSlotLabel ? (
                  <>
                    <span className="dot-available" role="status" aria-label="Disponible" />
                    <span className="text-sm">
                      <span className="meta mr-1.5">PRÓXIMO HUECO</span>
                      <strong className="font-semibold text-foreground">{nextSlotLabel}</strong>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="dot-warning" role="status" aria-label="Consultar" />
                    <span className="text-sm text-muted-foreground">Llámanos para disponibilidad</span>
                  </>
                )}
              </div>

              {/* CTA row */}
              <div className="flex flex-col sm:flex-row gap-3 mt-1">
                <button
                  type="button"
                  data-action="open-chat"
                  aria-label="Reservar cita"
                  className="open-chat-trigger inline-flex items-center justify-center gap-2 h-13 px-6 rounded-[--radius-md] bg-primary text-primary-foreground font-semibold text-base hover:bg-[--brand-red-dark] active:translate-y-px transition-all duration-150"
                >
                  <CalendarCheck className="h-5 w-5" />
                  Reservar cita
                </button>

                <a
                  href={`tel:${contact.phone}`}
                  className="inline-flex items-center justify-center gap-2 h-13 px-6 rounded-[--radius-md] bg-card text-foreground font-semibold text-base border border-[--border-strong] hover:bg-secondary transition-all duration-150"
                >
                  <Phone className="h-5 w-5" />
                  <span className="font-mono">{contact.phone}</span>
                </a>

                {waNumber && (
                  <a
                    href={`https://wa.me/${waNumber}?text=Hola,%20me%20gustar%C3%ADa%20pedir%20cita`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 h-13 px-6 rounded-[--radius-md] bg-card text-foreground font-semibold text-base border border-[--border-strong] hover:bg-secondary transition-all duration-150"
                  >
                    <MessageCircle className="h-5 w-5 text-[oklch(0.62_0.16_148)]" />
                    WhatsApp
                  </a>
                )}
              </div>

              {/* Address */}
              <address className="not-italic flex items-center gap-1.5 text-sm meta mt-2">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                {address.street}, {address.city}
              </address>
            </div>

            {/* Right column — workshop "ticket" stat card */}
            <aside className="md:col-span-5 relative">
              <div className="ticket relative overflow-hidden p-6 sm:p-8">
                <div className="amg-edge" aria-hidden />
                <div className="pl-3">
                  <span className="eyebrow eyebrow-dot">Taller en cifras</span>
                  <ul className="mt-5 grid grid-cols-2 gap-y-5 gap-x-4">
                    <li>
                      <div className="font-[family-name:var(--font-archivo-black)] text-4xl text-foreground">{yearsOpen}+</div>
                      <div className="meta mt-1">Años de oficio</div>
                    </li>
                    <li>
                      <div className="font-[family-name:var(--font-archivo-black)] text-4xl text-foreground">{customersLabel}</div>
                      <div className="meta mt-1">Clientes atendidos</div>
                    </li>
                    <li>
                      <div className="font-[family-name:var(--font-archivo-black)] text-4xl text-foreground">{rating}★</div>
                      <div className="meta mt-1">Reseñas Google</div>
                    </li>
                    <li>
                      <div className="font-[family-name:var(--font-archivo-black)] text-4xl text-foreground">3m</div>
                      <div className="meta mt-1">Garantía mínima</div>
                    </li>
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="amg-band w-full" aria-hidden />
      </section>
    </>
  );
}
