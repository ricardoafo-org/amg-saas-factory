export const MOTION = {
  pageEnter: {
    initial:    { opacity: 0, y: 18 },
    animate:    { opacity: 1, y: 0 },
    transition: { duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },

  cardHover: {
    whileHover:  { y: -4, boxShadow: '0 8px 24px hsl(349 79% 55% / 0.18)' },
    transition:  { duration: 0.18, ease: 'easeOut' },
  },

  chatMessage: {
    initial:    { opacity: 0, y: 8, scale: 0.97 },
    animate:    { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.22, ease: [0.34, 1.56, 0.64, 1] as const },
  },

  toastEnter: {
    initial:    { opacity: 0, x: 48 },
    animate:    { opacity: 1, x: 0 },
    exit:       { opacity: 0, x: 48 },
    transition: { duration: 0.24, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },

  fadeIn: {
    initial:    { opacity: 0 },
    animate:    { opacity: 1 },
    transition: { duration: 0.2 },
  },

  staggerChildren: { staggerChildren: 0.07 },

  slideUp: {
    initial:    { opacity: 0, y: 24 },
    animate:    { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },

  scaleIn: {
    initial:    { opacity: 0, scale: 0.94 },
    animate:    { opacity: 1, scale: 1 },
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
  },
} as const;
