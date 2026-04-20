import { describe, it, expect } from 'vitest';
import { MOTION } from '@/lib/motion';

describe('MOTION constants completeness', () => {
  it('has pageEnter', () => {
    expect(MOTION.pageEnter).toBeDefined();
    expect(MOTION.pageEnter.initial).toBeDefined();
    expect(MOTION.pageEnter.animate).toBeDefined();
    expect(MOTION.pageEnter.transition).toBeDefined();
  });

  it('has cardHover', () => {
    expect(MOTION.cardHover).toBeDefined();
    expect(MOTION.cardHover.whileHover).toBeDefined();
  });

  it('has chatMessage', () => {
    expect(MOTION.chatMessage).toBeDefined();
    expect(MOTION.chatMessage.initial).toBeDefined();
    expect(MOTION.chatMessage.animate).toBeDefined();
  });

  it('has toastEnter with exit', () => {
    expect(MOTION.toastEnter).toBeDefined();
    expect(MOTION.toastEnter.exit).toBeDefined();
  });

  it('has fadeIn', () => {
    expect(MOTION.fadeIn).toBeDefined();
    expect(MOTION.fadeIn.initial).toBeDefined();
    expect(MOTION.fadeIn.animate).toBeDefined();
  });

  it('has staggerChildren', () => {
    expect(MOTION.staggerChildren).toBeDefined();
    expect(MOTION.staggerChildren.staggerChildren).toBe(0.07);
  });

  it('has slideUp with correct shape', () => {
    expect(MOTION.slideUp).toBeDefined();
    expect(MOTION.slideUp.initial).toBeDefined();
    expect(MOTION.slideUp.animate).toBeDefined();
    expect(MOTION.slideUp.transition).toBeDefined();
    // y-based slide
    const initial = MOTION.slideUp.initial as { y: number };
    expect(typeof initial.y).toBe('number');
    expect(initial.y).toBeGreaterThan(0);
  });

  it('has scaleIn with correct shape', () => {
    expect(MOTION.scaleIn).toBeDefined();
    expect(MOTION.scaleIn.initial).toBeDefined();
    expect(MOTION.scaleIn.animate).toBeDefined();
    const initial = MOTION.scaleIn.initial as { scale: number };
    expect(initial.scale).toBeLessThan(1);
  });

  it('all keys are present', () => {
    const required = ['pageEnter', 'cardHover', 'chatMessage', 'toastEnter', 'fadeIn', 'staggerChildren', 'slideUp', 'scaleIn'];
    for (const key of required) {
      expect(MOTION).toHaveProperty(key);
    }
  });
});
