import Link from 'next/link';
import { cn } from '@/lib/cn';
import { formatDate, itvUrgency } from '@/lib/format';
import type { VehicleListResult, VehicleSortField } from '@/actions/admin/vehicles';

type Props = {
  result: VehicleListResult;
  sort: VehicleSortField;
  q: string;
  page: number;
};

function ItvBadge({ expiry }: { expiry: string }) {
  const urgency = itvUrgency(expiry);
  return (
    <span
      className={cn(
        'inline-block text-xs px-1.5 py-0.5 rounded font-medium',
        urgency === 'expired' && 'bg-destructive/15 text-destructive',
        urgency === 'soon' && 'bg-warning/15 text-warning-foreground',
        urgency === 'ok' && 'bg-success/15 text-success',
        urgency === 'unknown' && 'bg-muted text-muted-foreground',
      )}
    >
      {expiry ? formatDate(expiry) : 'Sin fecha'}
    </span>
  );
}

function SortLink({
  field,
  label,
  current,
  q,
  page,
}: {
  field: VehicleSortField;
  label: string;
  current: VehicleSortField;
  q: string;
  page: number;
}) {
  const params = new URLSearchParams({ sort: field, q, page: String(page) });
  return (
    <Link
      href={`/admin/vehicles?${params.toString()}`}
      className={cn(
        'text-xs font-medium transition-colors',
        current === field
          ? 'text-primary'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
      {current === field && <span className="ml-1">▲</span>}
    </Link>
  );
}

export function VehicleTable({ result, sort, q, page }: Props) {
  if (result.items.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <p className="text-muted-foreground text-sm">
          {q ? 'No se encontraron vehículos para esa matrícula.' : 'Aún no hay vehículos registrados.'}
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header */}
      <div className="hidden md:grid grid-cols-[1.5fr_2fr_2fr_1fr_1.5fr] gap-4 px-4 py-3 border-b border-border text-xs text-muted-foreground">
        <SortLink field="plate" label="Matrícula" current={sort} q={q} page={page} />
        <SortLink field="brand" label="Marca / Modelo" current={sort} q={q} page={page} />
        <span>Cliente</span>
        <span>Último km</span>
        <SortLink field="itv_expiry" label="Vence ITV" current={sort} q={q} page={page} />
      </div>

      <ul>
        {result.items.map((vehicle, i) => (
          <li key={vehicle.id}>
            <Link
              href={`/admin/vehicles/${vehicle.id}`}
              className={cn(
                'grid grid-cols-1 md:grid-cols-[1.5fr_2fr_2fr_1fr_1.5fr] gap-4 px-4 py-4 transition-colors hover:bg-muted/40',
                i < result.items.length - 1 && 'border-b border-border',
              )}
            >
              {/* Plate */}
              <p className="text-sm font-mono font-semibold text-foreground uppercase">
                {vehicle.plate}
              </p>

              {/* Brand / Model / Year */}
              <p className="text-sm text-foreground">
                {vehicle.brand} {vehicle.model}
                <span className="ml-1 text-muted-foreground text-xs">({vehicle.year})</span>
              </p>

              {/* Customer name */}
              <p className="text-sm text-muted-foreground truncate">
                {vehicle.customer_name || '—'}
              </p>

              {/* Last km */}
              <p className="text-sm text-muted-foreground hidden md:block">
                {vehicle.last_km ? `${vehicle.last_km.toLocaleString('es-ES')} km` : '—'}
              </p>

              {/* ITV expiry */}
              <div className="hidden md:block">
                <ItvBadge expiry={vehicle.itv_expiry} />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Pagination */}
      {result.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {result.totalItems} vehículos
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/vehicles?${new URLSearchParams({ sort, q, page: String(page - 1) })}`}
                className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-muted transition-colors"
              >
                Anterior
              </Link>
            )}
            {page < result.totalPages && (
              <Link
                href={`/admin/vehicles?${new URLSearchParams({ sort, q, page: String(page + 1) })}`}
                className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-muted transition-colors"
              >
                Siguiente
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
