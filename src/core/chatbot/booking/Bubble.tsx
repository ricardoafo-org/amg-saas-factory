'use client';

import { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MOTION } from '@/lib/motion';

type Props = {
  role: 'bot' | 'user';
  children: ReactNode;
};

/**
 * Chat message bubble with framer-motion overshoot enter animation.
 * Respects prefers-reduced-motion: snaps in without overshoot when active.
 */
export function Bubble({ role, children }: Props) {
  const reduceMotion = useReducedMotion();

  const transition = reduceMotion
    ? { duration: 0, ease: 'linear' as const }
    : MOTION.bubbleOvershoot;

  const isBot = role === 'bot';

  return (
    <motion.div
      initial={{ opacity: 0, y: reduceMotion ? 0 : 8, scale: reduceMotion ? 1 : 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={transition}
      className={isBot ? 'bub' : 'bub user'}
    >
      {children}
    </motion.div>
  );
}
