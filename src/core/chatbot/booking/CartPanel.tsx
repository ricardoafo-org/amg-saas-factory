'use client';

import { PackageRow } from '@/core/chatbot/booking/PackageRow';
import type { Service } from '@/core/types/adapter';

// Step indices — must match BookingApp constants
const STEP_VEHICLE = 0;
const STEP_SERVICES = 1;
const STEP_SLOT = 2;
const STEP_GUEST = 3;

const fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

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
  /** Fired with the target step index when user clicks an edit pencil. */
  onEditFrom: (step: number) => void;
};

/**
 * CartPanel — desktop sticky cart column.
 * Lists vehicle + selected services + slot + guest with edit pencils.
 * Live IVA breakdown: subtotal (NET), IVA amount, total (gross).
 * All prices use Intl.NumberFormat('es-ES', 'EUR') with tabular-nums.
 * basePrice from Service is NET — gross = basePrice * (1 + ivaRate).
 */
export function CartPanel({ cart, services, ivaRate, onEditFrom }: Props) {
  const selectedServices = (cart.selectedServiceIds ?? [])
    .map((id) => services.find((s) => s.id === id))
    .filter((s): s is Service => s != null);

  // IVA computation — all from props, never hardcoded
  const subtotal = selectedServices.reduce((sum, s) => sum + s.basePrice, 0);
  const ivaAmount = subtotal * ivaRate;
  const total = subtotal * (1 + ivaRate);

  const hasContent =
    cart.vehicle != null ||
    selectedServices.length > 0 ||
    cart.slot != null ||
    cart.guest != null;

  return (
    <aside
      className="glass flex flex-col"
      style={{
        borderLeft: '1px solid var(--color-border)',
        minWidth: 260,
        maxWidth: 360,
        overflowY: 'auto',
      }}
      aria-label="Resumen de la reserva"
    >
      {/* Header with tri-stripe accent */}
      <div className="shrink-0">
        <div className="tri-stripe" aria-hidden />
        <div
          className="px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h2
            className="text-xs font-semibold font-mono uppercase tracking-wider"
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            Tu reserva
          </h2>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-3 flex flex-col gap-3">
        {!hasContent && (
          <p
            className="text-xs text-center py-6"
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            Aún no hay servicios seleccionados.
          </p>
        )}

        {/* Vehicle row */}
        {cart.vehicle && (
          <div
            className="flex items-center gap-2 pb-2"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div className="flex-1 min-w-0">
              <p
                className="text-[10px] font-mono uppercase tracking-wider"
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                Vehículo
              </p>
              <p
                className="text-sm font-semibold truncate tabular-nums"
                style={{ color: 'var(--color-foreground)' }}
              >
                {cart.vehicle.plate}
              </p>
              {cart.vehicle.model && (
                <p
                  className="text-[11px] truncate"
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  {cart.vehicle.model}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onEditFrom(STEP_VEHICLE)}
              aria-label="Editar vehículo"
              className="shrink-0 flex items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2"
              style={{ width: 28, height: 28, color: 'var(--color-muted-foreground)', background: 'transparent' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
        )}

        {/* Services rows */}
        {selectedServices.length > 0 && (
          <div
            className="flex flex-col"
            style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}
          >
            <p
              className="text-[10px] font-mono uppercase tracking-wider mb-1"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              Servicios
            </p>
            {selectedServices.map((service) => (
              <PackageRow
                key={service.id}
                service={service}
                ivaRate={ivaRate}
                onEdit={() => onEditFrom(STEP_SERVICES)}
              />
            ))}
          </div>
        )}

        {/* Slot row */}
        {cart.slot && (
          <div
            className="flex items-center gap-2 pb-2"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div className="flex-1 min-w-0">
              <p
                className="text-[10px] font-mono uppercase tracking-wider"
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                Cita
              </p>
              <p
                className="text-sm tabular-nums"
                style={{ color: 'var(--color-foreground)' }}
              >
                {new Date(cart.slot.slotISO).toLocaleString('es-ES', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onEditFrom(STEP_SLOT)}
              aria-label="Editar cita"
              className="shrink-0 flex items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2"
              style={{ width: 28, height: 28, color: 'var(--color-muted-foreground)', background: 'transparent' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
        )}

        {/* Guest row */}
        {cart.guest && (
          <div className="flex items-center gap-2 pb-2">
            <div className="flex-1 min-w-0">
              <p
                className="text-[10px] font-mono uppercase tracking-wider"
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                Contacto
              </p>
              <p
                className="text-sm truncate"
                style={{ color: 'var(--color-foreground)' }}
              >
                {cart.guest.name}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onEditFrom(STEP_GUEST)}
              aria-label="Editar datos de contacto"
              className="shrink-0 flex items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2"
              style={{ width: 28, height: 28, color: 'var(--color-muted-foreground)', background: 'transparent' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* IVA breakdown footer — only when services selected */}
      {selectedServices.length > 0 && (
        <div
          className="shrink-0 px-4 py-3 flex flex-col gap-1"
          style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-card)' }}
        >
          <div className="flex justify-between text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            <span>Subtotal</span>
            <span className="tabular-nums">{fmt.format(subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            <span>IVA ({Math.round(ivaRate * 100)} %)</span>
            <span className="tabular-nums">{fmt.format(ivaAmount)}</span>
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
      )}
    </aside>
  );
}
