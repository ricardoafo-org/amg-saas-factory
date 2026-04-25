import { Clock, Users, Star, ShieldCheck } from 'lucide-react';
import { TrustCounter } from '@/core/components/client/TrustCounter';

/**
 * TrustStrip — Section B of the bundle homepage.
 *
 * 4-column grid using .trust-inner / .trust-cell / .trust-icon / .trust-num / .trust-lab
 * (utility classes in globals.css). nth-child CSS rotates icon tints automatically.
 *
 * Numbers count up from 0 when entering viewport (MOTION.counter, 720ms outExpo).
 * Respects prefers-reduced-motion — counters jump to final value when active.
 *
 * Static — no config prop needed (numbers are canonical brand copy, not PocketBase data).
 */
export function TrustStrip() {
  return (
    <section
      className="trust"
      aria-label="Nuestros números"
    >
      <div className="trust-inner">
        {/* Cell 1 — 38 años */}
        <div className="trust-cell">
          <div className="trust-icon" aria-hidden>
            <Clock width={20} height={20} />
          </div>
          <div>
            <TrustCounter
              display="38 años"
              end={38}
              suffix=" años"
            />
            <div className="trust-lab">Reparando coches en Cartagena</div>
          </div>
        </div>

        {/* Cell 2 — 12 400 */}
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

        {/* Cell 3 — 4,9 / 5 */}
        <div className="trust-cell">
          <div className="trust-icon" aria-hidden>
            <Star width={20} height={20} />
          </div>
          <div>
            <TrustCounter
              display="4,9 / 5"
              end={4.9}
              decimals={1}
              decimalComma
              after="/ 5"
            />
            <div className="trust-lab">342 reseñas en Google</div>
          </div>
        </div>

        {/* Cell 4 — 3 meses */}
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
