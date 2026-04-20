'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const REFRESH_INTERVAL_MS = 30_000;

/**
 * Thin client component that triggers router.refresh() every 30 seconds.
 * This causes Next.js to re-fetch Server Component data without a full page reload.
 * The page itself stays a Server Component — only this wrapper needs 'use client'.
 */
export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(id);
  }, [router]);

  return null;
}
