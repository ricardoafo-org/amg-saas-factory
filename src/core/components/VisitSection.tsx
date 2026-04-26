import Image from 'next/image';
import type { LocalBusiness } from '@/core/types/adapter';

export function VisitSection({ config }: { config: LocalBusiness }) {
  const { address, contact } = config;
  const waNumber = contact.whatsapp?.replace(/\D/g, '');
  const mapsUrl =
    contact.googleMapsUrl ??
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${address.street} ${address.postalCode} ${address.city}`,
    )}`;

  const fullStreetLine = `${address.street}, ${address.postalCode} ${address.city}`;
  const heading = `${address.street} · ${address.city}.`;

  return (
    <section className="sect" id="visitanos" style={{ paddingTop: 0 }}>
      <div className="sect-inner">
        {/* Section header */}
        <div className="sect-head">
          <div>
            <p className="sect-pre">Visítanos</p>
            <h2>{heading}</h2>
          </div>
        </div>

        {/* 2-col visit grid */}
        <div className="visit">
          {/* Left: workshop photo */}
          <div className="visit-photo">
            <Image
              src="https://images.unsplash.com/photo-1504222490345-c075b6008014?w=900&q=80&auto=format&fit=crop"
              alt="Fachada del taller con coches y herramientas"
              fill
              sizes="(max-width: 900px) 100vw, 55vw"
              style={{ objectFit: 'cover' }}
              priority={false}
            />
          </div>

          {/* Right: info card with hairline-separated rows */}
          <div className="visit-info">
            {/* Dirección row */}
            <div className="visit-row">
              <div className="ic" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div>
                <h4>Dirección</h4>
                <p>{fullStreetLine}, {address.region}</p>
                <a className="dir-cta" href={mapsUrl} target="_blank" rel="noopener noreferrer">
                  Cómo llegar
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Teléfono row */}
            <div className="visit-row">
              <div className="ic" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </div>
              <div>
                <h4>Teléfono / WhatsApp</h4>
                <p>
                  {contact.phone}
                  {' · '}respondemos en 15 min en horario laboral
                </p>
                {waNumber && (
                  <a
                    className="dir-cta"
                    href={`https://wa.me/${waNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Escribir por WhatsApp
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </a>
                )}
              </div>
            </div>

            {/* Horario row */}
            <div className="visit-row">
              <div className="ic" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h4>Horario</h4>
                <div className="hours">
                  <div className="hours-row">
                    <span>Lunes — Viernes</span>
                    <span>8:00 — 19:00</span>
                  </div>
                  <div className="hours-row">
                    <span>Sábado</span>
                    <span>9:00 — 14:00</span>
                  </div>
                  <div className="hours-row closed">
                    <span>Domingo</span>
                    <span>Cerrado</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
