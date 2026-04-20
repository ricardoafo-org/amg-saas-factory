import Link from 'next/link';
import { cn } from '@/lib/cn';
import type { Quote, QuoteStatus } from '@/actions/admin/quotes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatEur(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Returns expiry state: 'ok' | 'warning' (< 3 days) | 'expired'
 */
function expiryState(validUntil: string): 'ok' | 'warning' | 'expired' {
  if (!validUntil) return 'ok';
  const now = new Date();
  const expiry = new Date(validUntil);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'expired';
  if (diffDays < 3) return 'warning';
  return 'ok';
}

// ---------------------------------------------------------------------------
// Column config
// ---------------------------------------------------------------------------

const COLUMNS: { status: QuoteStatus; label: string; color: string }[] = [
  { status: 'pending', label: 'Pendiente', color: 'text-warning border-warning/30' },
  { status: 'sent', label: 'Enviado', color: 'text-info border-info/30' },
  { status: 'accepted', label: 'Aprobado', color: 'text-success border-success/30' },
  { status: 'rejected', label: 'Rechazado', color: 'text-destructive border-destructive/30' },
];

// ---------------------------------------------------------------------------
// QuoteCard
// ---------------------------------------------------------------------------

function QuoteCard({ quote }: { quote: Quote }) {
  const state = expiryState(quote.valid_until);

  return (
    <Link href={`/admin/quotes/${quote.id}`} className="block group">
      <div
        className={cn(
          'glass rounded-lg p-3 space-y-2 transition-all duration-150 hover:border-primary/40 hover:shadow-glow cursor-pointer',
          state === 'warning' && 'border-warning/50',
          state === 'expired' && 'border-destructive/50',
        )}
      >
        {/* Customer + amount */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {quote.customer_name || 'Sin nombre'}
          </span>
          <span className="text-sm font-semibold text-primary shrink-0">
            {formatEur(quote.total)}
          </span>
        </div>

        {/* Service or vehicle */}
        <p className="text-xs text-muted-foreground truncate">
          {quote.service_type
            ? quote.service_type
            : quote.vehicle_plate
              ? `Veh. ${quote.vehicle_plate}`
              : quote.vehicle_description || '—'}
        </p>

        {/* Dates row */}
        <div className="flex items-center justify-between text-xs gap-1">
          <span className="text-muted-foreground">{formatDate(quote.created)}</span>

          {/* Expiry badge */}
          {quote.valid_until && (
            <span
              className={cn(
                'px-1.5 py-0.5 rounded text-xs font-medium',
                state === 'ok' && 'text-muted-foreground',
                state === 'warning' && 'bg-warning/10 text-warning',
                state === 'expired' && 'bg-destructive/10 text-destructive',
              )}
            >
              {state === 'expired'
                ? 'Caducado'
                : state === 'warning'
                  ? `Vence ${formatDate(quote.valid_until)}`
                  : `Válido hasta ${formatDate(quote.valid_until)}`}
            </span>
          )}
        </div>

        {/* Source badge */}
        {quote.source === 'chatbot' && (
          <span className="inline-block text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
            Chatbot
          </span>
        )}
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// QuoteKanban (Server Component)
// ---------------------------------------------------------------------------

type QuoteKanbanProps = {
  quotes: Quote[];
};

export function QuoteKanban({ quotes }: QuoteKanbanProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {COLUMNS.map((col) => {
        const colQuotes = quotes.filter((q) => q.status === col.status);

        return (
          <div key={col.status} className="flex flex-col gap-2">
            {/* Column header */}
            <div
              className={cn(
                'flex items-center justify-between px-3 py-2 rounded-lg border glass',
                col.color,
              )}
            >
              <span className="text-xs font-semibold uppercase tracking-wider">
                {col.label}
              </span>
              <span className="text-xs font-bold bg-secondary rounded-full px-2 py-0.5">
                {colQuotes.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 min-h-[120px]">
              {colQuotes.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
                  Sin presupuestos
                </div>
              ) : (
                colQuotes.map((q) => <QuoteCard key={q.id} quote={q} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
