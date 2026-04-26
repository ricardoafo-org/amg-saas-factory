'use client';

import { useEffect } from 'react';

const SCROLL_THRESHOLD = 16;

export function NavbarScrollEffect() {
  useEffect(() => {
    const header = document.querySelector('header.nav');
    if (!(header instanceof HTMLElement)) return;

    let ticking = false;
    const update = () => {
      const scrolled = window.scrollY > SCROLL_THRESHOLD;
      header.dataset['scrolled'] = scrolled ? 'true' : 'false';
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return null;
}
