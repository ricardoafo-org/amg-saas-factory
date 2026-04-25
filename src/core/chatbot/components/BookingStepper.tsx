'use client';

import { motion } from 'framer-motion';
import { MOTION } from '@/lib/motion';

export const STEPPER_STEPS = [
  'Vehículo',
  'Servicios',
  'Hueco',
  'Datos',
  'Revisar',
] as const;

type Props = {
  /** 0-based current step index */
  step: number;
};

export function BookingStepper({ step }: Props) {
  return (
    <div
      className="flex items-center gap-0 shrink-0 px-3 py-2.5 border-b"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      role="navigation"
      aria-label="Progreso de reserva"
    >
      {STEPPER_STEPS.map((label, i) => {
        const isPast    = i < step;
        const isCurrent = i === step;
        const isFuture  = i > step;

        return (
          <div key={label} className="flex items-center flex-1 min-w-0">
            {/* Node */}
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <motion.div
                {...MOTION.chatMessage}
                transition={{ ...MOTION.chatMessage.transition, delay: i * 0.04 }}
                className="flex items-center justify-center rounded-full"
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
                  transition: 'background 0.25s var(--ease-soft)',
                }}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isPast ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span>{i + 1}</span>
                )}
              </motion.div>
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
            {i < STEPPER_STEPS.length - 1 && (
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
    </div>
  );
}
