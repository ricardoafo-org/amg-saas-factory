import { describe, it, expect } from 'vitest';
import { MOTION, EASE, DUR } from '@/lib/motion';

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
    expect(MOTION.staggerChildren.staggerChildren).toBe(0.06);
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

  it('exposes bundle-canonical motion tokens', () => {
    expect(DUR.fast).toBe(0.15);
    expect(DUR.base).toBe(0.22);
    expect(DUR.slow).toBe(0.32);
    expect(EASE.out).toEqual([0.25, 0.46, 0.45, 0.94]);
    expect(EASE.soft).toEqual([0.22, 1, 0.36, 1]);
    expect(EASE.spring).toEqual([0.34, 1.4, 0.64, 1]);
  });

  it('cardHover shadow uses CSS variable, not hardcoded HSL', () => {
    const hover = MOTION.cardHover.whileHover as { boxShadow: string };
    expect(hover.boxShadow).toContain('var(');
    expect(hover.boxShadow).not.toContain('hsl(');
  });

  it('chatMessage spring matches bundle ease-spring (1.4, not 1.56)', () => {
    const ease = (MOTION.chatMessage.transition as { ease: readonly number[] }).ease;
    expect(ease[1]).toBe(1.4);
  });

  it('has Tier-1 booking presets', () => {
    expect(MOTION.counter).toBeDefined();
    expect(MOTION.itvTween).toBeDefined();
    expect(MOTION.serviceCard).toBeDefined();
    expect(MOTION.serviceGridStagger.staggerChildren).toBe(0.06);
  });

  it('has Tier-2 polish presets', () => {
    expect(MOTION.underlineDraw).toBeDefined();
    expect(MOTION.stripesReveal).toBeDefined();
    expect(MOTION.stripesRevealStagger.staggerChildren).toBe(0.08);
    expect(MOTION.chip).toBeDefined();
    expect(MOTION.chipStagger.staggerChildren).toBe(0.05);
    expect(MOTION.flowStep).toBeDefined();
    expect(MOTION.checkDraw.circle).toBeDefined();
    expect(MOTION.checkDraw.tick).toBeDefined();
    expect(MOTION.pulseDot).toBeDefined();
  });
});
