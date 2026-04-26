import { Clock, Users, ShieldCheck } from 'lucide-react';
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
            {/* Google G mark — multicolour brand icon, aria-hidden as the label text already says "en Google" */}
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden focusable="false">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
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
