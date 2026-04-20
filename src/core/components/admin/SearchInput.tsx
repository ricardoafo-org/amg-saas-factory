'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { Search } from 'lucide-react';

type Props = {
  placeholder?: string;
  paramName?: string;
};

export function SearchInput({ placeholder = 'Buscar…', paramName = 'q' }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(paramName, e.target.value);
      params.set('page', '1');
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams, paramName],
  );

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        type="search"
        defaultValue={searchParams.get(paramName) ?? ''}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`
          w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border
          bg-secondary text-foreground placeholder:text-muted-foreground
          focus:outline-none focus:ring-2 focus:ring-primary/40
          transition-all
          ${isPending ? 'opacity-70' : ''}
        `}
      />
    </div>
  );
}
