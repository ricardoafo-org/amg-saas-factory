import { getStaffCtx } from '@/lib/auth';
import { addBusinessDays } from '@/lib/quotes/helpers';
import { QuoteForm } from '@/core/components/admin/QuoteForm';

export default async function NewQuotePage() {
  const ctx = await getStaffCtx();
  const { pb, tenantId } = ctx;

  let ivaRate = 0;
  try {
    const config = await pb
      .collection('config')
      .getFirstListItem(
        pb.filter('tenant_id = {:tenantId} && key = {:key}', {
          tenantId,
          key: 'iva_rate',
        }),
      );
    const parsed = parseFloat(config['value'] as string);
    if (!isNaN(parsed) && parsed > 0) ivaRate = parsed;
  } catch {
    // config key absent; admin must set IVA rate in Settings
  }

  const validUntil = addBusinessDays(new Date(), 12);
  const validUntilLabel = validUntil.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Nuevo presupuesto</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Presupuesto orientativo — válido hasta {validUntilLabel}
        </p>
      </div>

      <QuoteForm ivaRate={ivaRate} validUntilLabel={validUntilLabel} />
    </div>
  );
}
