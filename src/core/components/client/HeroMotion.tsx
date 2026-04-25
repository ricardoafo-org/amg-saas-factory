'use client';

import { motion } from 'framer-motion';
import { MOTION } from '@/lib/motion';

/**
 * Animated tri-stripe eyebrow for the Hero section.
 * Each stripe reveals left-to-right with a stagger (Motion #06).
 */
export function HeroStripes() {
  return (
    <motion.span
      className="amg-stripes"
      aria-hidden
      initial="hidden"
      animate="visible"
      variants={{ visible: MOTION.stripesRevealStagger }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          variants={{
            hidden: MOTION.stripesReveal.initial,
            visible: {
              ...MOTION.stripesReveal.animate,
              transition: MOTION.stripesReveal.transition,
            },
          }}
        />
      ))}
    </motion.span>
  );
}

/**
 * Animated SVG underline draw under "taller" in the Hero headline.
 * Draws a red arc-like underline on mount (Motion #05, 520ms outExpo).
 */
export function HeroUnderlineDraw({ children }: { children: React.ReactNode }) {
  return (
    <span className="under" style={{ position: 'relative', display: 'inline-block' }}>
      {children}
      <motion.svg
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: '-0.12em',
          width: '100%',
          height: '0.18em',
          overflow: 'visible',
        }}
        viewBox="0 0 100 8"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M2 6 Q50 1 98 6"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={MOTION.underlineDraw.initial}
          animate={MOTION.underlineDraw.animate}
          transition={MOTION.underlineDraw.transition}
        />
      </motion.svg>
    </span>
  );
}
