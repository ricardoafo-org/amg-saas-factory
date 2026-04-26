'use client';

import type { Service } from '@/core/types/adapter';

const fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

type Props = {
  service: Service;
  ivaRate: number;
  /** Fired when the user clicks the edit pencil */
  onEdit: () => void;
};

/**
 * PackageRow — single row in CartPanel for a service/package.
 * Shows name, duration and NET price. Edit pencil fires onEdit callback.
 * basePrice is NET — renders gross via basePrice * (1 + ivaRate).
 */
export function PackageRow({ service, ivaRate, onEdit }: Props) {
  const grossPrice = service.basePrice * (1 + ivaRate);

  return (
    <div className="flex items-center gap-2 py-1.5">
      {/* Service info */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium leading-tight truncate"
          style={{ color: 'var(--fg)' }}
        >
          {service.name}
        </p>
        {service.duration != null && (
          <p
            className="text-[10px] tabular-nums"
            style={{ color: 'var(--fg-muted)' }}
          >
            ~{service.duration} min
          </p>
        )}
      </div>

      {/* Price (gross) */}
      <span
        className="text-sm font-semibold tabular-nums shrink-0"
        style={{ color: 'var(--fg)' }}
      >
        {fmt.format(grossPrice)}
      </span>

      {/* Edit pencil */}
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Editar ${service.name}`}
        className="shrink-0 flex items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2"
        style={{
          width: 28,
          height: 28,
          color: 'var(--fg-muted)',
          background: 'transparent',
          transition: 'color 0.15s',
        }}
      >
        {/* Pencil icon — inline SVG, no emoji per spec */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
    </div>
  );
}
