import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStaffCtx } from '@/lib/auth';
import type { Quote, QuoteStatus } from '@/actions/admin/quotes';
import { cn } from '@/lib/cn';
import { QuoteStatusActions } from './_components/QuoteStatusActions';

type Props = {
  params: Promise<{ id: string }>;
};

const STATUS_CONFIG: Record<QuoteStatus, { label: string; className: string }> = {
  pending: { label: 'Borrador', className: 'bg-warning/10 text-warning border-warning/20' },
  sent: { label: 'Enviado', className: 'bg-info/10 text-info border-info/20' },
  accepted: { label: 'Aprobado', className: 'bg-success/10 text-success border-success/20' },
  rejected: { label: 'Rechazado', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export default async function QuoteDetailPage({ params }: Props) {
  const ctx = await getStaffCtx();
  const { pb, tenantId } = ctx;

  const { id } = await params;

  let quote: Quote | null = null;
  try {
    // eslint-disable-next-line no-restricted-syntax -- TODO Week 2 / FEAT-053: migrate to getQuoteById() Server Action (ADR-014)
    const record = await pb.collection('quotes').getOne(id);
    if ((record['tenant_id'] as string) !== tenantId) {
      notFound();
    }
    quote = {
      id: record.id,
      tenant_id: record['tenant_id'] as string,
      customer_name: (record['customer_name'] as string) ?? '',
      customer_email: (record['customer_email'] as string) ?? '',
      customer_phone: (record['customer_phone'] as string) ?? '',
      vehicle_description: (record['vehicle_description'] as string) ?? '',
      vehicle_plate: (record['vehicle_plate'] as string) ?? '',
      problem_description: (record['problem_description'] as string) ?? '',
      service_type: (record['service_type'] as string) ?? '',
      items: (record['items'] as Quote['items']) ?? [],
      subtotal: (record['subtotal'] as number) ?? 0,
      iva_rate: (record['iva_rate'] as number) ?? 0,
      total: (record['total'] as number) ?? 0,
      status: (record['status'] as QuoteStatus) ?? 'pending',
      valid_until: (record['valid_until'] as string) ?? '',
      notes: (record['notes'] as string) ?? '',
      source: (record['source'] as Quote['source']) ?? 'manual',
      created: record.created,
      updated: record.updated,
    };
  } catch {
    notFound();
  }

  const statusCfg = STATUS_CONFIG[quote.status];
  const ivaAmount = quote.total - quote.subtotal;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {quote.customer_name}
            </h1>
            {quote.vehicle_plate && (
              <span className="text-base font-mono text-muted-foreground uppercase">
                {quote.vehicle_plate}
              </span>
            )}
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
                statusCfg.className,
              )}
            >
              {statusCfg.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {quote.service_type}
          </p>
        </div>

        <QuoteStatusActions quoteId={quote.id} status={quote.status} />
      </div>

      {/* Line items */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-b border-border text-xs text-muted-foreground">
          <span>Descripción</span>
          <span className="text-center">Cant.</span>
          <span className="text-right">P. unitario</span>
          <span className="text-center">Tipo</span>
          <span className="text-right">Total</span>
        </div>

        {quote.items.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            Sin conceptos
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {quote.items.map((item, i) => (
              <li
                key={i}
                className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3"
              >
                <span className="text-sm text-foreground">{item.description}</span>
                <span className="text-sm text-muted-foreground sm:text-center">{item.qty}</span>
                <span className="text-sm text-muted-foreground sm:text-right">{formatEur(item.unit_price)}</span>
                <span className="text-sm text-muted-foreground sm:text-center capitalize">{item.type}</span>
                <span className="text-sm font-medium text-foreground sm:text-right">
                  {formatEur(item.qty * item.unit_price)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Totals */}
        <div className="border-t border-border px-4 py-4 space-y-1.5 text-sm">
          <div className="flex justify-end gap-8">
            <span className="text-muted-foreground">Subtotal (sin IVA)</span>
            <span className="tabular-nums font-medium text-foreground w-24 text-right">
              {formatEur(quote.subtotal)}
            </span>
          </div>
          <div className="flex justify-end gap-8">
            <span className="text-muted-foreground">
              IVA ({(quote.iva_rate * 100).toFixed(0)}%)
            </span>
            <span className="tabular-nums text-muted-foreground w-24 text-right">
              {formatEur(ivaAmount)}
            </span>
          </div>
          <div className="flex justify-end gap-8 pt-1 border-t border-border mt-2">
            <span className="font-semibold text-foreground">Total</span>
            <span className="tabular-nums font-bold text-primary text-base w-24 text-right">
              {formatEur(quote.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Meta info */}
      <div className="glass rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Válido hasta</p>
          <p className="font-medium text-foreground">
            {quote.valid_until ? formatDate(quote.valid_until) : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Creado</p>
          <p className="font-medium text-foreground">{formatDate(quote.created)}</p>
        </div>
        {quote.vehicle_description && (
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Vehículo</p>
            <p className="font-medium text-foreground">{quote.vehicle_description}</p>
          </div>
        )}
        {quote.source && (
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Origen</p>
            <p className="font-medium text-foreground capitalize">{quote.source}</p>
          </div>
        )}
      </div>

      {quote.notes && (
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Notas internas</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{quote.notes}</p>
        </div>
      )}

      <div className="flex justify-start">
        <Link
          href="/admin/quotes"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Volver a presupuestos
        </Link>
      </div>

      <div className="h-4" />
    </div>
  );
}
