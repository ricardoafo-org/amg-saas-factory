'use client';

import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import type { Service } from '@/core/types/adapter';
import { MOTION } from '@/lib/motion';

// Props preserved for API compatibility — bundle renders static data
type Props = {
  services: Service[];
  ivaRate: number;
  locale?: string;
  currency?: string;
};

// Bundle-canonical SVG icons (inline — match Website.html exactly)
function IconOil() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
    </svg>
  );
}
function IconBrakes() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/>
      <line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/>
      <line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/>
      <line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/>
      <line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/>
    </svg>
  );
}
function IconItv() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/>
      <circle cx="6.5" cy="16.5" r="2.5"/>
      <circle cx="16.5" cy="16.5" r="2.5"/>
    </svg>
  );
}
function IconTyres() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a14.5 14.5 0 0 0 0 20M12 2a14.5 14.5 0 0 1 0 20M2 12h20"/>
    </svg>
  );
}
function IconAC() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
      <circle cx="12" cy="12" r="4"/>
    </svg>
  );
}
function IconOBD() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01"/>
      <path d="M6 14h.01M10 14h.01M14 14h.01M18 14h.01"/>
    </svg>
  );
}

// Bundle-canonical design layer — id, icon, duration label, and copy.
// Prices are intentionally absent: they are computed at render from config (basePrice × ivaRate).
// `tier` drives the left-border colour accent via [data-tier] rules in globals.css.
export const BUNDLE_SERVICES = [
  {
    id: 'cambio-aceite',
    tier: 'maintenance' as const,
    icon: <IconOil />,
    dur: '~ 45 min',
    title: 'Cambio de aceite y filtros',
    desc: 'Aceite, filtro de aceite y revisión de niveles. Te enseñamos las piezas cambiadas antes de tirarlas.',
    includes: 'aceite, filtro de aceite, revisión de niveles',
  },
  {
    id: 'frenos',
    tier: 'safety' as const,
    icon: <IconBrakes />,
    dur: '~ 75 min',
    title: 'Revisión de frenos',
    desc: 'Inspección de pastillas, discos y líquido. Presupuesto en el acto antes de empezar a sustituir nada.',
    includes: 'inspección de pastillas y discos, líquido, presupuesto',
  },
  {
    id: 'pre-itv',
    tier: 'compliance' as const,
    icon: <IconItv />,
    dur: '~ 60 min',
    title: 'Pre-revisión ITV',
    desc: 'Revisamos todo lo que miran en la ITV. Si algo falla, te lo decimos y lo arreglamos antes de ir.',
    includes: 'luces, frenos, suspensión, gases, holguras',
  },
  {
    id: 'neumaticos',
    tier: 'maintenance' as const,
    icon: <IconTyres />,
    dur: '~ 30 min',
    title: 'Neumáticos y equilibrado',
    desc: 'Trabajamos con Michelin, Continental, Hankook. Válvulas, equilibrado y alineación incluidos.',
    includes: 'válvulas, equilibrado, alineación',
  },
  {
    id: 'aire-acondicionado',
    tier: 'comfort' as const,
    icon: <IconAC />,
    dur: '~ 40 min',
    title: 'Aire acondicionado',
    desc: 'Carga de gas, cambio de filtro de habitáculo y diagnóstico de fugas con lámpara UV.',
    includes: 'carga de gas, filtro de habitáculo, diagnóstico de fugas',
  },
  {
    id: 'diagnostico-obd',
    tier: 'diagnostic' as const,
    icon: <IconOBD />,
    dur: '~ 20 min',
    title: 'Diagnóstico OBD',
    desc: 'Lectura y borrado de códigos de avería. Primera consulta gratis al contratar la reparación.',
    includes: 'lectura y borrado de códigos, primera consulta gratis',
  },
] as const;

function openChatWithService(serviceId: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('amg:open-chat', { detail: { serviceId } }));
  }
}

function formatPrice(basePrice: number, ivaRate: number, locale: string, currency: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
    basePrice * (1 + ivaRate),
  );
}

export function ServiceGrid({ services, ivaRate, locale = 'es-ES', currency = 'EUR' }: Props) {
  // Build a lookup map from config services so each card can resolve its price
  const priceMap = new Map<string, number>(services.map((s) => [s.id, s.basePrice]));

  return (
    <section id="servicios" className="sect">
      <div className="sect-inner">
        {/* Section header — matches bundle sect-head */}
        <div className="sect-head">
          <div>
            <p className="sect-pre">Nuestros servicios</p>
            <h2>Precios claros. Garantía clara. Trabajo claro.</h2>
          </div>
          <a className="sect-link" href="#servicios">
            Ver todos
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </div>

        {/* 3-column service grid with stagger-in */}
        <motion.div
          className="svc-grid"
          variants={{ visible: MOTION.serviceGridStagger }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-10% 0px' }}
        >
          {BUNDLE_SERVICES.map((svc) => {
            const basePrice = priceMap.get(svc.id);
            const displayPrice =
              basePrice !== undefined
                ? formatPrice(basePrice, ivaRate, locale, currency)
                : null;

            return (
              <motion.article
                key={svc.id}
                className="svc-card"
                data-tier={svc.tier}
                variants={{
                  hidden: MOTION.serviceCard.initial,
                  visible: {
                    ...MOTION.serviceCard.whileInView,
                    transition: MOTION.serviceCard.transition,
                  },
                }}
              >
                {/* Top row: icon + duration */}
                <div className="svc-top">
                  <div className="svc-icon">{svc.icon}</div>
                  <span className="svc-dur">{svc.dur}</span>
                </div>

                {/* Title + description */}
                <h3>{svc.title}</h3>
                <p>{svc.desc}</p>
                <p className="svc-includes"><strong>Incluye:</strong> {svc.includes}</p>

                {/* Warranty disclosure pill — RD 1457/1986 conformance */}
                <span className="svc-warranty">
                  <ShieldCheck width={12} height={12} aria-hidden />
                  Garantía 3 meses
                </span>

                {/* Footer: price + CTA */}
                <div className="svc-foot">
                  <div>
                    <span className="svc-price-from">Desde</span>
                    {displayPrice !== null && (
                      <span className="svc-price">{displayPrice}</span>
                    )}
                    <span className="svc-price-iva">IVA incl.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openChatWithService(svc.id)}
                    className="btn btn-primary btn-sm"
                    aria-label={`Reservar ${svc.title}`}
                  >
                    Reservar
                  </button>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
