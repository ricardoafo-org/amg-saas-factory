'use client';

import { useState, useEffect, RefObject, useCallback } from 'react';

export type Layout = 'mobile' | 'desktop';

export type ContainerLayout = {
  layout: Layout;
  width: number;
};

const BREAKPOINT = 768;

/**
 * Measures the host element via ResizeObserver, rAF-throttled to avoid
 * layout thrash. Returns 'mobile' until first measurement (SSR-safe).
 *
 * Breakpoint: 768 px (container width, NOT viewport).
 */
export function useContainerLayout(ref: RefObject<HTMLElement | null>): ContainerLayout {
  const [state, setState] = useState<ContainerLayout>({ layout: 'mobile', width: 0 });

  const handleResize = useCallback((entries: ResizeObserverEntry[]) => {
    const entry = entries[0];
    if (!entry) return;

    const width = entry.contentRect.width;
    const layout: Layout = width >= BREAKPOINT ? 'desktop' : 'mobile';

    requestAnimationFrame(() => {
      setState((prev) => {
        if (prev.layout === layout && prev.width === width) return prev;
        return { layout, width };
      });
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(handleResize);
    observer.observe(el);

    // Seed with current size immediately
    const rect = el.getBoundingClientRect();
    const width = rect.width;
    const layout: Layout = width >= BREAKPOINT ? 'desktop' : 'mobile';
    setState({ layout, width });

    return () => observer.disconnect();
  }, [ref, handleResize]);

  return state;
}
