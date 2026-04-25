'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { MOTION } from '@/lib/motion';

type Props = {
  date: string;  // e.g. "mañana"
  time: string;  // e.g. "10:30"
};

export function ConfirmCard({ date, time }: Props) {
  const prefersReduced = useReducedMotion();

  // When reduced motion is preferred, snap to final state instantly.
  const circleAnim = prefersReduced
    ? { pathLength: 1 }
    : MOTION.checkDraw.circle.animate;

  const tickAnim = prefersReduced
    ? { pathLength: 1 }
    : MOTION.checkDraw.tick.animate;

  const circleTransition = prefersReduced
    ? { duration: 0 }
    : MOTION.checkDraw.circle.transition;

  const tickTransition = prefersReduced
    ? { duration: 0 }
    : MOTION.checkDraw.tick.transition;

  return (
    <motion.div
      {...MOTION.chatMessage}
      style={{
        alignSelf: 'stretch',
        background: 'oklch(0.58 0.14 148 / 0.10)',
        border: '1px solid oklch(0.58 0.14 148 / 0.30)',
        borderRadius: 12,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        textAlign: 'center',
      }}
      role="status"
      aria-live="polite"
    >
      {/* SVG check draw */}
      <svg
        width="62"
        height="62"
        viewBox="0 0 62 62"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <motion.circle
          cx="31"
          cy="31"
          r="27"
          stroke="var(--success)"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          initial={MOTION.checkDraw.circle.initial}
          animate={circleAnim}
          transition={circleTransition}
        />
        <motion.polyline
          points="19 32 28 41 44 22"
          stroke="var(--success)"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={MOTION.checkDraw.tick.initial}
          animate={tickAnim}
          transition={tickTransition}
        />
      </svg>

      {/* Copy */}
      <div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 16,
            color: 'var(--fg)',
            marginBottom: 4,
          }}
        >
          ¡Cita reservada!
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--fg-muted)',
            lineHeight: 1.5,
          }}
        >
          Te esperamos{' '}
          <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{date}</span> a las{' '}
          <span
            style={{
              color: 'var(--fg)',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
            }}
          >
            {time}
          </span>
          .
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: 'var(--fg-muted)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.04em',
          }}
        >
          Te hemos mandado un SMS con los detalles.
        </div>
      </div>
    </motion.div>
  );
}
