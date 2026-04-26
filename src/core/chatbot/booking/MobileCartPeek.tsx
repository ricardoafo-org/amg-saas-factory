'use client';

import { useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { PackageRow } from '@/core/chatbot/booking/PackageRow';
import type { Service } from '@/core/types/adapter';

const fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

// Step indices — must match BookingApp constants
const STEP_SERVICES = 1;

type CartContents = {
  vehicle?: { plate: string; model: string };
  selectedServiceIds?: string[];
  slot?: { slotISO: string };
  guest?: { name: string };
};

type Props = {
  cart: CartContents;
  services: Service[];
  /** IVA rate as decimal (e.g. 0.21). MUST come from config — never hardcoded. */
  ivaRate: number;
  currentStep: number;
  /** Fired with the target step index when user clicks an edit pencil. */
  onEditFrom: (step: number) => void;
};

/**
 * MobileCartPeek — floating pill at < 768 px host width.
 * Shows total + service count. Tap expands to a bottom-sheet with full cart.
 * Respects prefers-reduced-motion via useReducedMotion.
 */
export function MobileCartPeek({ cart, services, ivaRate, currentStep, onEditFrom }: Props) {
  const [expanded, setExpanded] = useState(false);
  const reducedMotion = useReducedMotion();

  const selectedServices = (cart.selectedServiceIds ?? [])
    .map((id) => services.find((s) => s.id === id))
    .filter((s): s is Service => s != null);

  const count = selectedServices.length;

  // Only visible when cart has services, current step < 4 (Revisar)
  if (count === 0 || currentStep >= 4) return null;

  // IVA computation — all from props
  const subtotal = selectedServices.reduce((sum, s) => sum + s.basePrice, 0);
  const total = subtotal * (1 + ivaRate);

  const transitionStyle = reducedMotion
    ? {}
    : { transition: 'transform 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)' };

  return (
    <>
      {/* Floating pill */}
      <div
        role="status"
        aria-live="polite"
        aria-label={`${count} ${count === 1 ? 'servicio' : 'servicios'} · ${fmt.format(total)}`}
        style={{
          position: 'fixed',
          bottom: 'calc(16px + env(safe-area-inset-bottom))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
          ...transitionStyle,
        }}
      >
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-expanded={expanded}
          aria-controls="cart-bottom-sheet"
          className="glass flex items-center gap-3 px-4 py-2.5 rounded-full shadow-lg"
          style={{ minWidth: 200 }}
        >
          {/* Count badge */}
          <span
            className="flex items-center justify-center rounded-full text-xs font-bold tabular-nums"
            style={{
              width: 22,
              height: 22,
              background: 'var(--color-primary)',
              color: 'var(--color-primary-foreground)',
              flexShrink: 0,
            }}
          >
            {count}
          </span>

          <span className="text-sm font-medium flex-1" style={{ color: 'var(--color-foreground)' }}>
            {count === 1 ? '1 servicio' : `${count} servicios`}
          </span>

          <span
            className="text-sm font-semibold tabular-nums"
            style={{ color: 'var(--color-foreground)' }}
          >
            {fmt.format(total)}
          </span>

          {/* Chevron up */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: 'var(--color-muted-foreground)', flexShrink: 0 }}
            aria-hidden
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      </div>

      {/* Bottom-sheet overlay */}
      {expanded && (
        <>
          {/* Scrim */}
          <div
            role="presentation"
            onClick={() => setExpanded(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 51,
              background: 'oklch(0.18 0.01 60 / 0.5)',
              ...(reducedMotion ? {} : { backdropFilter: 'blur(2px)' }),
            }}
          />

          {/* Sheet */}
          <div
            id="cart-bottom-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Resumen de la reserva"
            className="glass-strong flex flex-col"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 52,
              maxHeight: '80dvh',
              borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
              overflowY: 'auto',
              paddingBottom: 'env(safe-area-inset-bottom)',
              ...(reducedMotion
                ? {}
                : { animation: 'slideUpSheet 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94) both' }),
            }}
          >
            {/* Sheet header */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                Tu reserva
              </h2>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                aria-label="Cerrar resumen"
                className="flex items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2"
                style={{ width: 32, height: 32, color: 'var(--color-muted-foreground)', background: 'transparent' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Services list — same rows as CartPanel */}
            <div className="flex flex-col px-4 py-3 gap-1">
              {selectedServices.map((service) => (
                <PackageRow
                  key={service.id}
                  service={service}
                  ivaRate={ivaRate}
                  onEdit={() => {
                    setExpanded(false);
                    onEditFrom(STEP_SERVICES);
                  }}
                />
              ))}
            </div>

            {/* IVA breakdown */}
            <div
              className="px-4 py-3 flex flex-col gap-1 shrink-0"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <div className="flex justify-between text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                <span>Subtotal</span>
                <span className="tabular-nums">{fmt.format(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                <span>IVA ({Math.round(ivaRate * 100)} %)</span>
                <span className="tabular-nums">{fmt.format(subtotal * ivaRate)}</span>
              </div>
              <div
                className="flex justify-between text-sm font-semibold pt-1 mt-1"
                style={{
                  borderTop: '1px solid var(--color-border)',
                  color: 'var(--color-foreground)',
                }}
              >
                <span>Total</span>
                <span className="tabular-nums">{fmt.format(total)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
