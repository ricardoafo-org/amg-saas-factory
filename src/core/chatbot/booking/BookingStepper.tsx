'use client';

// Re-export the steps constant from the existing read-only stepper so both
// the ChatEngine path (PR-A/B) and BookingApp share the same labels.
// DO NOT delete the existing src/core/chatbot/components/BookingStepper.tsx —
// ChatEngine still uses it until PR-C.
export { STEPPER_STEPS } from '@/core/chatbot/components/BookingStepper';

type Props = {
  /** 0-based current step index */
  step: number;
  /** Indices of steps that have been fully completed */
  completedSteps: number[];
  /** Called when user taps a past (completed) step to jump back */
  onJumpTo: (step: number) => void;
};

const STEPS = ['Vehículo', 'Servicios', 'Hueco', 'Datos', 'Revisar'] as const;

/**
 * Interactive stepper for BookingApp.
 * - Past steps (in completedSteps): clickable, fires onJumpTo
 * - Current step: aria-current="step", non-clickable
 * - Future steps: visual-only, no-op on click
 */
export function BookingStepper({ step, completedSteps, onJumpTo }: Props) {
  return (
    <nav
      className="flex items-center gap-0 shrink-0 px-3 py-2.5 border-b"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      aria-label="Progreso de reserva"
    >
      {STEPS.map((label, i) => {
        const isPast = completedSteps.includes(i) && i !== step;
        const isCurrent = i === step;
        const isFuture = !isPast && !isCurrent;
        const isClickable = isPast;

        return (
          <div key={label} className="flex items-center flex-1 min-w-0">
            {/* Node */}
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <button
                type="button"
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={
                  isClickable
                    ? `Volver a ${label}`
                    : isCurrent
                      ? `Paso actual: ${label}`
                      : label
                }
                onClick={isClickable ? () => onJumpTo(i) : undefined}
                disabled={!isClickable && !isCurrent}
                className={[
                  'flex items-center justify-center rounded-full',
                  'transition-colors duration-200',
                  isClickable ? 'cursor-pointer hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50' : 'cursor-default',
                ].join(' ')}
                style={{
                  width: 22,
                  height: 22,
                  fontSize: 9,
                  fontWeight: 700,
                  background: isPast
                    ? 'var(--success)'
                    : isCurrent
                      ? 'var(--primary)'
                      : 'var(--border)',
                  color: isFuture ? 'var(--fg-muted)' : 'oklch(1 0 0)',
                }}
              >
                {isPast ? (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span>{i + 1}</span>
                )}
              </button>

              <span
                className="hidden sm:block"
                style={{
                  fontSize: 9,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.04em',
                  color: isFuture ? 'var(--fg-muted)' : 'var(--fg)',
                  opacity: isFuture ? 0.4 : 1,
                  transition: 'opacity 0.25s',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </div>

            {/* Connector */}
            {i < STEPS.length - 1 && (
              <div
                className="flex-1 mx-1"
                style={{
                  height: 1,
                  marginBottom: 14,
                  background: isPast ? 'var(--success)' : 'var(--border)',
                  opacity: isPast ? 0.6 : 0.35,
                  transition: 'background 0.25s, opacity 0.25s',
                }}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
