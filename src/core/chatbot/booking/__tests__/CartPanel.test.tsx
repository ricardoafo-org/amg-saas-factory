/**
 * CartPanel — IVA contract tests.
 * Uses renderToStaticMarkup (consistent with existing booking test patterns).
 *
 * SEV-1: F1 (IVA contract) — tests verify no hardcoded IVA rate.
 *        Must pass with BOTH 0.21 AND 0.10 rates to prove no hardcoding.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CartPanel } from '@/core/chatbot/booking/CartPanel';
import type { Service } from '@/core/types/adapter';

// framer-motion: snapshot-safe SSR rendering
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SERVICES: Service[] = [
  { id: 'svc-1', name: 'Cambio de aceite', basePrice: 40, duration: 60 },
  { id: 'svc-2', name: 'Pre-ITV completo', basePrice: 80, duration: 90, category: 'paquete' },
];

const CART_WITH_SERVICES = {
  vehicle: { plate: '1234 ABC', model: 'BMW Serie 3' },
  selectedServiceIds: ['svc-1', 'svc-2'],
  slot: { slotISO: '2025-06-15T10:30:00' },
  guest: { name: 'Pedro García' },
};

const CART_EMPTY = {
  vehicle: undefined,
  selectedServiceIds: [],
  slot: undefined,
  guest: undefined,
};

const CART_ONE_SERVICE = {
  selectedServiceIds: ['svc-1'],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatEUR(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

// ---------------------------------------------------------------------------
// IVA contract tests (SEV-1: F1)
// ---------------------------------------------------------------------------

// SEV-1: F1
describe('CartPanel — IVA contract', () => {
  it('subtotal renders as NET sum (no IVA applied)', () => {
    const html = renderToStaticMarkup(
      <CartPanel
        cart={CART_WITH_SERVICES}
        services={SERVICES}
        ivaRate={0.21}
        onEditFrom={vi.fn()}
      />,
    );
    // NET subtotal = 40 + 80 = 120
    const subtotalNet = 120;
    expect(html).toContain(formatEUR(subtotalNet));
  });

  it('IVA amount renders as subtotal * ivaRate — rate 0.21', () => {
    const html = renderToStaticMarkup(
      <CartPanel
        cart={CART_WITH_SERVICES}
        services={SERVICES}
        ivaRate={0.21}
        onEditFrom={vi.fn()}
      />,
    );
    // IVA = 120 * 0.21 = 25.20
    const ivaAmount = 120 * 0.21;
    expect(html).toContain(formatEUR(ivaAmount));
    // Label shows computed rate percentage
    expect(html).toContain('IVA (21 %)');
  });

  it('total renders as subtotal * (1 + ivaRate) — rate 0.21', () => {
    const html = renderToStaticMarkup(
      <CartPanel
        cart={CART_WITH_SERVICES}
        services={SERVICES}
        ivaRate={0.21}
        onEditFrom={vi.fn()}
      />,
    );
    // Total gross = 120 * 1.21 = 145.20
    const total = 120 * 1.21;
    expect(html).toContain(formatEUR(total));
  });

  it('IVA amount renders as subtotal * ivaRate — rate 0.10 (proves no hardcoding)', () => {
    // SEV-1: F1 — must pass with different rate to prove no hardcoded 0.21
    const html = renderToStaticMarkup(
      <CartPanel
        cart={CART_WITH_SERVICES}
        services={SERVICES}
        ivaRate={0.10}
        onEditFrom={vi.fn()}
      />,
    );
    // IVA = 120 * 0.10 = 12
    const ivaAmount = 120 * 0.10;
    expect(html).toContain(formatEUR(ivaAmount));
    expect(html).toContain('IVA (10 %)');
  });

  it('total renders as subtotal * (1 + ivaRate) — rate 0.10 (proves no hardcoding)', () => {
    // SEV-1: F1 — must pass with different rate to prove no hardcoded 1.21
    const html = renderToStaticMarkup(
      <CartPanel
        cart={CART_WITH_SERVICES}
        services={SERVICES}
        ivaRate={0.10}
        onEditFrom={vi.fn()}
      />,
    );
    // Total gross = 120 * 1.10 = 132
    const total = 120 * 1.10;
    expect(html).toContain(formatEUR(total));
  });

  it('single service IVA breakdown is correct — rate 0.21', () => {
    const html = renderToStaticMarkup(
      <CartPanel
        cart={CART_ONE_SERVICE}
        services={SERVICES}
        ivaRate={0.21}
        onEditFrom={vi.fn()}
      />,
    );
    // svc-1 basePrice 40 NET
    const subtotal = 40;
    const ivaAmount = subtotal * 0.21;
    const total = subtotal * 1.21;
    expect(html).toContain(formatEUR(subtotal));
    expect(html).toContain(formatEUR(ivaAmount));
    expect(html).toContain(formatEUR(total));
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe('CartPanel — empty state', () => {
  it('renders empty state message when no services', () => {
    const html = renderToStaticMarkup(
      <CartPanel
        cart={CART_EMPTY}
        services={SERVICES}
        ivaRate={0.21}
        onEditFrom={vi.fn()}
      />,
    );
    expect(html).toContain('Aún no hay servicios seleccionados');
  });

  it('does NOT render IVA breakdown when no services', () => {
    const html = renderToStaticMarkup(
      <CartPanel
        cart={CART_EMPTY}
        services={SERVICES}
        ivaRate={0.21}
        onEditFrom={vi.fn()}
      />,
    );
    expect(html).not.toContain('Subtotal');
    expect(html).not.toContain('IVA');
    expect(html).not.toContain('Total');
  });
});

// ---------------------------------------------------------------------------
// Edit pencils
// ---------------------------------------------------------------------------

describe('CartPanel — edit pencils', () => {
  it('renders an edit button for each selected service row', () => {
    const html = renderToStaticMarkup(
      <CartPanel
        cart={CART_WITH_SERVICES}
        services={SERVICES}
        ivaRate={0.21}
        onEditFrom={vi.fn()}
      />,
    );
    // One edit pencil per selected service (svc-1 and svc-2)
    expect(html).toContain('aria-label="Editar Cambio de aceite"');
    expect(html).toContain('aria-label="Editar Pre-ITV completo"');
  });

  it('renders edit button for vehicle row when vehicle present', () => {
    const html = renderToStaticMarkup(
      <CartPanel
        cart={CART_WITH_SERVICES}
        services={SERVICES}
        ivaRate={0.21}
        onEditFrom={vi.fn()}
      />,
    );
    expect(html).toContain('aria-label="Editar vehículo"');
  });

  it('renders edit button for slot row when slot present', () => {
    const html = renderToStaticMarkup(
      <CartPanel
        cart={CART_WITH_SERVICES}
        services={SERVICES}
        ivaRate={0.21}
        onEditFrom={vi.fn()}
      />,
    );
    expect(html).toContain('aria-label="Editar cita"');
  });

  it('renders edit button for guest row when guest present', () => {
    const html = renderToStaticMarkup(
      <CartPanel
        cart={CART_WITH_SERVICES}
        services={SERVICES}
        ivaRate={0.21}
        onEditFrom={vi.fn()}
      />,
    );
    expect(html).toContain('aria-label="Editar datos de contacto"');
  });

  it('onEditFrom is injectable as a prop (SSR contract)', () => {
    const onEditFrom = vi.fn();
    renderToStaticMarkup(
      <CartPanel
        cart={CART_WITH_SERVICES}
        services={SERVICES}
        ivaRate={0.21}
        onEditFrom={onEditFrom}
      />,
    );
    // Not called during SSR
    expect(onEditFrom).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Accessible landmark
// ---------------------------------------------------------------------------

describe('CartPanel — accessibility', () => {
  it('has an aside with aria-label "Resumen de la reserva"', () => {
    const html = renderToStaticMarkup(
      <CartPanel
        cart={CART_EMPTY}
        services={[]}
        ivaRate={0.21}
        onEditFrom={vi.fn()}
      />,
    );
    expect(html).toContain('aria-label="Resumen de la reserva"');
  });

  it('has a tri-stripe accent element', () => {
    const html = renderToStaticMarkup(
      <CartPanel
        cart={CART_EMPTY}
        services={[]}
        ivaRate={0.21}
        onEditFrom={vi.fn()}
      />,
    );
    expect(html).toContain('class="tri-stripe"');
  });
});
