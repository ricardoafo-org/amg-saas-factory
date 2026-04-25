'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { MOTION } from '@/lib/motion';

interface TrustCounterProps {
  /** The formatted display string shown after animation (e.g. "38 años", "12 400", "4,9 / 5", "3 meses"). */
  display: string;
  /** Numeric end value — used for the count-up animation. */
  end: number;
  /** Decimal places for the animated number (default 0). */
  decimals?: number;
  /** Suffix appended after the animated number (e.g. " años", " meses"). */
  suffix?: string;
  /** Prefix prepended before the animated number (e.g. ""). */
  prefix?: string;
  /** Text appended after the numeric part, separated by space (e.g. "/ 5"). */
  after?: string;
  /** If true, use a comma as decimal separator (Spanish locale: "4,9"). */
  decimalComma?: boolean;
  /** If true, use space as thousands separator (Spanish: "12 400"). */
  spacedThousands?: boolean;
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function formatNumber(value: number, decimals: number, decimalComma: boolean, spacedThousands: boolean): string {
  const fixed = value.toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const intFormatted = spacedThousands ? int.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0') : int;
  if (decimals === 0) return intFormatted;
  const separator = decimalComma ? ',' : '.';
  return `${intFormatted}${separator}${dec ?? ''}`;
}

export function TrustCounter({
  display,
  end,
  decimals = 0,
  suffix = '',
  prefix = '',
  after = '',
  decimalComma = false,
  spacedThousands = false,
}: TrustCounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setValue(end);
      return;
    }

    if (!inView || startedRef.current) return;
    startedRef.current = true;

    const duration = MOTION.counter.duration * 1000; // to ms
    const startTime = performance.now();

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      setValue(eased * end);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setValue(end);
      }
    }

    requestAnimationFrame(step);
  }, [inView, end]);

  const formatted = formatNumber(value, decimals, decimalComma, spacedThousands);
  const displayed = inView
    ? `${prefix}${formatted}${suffix}${after ? ` ${after}` : ''}`
    : display; // SSR / before-inview: show final display string for layout stability

  // Before inView fires (server render or first paint before intersection),
  // show the final display string so layout is correct.
  return (
    <div ref={ref} className="trust-num" aria-label={display}>
      {inView ? displayed : display}
    </div>
  );
}
