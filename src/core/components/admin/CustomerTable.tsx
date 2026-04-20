import Link from 'next/link';
import { cn } from '@/lib/cn';
import { formatCurrency, formatDate } from '@/lib/format';
import type { CustomerListResult, SortField } from '@/actions/admin/customers';

type Props = {
  result: CustomerListResult;
  sort: SortField;
  q: string;
  page: number;
};

function SortLink({
  field,
  label,
  current,
  q,
  page,
}: {
  field: SortField;
  label: string;
  current: SortField;
  q: string;
  page: number;
}) {
  const params = new URLSearchParams({ sort: field, q, page: String(page) });
  return (
    <Link
      href={`/admin/customers?${params.toString()}`}
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

export function CustomerTable({ result, sort, q, page }: Props) {
  if (result.items.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <p className="text-muted-foreground text-sm">
          {q ? 'No se encontraron clientes para esa búsqueda.' : 'Aún no hay clientes registrados.'}
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header */}
      <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-b border-border text-xs text-muted-foreground">
        <SortLink field="name" label="Nombre" current={sort} q={q} page={page} />
        <span>Email</span>
        <span>Teléfono</span>
        <span>Vehículos</span>
        <SortLink field="last_seen" label="Últ. visita" current={sort} q={q} page={page} />
        <SortLink field="total_spent" label="Gasto total" current={sort} q={q} page={page} />
      </div>

      {/* Rows */}
      <ul>
        {result.items.map((customer, i) => (
          <li key={customer.id}>
            <Link
              href={`/admin/customers/${customer.id}`}
              className={cn(
                'grid grid-cols-1 md:grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-4 transition-colors hover:bg-muted/40',
                i < result.items.length - 1 && 'border-b border-border',
              )}
            >
              {/* Mobile: stacked layout */}
              <div className="md:contents">
                {/* Name + consent badge */}
                <div className="flex items-start justify-between md:block">
                  <div>
                    <p className="text-sm font-medium text-foreground">{customer.name}</p>
                    {customer.marketing_consent && (
                      <span className="inline-block mt-0.5 text-xs px-1.5 py-0.5 rounded bg-success/15 text-success">
                        Acepta comunicaciones comerciales
                      </span>
                    )}
                  </div>
                  {/* Mobile-only: total */}
                  <span className="md:hidden text-sm font-semibold text-foreground">
                    {formatCurrency(customer.total_spent)}
                  </span>
                </div>

                {/* Email */}
                <p className="text-sm text-muted-foreground truncate">{customer.email}</p>

                {/* Phone */}
                <p className="text-sm text-muted-foreground">{customer.phone || '—'}</p>

                {/* Vehicle count */}
                <p className="text-sm text-center text-foreground hidden md:block">{customer.vehicle_count}</p>

                {/* Last visit */}
                <p className="text-sm text-muted-foreground hidden md:block">
                  {customer.last_seen ? formatDate(customer.last_seen) : '—'}
                </p>

                {/* Total spent */}
                <p className="text-sm font-semibold text-foreground hidden md:block">
                  {formatCurrency(customer.total_spent)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Pagination */}
      {result.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {result.totalItems} clientes
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/customers?${new URLSearchParams({ sort, q, page: String(page - 1) })}`}
                className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-muted transition-colors"
              >
                Anterior
              </Link>
            )}
            {page < result.totalPages && (
              <Link
                href={`/admin/customers?${new URLSearchParams({ sort, q, page: String(page + 1) })}`}
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
