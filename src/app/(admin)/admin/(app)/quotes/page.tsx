import Link from 'next/link';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { getQuotes } from '@/actions/admin/quotes';
import { QuoteKanban } from '@/core/components/admin/QuoteKanban';
import type { QuoteStatus } from '@/actions/admin/quotes';
import { cn } from '@/lib/cn';

type SearchParams = {
  status?: string;
  sort?: string;
};

type Props = {
  searchParams: Promise<SearchParams>;
};

const VALID_STATUSES: QuoteStatus[] = ['pending', 'sent', 'accepted', 'rejected'];
const VALID_SORTS = ['date_asc', 'date_desc', 'amount_asc', 'amount_desc'] as const;

export default async function QuotesPage({ searchParams }: Props) {
  const params = await searchParams;

  const statusParam = params.status as QuoteStatus | undefined;
  const status =
    statusParam && VALID_STATUSES.includes(statusParam) ? statusParam : undefined;

  const sortParam = params.sort as (typeof VALID_SORTS)[number] | undefined;
  const sort =
    sortParam && (VALID_SORTS as readonly string[]).includes(sortParam)
      ? sortParam
      : undefined;

  const result = await getQuotes({ status, sort });
  const quotes = result.ok ? result.quotes : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Presupuestos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {result.ok
              ? `${quotes.length} presupuesto${quotes.length !== 1 ? 's' : ''}`
              : 'Error al cargar los presupuestos'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter/sort controls */}
          <FilterBar status={status} sort={sort ?? 'date_desc'} />

          <Link
            href="/admin/quotes/new"
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium',
              'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
            )}
          >
            <Plus className="h-4 w-4" />
            Nuevo presupuesto
          </Link>
        </div>
      </div>

      {/* Error state */}
      {!result.ok && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {result.error}
        </div>
      )}

      {/* Kanban board */}
      <QuoteKanban quotes={quotes} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilterBar (Client Island — uses form GET for URL-param navigation)
// ---------------------------------------------------------------------------

function FilterBar({
  status,
  sort,
}: {
  status: QuoteStatus | undefined;
  sort: string;
}) {
  return (
    <form method="GET" action="/admin/quotes" className="flex items-center gap-2">
      <div className="relative">
        <SlidersHorizontal className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <select
          name="status"
          defaultValue={status ?? ''}
          className={cn(
            'h-9 pl-8 pr-3 rounded-lg border border-border bg-secondary text-sm text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer',
          )}
          aria-label="Filtrar por estado"
          onChange={(e) => {
            const form = e.currentTarget.form;
            if (form) form.requestSubmit();
          }}
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="sent">Enviado</option>
          <option value="accepted">Aprobado</option>
          <option value="rejected">Rechazado</option>
        </select>
      </div>

      <select
        name="sort"
        defaultValue={sort}
        className={cn(
          'h-9 px-3 rounded-lg border border-border bg-secondary text-sm text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer',
        )}
        aria-label="Ordenar por"
        onChange={(e) => {
          const form = e.currentTarget.form;
          if (form) form.requestSubmit();
        }}
      >
        <option value="date_desc">Más recientes</option>
        <option value="date_asc">Más antiguos</option>
        <option value="amount_desc">Mayor importe</option>
        <option value="amount_asc">Menor importe</option>
      </select>
    </form>
  );
}
