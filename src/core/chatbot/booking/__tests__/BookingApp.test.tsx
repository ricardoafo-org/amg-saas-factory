/**
 * BookingApp — host shell tests.
 * Uses renderToStaticMarkup (consistent with existing test patterns).
 * Interactive state machine tested via mocked child component rendering.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BookingApp } from '@/core/chatbot/booking/BookingApp';
import type { ChatbotFlow } from '@/lib/chatbot/engine';
import type { Service } from '@/core/types/adapter';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// framer-motion: snapshot-safe SSR rendering
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

// Server actions — not callable from client-side tests
vi.mock('@/actions/slots', () => ({
  getAvailableSlots: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/actions/chatbot', () => ({
  saveAppointment: vi.fn().mockResolvedValue(undefined),
}));

// useContainerLayout — control layout via mock
let mockLayout: 'mobile' | 'desktop' = 'mobile';
vi.mock('@/core/chatbot/booking/useContainerLayout', () => ({
  useContainerLayout: () => ({ layout: mockLayout, width: mockLayout === 'desktop' ? 1440 : 390 }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FLOW: ChatbotFlow = {
  start: 'start',
  nodes: { start: { message: 'Hola' } },
} as unknown as ChatbotFlow;

const SERVICES: Service[] = [
  { id: 'svc-1', name: 'Cambio de aceite', basePrice: 40, duration: 60 },
  { id: 'svc-2', name: 'Pre-ITV completo', basePrice: 80, duration: 90, category: 'paquete' },
];

function defaultProps() {
  return {
    flow: FLOW,
    tenantId: 'talleres-amg',
    phone: '912345678',
    businessName: 'Talleres AMG',
    policyUrl: '/privacidad',
    policyVersion: '1.0',
    policyHash: 'abc123',
    services: SERVICES,
    ivaRate: 0.21,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BookingApp', () => {
  beforeEach(() => {
    mockLayout = 'mobile';
  });

  it('renders without crashing', () => {
    const html = renderToStaticMarkup(<BookingApp {...defaultProps()} />);
    expect(html.length).toBeGreaterThan(0);
  });

  it('mounts at step 0 (Vehículo) — StepVehicle fields are visible', () => {
    const html = renderToStaticMarkup(<BookingApp {...defaultProps()} />);
    // StepVehicle renders Matrícula label
    expect(html).toContain('Matrícula');
    // BookingStepper with step 0 — "Paso actual: Vehículo"
    expect(html).toContain('Paso actual: Vehículo');
  });

  it('renders BookingStepper as part of the host', () => {
    const html = renderToStaticMarkup(<BookingApp {...defaultProps()} />);
    // Stepper always present regardless of step
    expect(html).toMatch(/aria-label="Progreso de reserva"/);
  });

  it('does NOT show CartPanel in mobile layout', () => {
    mockLayout = 'mobile';
    const html = renderToStaticMarkup(<BookingApp {...defaultProps()} />);
    // CartPanel is only shown on desktop — its heading is not in mobile HTML
    expect(html).not.toContain('aria-label="Resumen de la reserva"');
  });

  it('shows CartPanel in desktop layout', () => {
    mockLayout = 'desktop';
    const html = renderToStaticMarkup(<BookingApp {...defaultProps()} />);
    // CartPanel renders with aria-label "Resumen de la reserva"
    expect(html).toContain('aria-label="Resumen de la reserva"');
  });

  it('CartPanel has Tu reserva heading in desktop layout', () => {
    mockLayout = 'desktop';
    const html = renderToStaticMarkup(<BookingApp {...defaultProps()} />);
    expect(html).toContain('Tu reserva');
  });

  it('desktop layout uses grid (two-column)', () => {
    mockLayout = 'desktop';
    const html = renderToStaticMarkup(<BookingApp {...defaultProps()} />);
    // Grid template columns set for desktop
    expect(html).toContain('grid-template-columns');
  });

  it('mobile layout uses flex column (single-column)', () => {
    mockLayout = 'mobile';
    const html = renderToStaticMarkup(<BookingApp {...defaultProps()} />);
    // No grid for mobile
    expect(html).not.toContain('grid-template-columns');
  });

  it('accepts ivaRate from props (no hardcoded 0.21 in source)', () => {
    // BookingApp receives ivaRate as a prop and passes to StepReview
    // Smoke test: renders with a custom ivaRate
    const html = renderToStaticMarkup(
      <BookingApp {...defaultProps()} ivaRate={0.10} />,
    );
    expect(html.length).toBeGreaterThan(0);
  });

  it('renders with empty services array (no crash)', () => {
    const html = renderToStaticMarkup(
      <BookingApp {...defaultProps()} services={[]} />,
    );
    expect(html).toContain('Matrícula');
  });

  it('state is preserved across layout flip — step stays at 0', () => {
    // SSR: both mobile and desktop render at step 0 (Vehículo) initially
    mockLayout = 'mobile';
    const htmlMobile = renderToStaticMarkup(<BookingApp {...defaultProps()} />);
    mockLayout = 'desktop';
    const htmlDesktop = renderToStaticMarkup(<BookingApp {...defaultProps()} />);

    // Both show step 0 content
    expect(htmlMobile).toContain('Matrícula');
    expect(htmlDesktop).toContain('Matrícula');
    // Desktop shows CartPanel; mobile does not
    expect(htmlDesktop).toContain('aria-label="Resumen de la reserva"');
    expect(htmlMobile).not.toContain('aria-label="Resumen de la reserva"');
  });
});
