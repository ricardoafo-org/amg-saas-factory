/**
 * Motion presets — single source of truth for framer-motion across the app.
 *
 * Mirrors the canonical bundle in:
 *   design-system/colors_and_type.css           (motion tokens)
 *   design-system/ui_kits/website/Motion Playground.html  (named motions, Tier 1-3)
 *
 * Token parity:
 *   --dur-fast   150ms
 *   --dur-base   220ms
 *   --dur-slow   320ms
 *   --ease-out   cubic-bezier(0.25, 0.46, 0.45, 0.94)
 *   --ease-soft  cubic-bezier(0.22, 1,    0.36, 1)
 *   --ease-spring cubic-bezier(0.34, 1.4, 0.64, 1)
 */

const EASE_OUT    = [0.25, 0.46, 0.45, 0.94] as const;
const EASE_SOFT   = [0.22, 1,    0.36, 1]    as const;
const EASE_SPRING = [0.34, 1.4,  0.64, 1]    as const;

const DUR_FAST = 0.15;
const DUR_BASE = 0.22;
const DUR_SLOW = 0.32;

export const EASE = {
  out:    EASE_OUT,
  soft:   EASE_SOFT,
  spring: EASE_SPRING,
} as const;

export const DUR = {
  fast: DUR_FAST,
  base: DUR_BASE,
  slow: DUR_SLOW,
} as const;

export const MOTION = {
  pageEnter: {
    initial:    { opacity: 0, y: 18 },
    animate:    { opacity: 1, y: 0 },
    transition: { duration: DUR_SLOW, ease: EASE_OUT },
  },

  cardHover: {
    whileHover:  { y: -4, boxShadow: 'var(--shadow-lg)' },
    transition:  { duration: DUR_FAST, ease: EASE_OUT },
  },

  chatMessage: {
    initial:    { opacity: 0, y: 8, scale: 0.96 },
    animate:    { opacity: 1, y: 0, scale: 1 },
    transition: { duration: DUR_BASE, ease: EASE_SPRING },
  },

  toastEnter: {
    initial:    { opacity: 0, x: 48 },
    animate:    { opacity: 1, x: 0 },
    exit:       { opacity: 0, x: 48 },
    transition: { duration: DUR_BASE, ease: EASE_OUT },
  },

  fadeIn: {
    initial:    { opacity: 0 },
    animate:    { opacity: 1 },
    transition: { duration: DUR_BASE, ease: EASE_OUT },
  },

  staggerChildren: { staggerChildren: 0.06 },

  slideUp: {
    initial:    { opacity: 0, y: 24 },
    animate:    { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: EASE_SOFT },
  },

  scaleIn: {
    initial:    { opacity: 0, scale: 0.94 },
    animate:    { opacity: 1, scale: 1 },
    transition: { duration: DUR_SLOW, ease: EASE_SOFT },
  },

  // Tier 1 — Ship first

  /** TrustStrip counters · 720ms outExpo when entering viewport. */
  counter: {
    duration: 0.72,
    ease: EASE_SOFT,
  },

  /** ITV days tween · 320ms outExpo. Cross to red below 30-day threshold. */
  itvTween: {
    duration: DUR_SLOW,
    ease: EASE_SOFT,
  },

  /** Service grid stagger · 220ms · 60ms stagger · viewport once. */
  serviceCard: {
    initial:    { opacity: 0, y: 14 },
    whileInView:{ opacity: 1, y: 0 },
    viewport:   { once: true, margin: '-10% 0px' },
    transition: { duration: DUR_BASE, ease: EASE_OUT },
  },
  serviceGridStagger: { staggerChildren: 0.06 },

  // Tier 2 — Polish pass

  /** Hero keyword underline draw · 520ms outExpo on mount. SVG strokeDashoffset. */
  underlineDraw: {
    initial:    { pathLength: 0, opacity: 0 },
    animate:    { pathLength: 1, opacity: 1 },
    transition: { duration: 0.52, ease: EASE_SOFT, delay: 0.4 },
  },

  /** BMW-M tri-stripes reveal · 0 → 14px · 80ms stagger. */
  stripesReveal: {
    initial:    { scaleX: 0 },
    animate:    { scaleX: 1 },
    transition: { duration: 0.26, ease: EASE_OUT },
  },
  stripesRevealStagger: { staggerChildren: 0.08 },

  /** Quick-reply chip stagger · 180ms · 50ms stagger after bot bubble. */
  chip: {
    initial:    { opacity: 0, y: 6 },
    animate:    { opacity: 1, y: 0 },
    transition: { duration: 0.18, ease: EASE_OUT },
  },
  chipStagger: { staggerChildren: 0.05 },

  /** Booking flow step · cross-fade + 32px slide · 260ms soft. */
  flowStep: {
    initial:    { opacity: 0, x: 32 },
    animate:    { opacity: 1, x: 0 },
    exit:       { opacity: 0, x: -32 },
    transition: { duration: 0.26, ease: EASE_SOFT },
  },

  /** Confirmation check · 2-stage SVG draw · 600ms total (circle then tick). */
  checkDraw: {
    circle: {
      initial:    { pathLength: 0 },
      animate:    { pathLength: 1 },
      transition: { duration: 0.42, ease: EASE_SOFT },
    },
    tick: {
      initial:    { pathLength: 0 },
      animate:    { pathLength: 1 },
      transition: { duration: 0.26, ease: EASE_OUT, delay: 0.3 },
    },
  },

  /** Pulsing live-status dot · used in chat header & hero caption. */
  pulseDot: {
    animate:    { opacity: [1, 0.4, 1] },
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' as const },
  },

  /**
   * BookingApp bubble enter — overshoot ease per spec acceptance row 8.
   * Ease [0.34, 1.56, 0.64, 1] produces perceptible spring overshoot.
   * Duration capped at 320 ms (DUR_SLOW) per spec constraint.
   */
  bubbleOvershoot: {
    duration: DUR_SLOW,
    ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  },

  /**
   * Typing-dots loop — 3-dot opacity stagger, repeat infinite.
   * Each dot animates opacity 0.3 → 1 → 0.3 with 0.15s stagger between dots.
   * Use with nth-child(1|2|3) delay offsets.
   */
  typingDots: {
    animate:    { opacity: [0.3, 1, 0.3] },
    transition: { duration: 0.9, repeat: Infinity, ease: 'easeInOut' as const },
    stagger:    0.15,
  },

  /**
   * Cart row enter — slide-in from left with fade.
   * opacity 0→1, x -8→0, DUR_BASE, EASE_OUT.
   */
  cartRowEnter: {
    initial:    { opacity: 0, x: -8 },
    animate:    { opacity: 1, x: 0 },
    transition: { duration: DUR_BASE, ease: EASE_OUT },
  },
} as const;
