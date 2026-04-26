import { Clock, Users, Star, ShieldCheck } from 'lucide-react';
import { TrustCounter } from '@/core/components/client/TrustCounter';

type TrustStripProps = {
  yearsOperating: number;
  reviewRating: number;
  reviewCount: number;
};

/**
 * TrustStrip — Section B of the bundle homepage.
 *
 * 4-column grid using .trust-inner / .trust-cell / .trust-icon / .trust-num / .trust-lab.
 * Years / rating / review count are derived from the tenant config so they cannot
 * drift from the source of truth. The clientes atendidos figure is canonical
 * brand copy (anniversary-style; not pulled from a CRM count).
 */
export function TrustStrip({ yearsOperating, reviewRating, reviewCount }: TrustStripProps) {
  const ratingDisplay = reviewRating.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const reviewLabel = `${reviewCount.toLocaleString('es-ES')} reseñas en Google`;

  return (
    <section
      className="trust"
      aria-label="Nuestros números"
    >
      <div className="trust-inner">
        {/* Cell 1 — años operando */}
        <div className="trust-cell">
          <div className="trust-icon" aria-hidden>
            <Clock width={20} height={20} />
          </div>
          <div>
            <TrustCounter
              display={`${yearsOperating} años`}
              end={yearsOperating}
              suffix=" años"
            />
            <div className="trust-lab">Reparando coches en Cartagena</div>
          </div>
        </div>

        {/* Cell 2 — clientes atendidos (brand copy, not CRM count) */}
        <div className="trust-cell">
          <div className="trust-icon" aria-hidden>
            <Users width={20} height={20} />
          </div>
          <div>
            <TrustCounter
              display="12\u00A0400"
              end={12400}
              spacedThousands
            />
            <div className="trust-lab">Clientes atendidos</div>
          </div>
        </div>

        {/* Cell 3 — rating + review count from config */}
        <div className="trust-cell">
          <div className="trust-icon" aria-hidden>
            <Star width={20} height={20} />
          </div>
          <div>
            <TrustCounter
              display={`${ratingDisplay} / 5`}
              end={reviewRating}
              decimals={1}
              decimalComma
              after="/ 5"
            />
            <div className="trust-lab">{reviewLabel}</div>
          </div>
        </div>

        {/* Cell 4 — 3 meses (legal minimum, RD 1457/1986) */}
        <div className="trust-cell">
          <div className="trust-icon" aria-hidden>
            <ShieldCheck width={20} height={20} />
          </div>
          <div>
            <TrustCounter
              display="3 meses"
              end={3}
              suffix=" meses"
            />
            <div className="trust-lab">Garantía en cada reparación</div>
          </div>
        </div>
      </div>
    </section>
  );
}
