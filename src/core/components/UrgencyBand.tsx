import type { LocalBusiness } from '@/core/types/adapter';

/**
 * Audit row F2 — Pre-footer urgency band.
 *
 * A last-glance band between Visítanos and the footer. Gives users who
 * scrolled all the way down a final, lower-pressure CTA cluster:
 *   - Reservar (opens chat via the existing data-action delegation)
 *   - Llamar (tel: link to the workshop phone)
 *
 * Server component — pure data in, no hooks. Reuses the global chat-open
 * event delegation in ChatWidget.handleDocClick (no new wiring needed).
 */
export function UrgencyBand({ config }: { config: LocalBusiness }) {
  const { contact } = config;
  const telHref = `tel:${contact.phone.replace(/\s/g, '')}`;

  return (
    <section className="urgency-band" aria-labelledby="urgency-heading">
      <div className="urgency-band-inner">
        <div className="urgency-band-copy">
          <p className="urgency-band-pre">¿Lo dejas para mañana?</p>
          <h2 id="urgency-heading">
            Reservamos hoy, te llamamos cuando esté listo.
          </h2>
          <p>
            La mayoría de las semanas tenemos hueco a 24 — 48 horas. Si la
            avería corre prisa, dilo en el chat y buscamos un encaje el mismo día.
          </p>
        </div>
        <div className="urgency-band-cta">
          <button
            type="button"
            className="btn btn-primary btn-lg"
            data-action="open-chat"
          >
            Reservar ahora
          </button>
          <a
            className="btn btn-secondary btn-lg urgency-band-tel"
            href={telHref}
            aria-label={`Llamar al ${contact.phone}`}
          >
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            {contact.phone}
          </a>
        </div>
      </div>
    </section>
  );
}
