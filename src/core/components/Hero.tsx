import Link from 'next/link';
import Image from 'next/image';
import { Phone, Clock, ShieldCheck, CalendarCheck } from 'lucide-react';
import type { LocalBusiness } from '@/core/types/adapter';
import type { AvailableSlot } from '@/actions/slots';
import { HeroStripes, HeroUnderlineDraw } from '@/core/components/client/HeroMotion';

export function Hero({ config, nextSlot }: { config: LocalBusiness; nextSlot: AvailableSlot | null }) {
  const { businessName, contact, foundingYear } = config;
  const year = foundingYear ?? 1987;

  const nextSlotLabel = nextSlot
    ? new Date(nextSlot.slotDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long' }) +
      ' a las ' +
      nextSlot.startTime
    : 'mañana 10:30';

  return (
    <>
      {/* ── Sticky header (bundle lines 14-32) ── */}
      <header className="hdr">
        <div className="hdr-inner">
          <Link href="/" className="hdr-logo" aria-label={businessName}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt={businessName} height="34" />
          </Link>

          <nav className="hdr-nav" aria-label="Navegación principal">
            <a href="#servicios">Servicios</a>
            <a href="#itv">ITV</a>
            <a href="#taller">El taller</a>
            <a href="#visitanos">Visítanos</a>
          </nav>

          <div className="hdr-right">
            <a className="hdr-phone" href={`tel:${contact.phone}`}>
              <Phone width={16} height={16} aria-hidden />
              <span>{contact.phone}</span>
            </a>
            <button
              type="button"
              data-action="open-chat"
              aria-label="Reservar cita"
              className="open-chat-trigger btn btn-primary btn-sm"
            >
              <CalendarCheck width={14} height={14} aria-hidden />
              Reservar cita
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero section (bundle lines 34-82) ── */}
      <section className="hero paper" id="inicio">
        <div className="hero-inner">
          {/* Left column */}
          <div>
            {/* Eyebrow with tri-stripe — HeroStripes is 'use client' for animation */}
            <div className="hero-pre">
              <HeroStripes />
              Cartagena · Desde {year}
            </div>

            {/* Headline with animated SVG underline on "taller" */}
            <h1>
              Tu{' '}
              <HeroUnderlineDraw>taller</HeroUnderlineDraw>
              {' '}de confianza, sin sobresaltos.
            </h1>

            {/* Lead copy — faithfully from bundle lines 41-43 */}
            <p className="hero-lead">
              Precios claros antes de tocar nada, garantía de 3 meses en todas las reparaciones,
              y 38 años arreglando los coches del barrio como si fueran nuestros.
            </p>

            {/* CTAs */}
            <div className="hero-cta">
              <button
                type="button"
                data-action="open-chat"
                aria-label="Reservar cita"
                className="open-chat-trigger btn btn-primary btn-lg"
              >
                Reservar cita
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
              <a className="btn btn-secondary btn-lg" href={`tel:${contact.phone}`}>
                <Phone width={16} height={16} aria-hidden />
                Llamar ahora
              </a>
            </div>

            {/* Meta row — 3 icon items */}
            <div className="hero-meta">
              <div className="hero-meta-item">
                <ShieldCheck width={16} height={16} aria-hidden />
                <span><strong>Garantía 3 meses</strong> · RD 1457/1986</span>
              </div>
              <div className="hero-meta-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span><strong>Presupuesto sin compromiso</strong></span>
              </div>
              <div className="hero-meta-item">
                <Clock width={16} height={16} aria-hidden />
                <span><strong>Abierto hoy</strong> · 8:00 — 19:00</span>
              </div>
            </div>
          </div>

          {/* Right column — hero photo */}
          <div className="hero-photo">
            <span className="stamp hero-photo-badge">Desde {year}</span>
            <Image
              src="https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=900&auto=format&fit=crop&q=80"
              alt="Mecánico trabajando en el motor de un coche"
              className="hero-photo-img"
              fill
              sizes="(max-width: 960px) 100vw, 45vw"
              priority
            />
            <div className="hero-photo-caption">
              <span className="dot" role="status" aria-label="En activo" />
              <div>
                <strong style={{ fontWeight: 600 }}>3 mecánicos trabajando ahora.</strong>{' '}
                <span style={{ color: 'var(--fg-muted)' }}>
                  Próximo hueco: {nextSlotLabel}.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
