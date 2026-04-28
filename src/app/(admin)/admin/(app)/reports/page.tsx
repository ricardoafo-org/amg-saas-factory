import { getStaffCtx } from '@/lib/auth';
import { aggregateDailyRevenue, aggregateServiceRevenue, computeKpis, formatEur } from '@/lib/reports/aggregations';
import { resolveDateRange } from '@/lib/reports/date-ranges';
import { RevenueBarChart } from '@/core/components/admin/reports/RevenueBarChart';
import { ServiceDonutChart } from '@/core/components/admin/reports/ServiceDonutChart';
import { CsvDownloadButton } from './_components/CsvDownloadButton';
import type { Booking } from '@/types/pb';

export default async function ReportsPage() {
  const ctx = await getStaffCtx();
  const { pb, tenantId } = ctx;

  const range = resolveDateRange('30d');
  const fromStr = range.from.toISOString().slice(0, 10);
  const toStr = range.to.toISOString().slice(0, 10);

  let bookings: Booking[] = [];
  try {
    // eslint-disable-next-line no-restricted-syntax -- TODO Week 2 / FEAT-053: migrate to getReportRangeData() Server Action (ADR-014)
    const res = await pb.collection('appointments').getFullList({
      filter: pb.filter(
        'tenant_id = {:tenantId} && scheduled_at >= {:fromStr} && scheduled_at < {:toStr}',
        { tenantId, fromStr, toStr },
      ),
      sort: 'scheduled_at',
    });

    bookings = res.map((r) => ({
      id: r.id,
      created: r.created,
      updated: r.updated,
      collectionId: r.collectionId,
      collectionName: r.collectionName,
      tenant_id: tenantId,
      customer_name: (r['customer_name'] as string) ?? '',
      customer_email: (r['customer_email'] as string) ?? '',
      customer_phone: (r['customer_phone'] as string) ?? '',
      service_type: (r['service_type'] as string) ?? '',
      scheduled_at: (r['scheduled_at'] as string) ?? '',
      notes: (r['notes'] as string) ?? '',
      status: (r['status'] as Booking['status']) ?? 'pending',
      base_amount: (r['base_amount'] as number) ?? 0,
      iva_rate: (r['iva_rate'] as number) ?? 0,
    }));
  } catch {
    bookings = [];
  }

  const dailyRevenue = aggregateDailyRevenue(bookings);
  const serviceRevenue = aggregateServiceRevenue(bookings);
  const kpis = computeKpis(bookings);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Informes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{range.label}</p>
        </div>
        <CsvDownloadButton bookings={bookings} />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Ingresos totales</p>
          <p className="text-2xl font-bold text-foreground mt-1">{formatEur(kpis.totalRevenue)}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Base imponible</p>
          <p className="text-2xl font-bold text-foreground mt-1">{formatEur(kpis.totalBase)}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">IVA recaudado</p>
          <p className="text-2xl font-bold text-foreground mt-1">{formatEur(kpis.totalIva)}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Citas completadas</p>
          <p className="text-2xl font-bold text-foreground mt-1">{kpis.volume.completed}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Ingresos diarios</h2>
          <RevenueBarChart data={dailyRevenue} />
        </div>

        <div className="glass rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Desglose por servicio</h2>
          <ServiceDonutChart data={serviceRevenue} />
        </div>
      </div>

      <div className="h-4" />
    </div>
  );
}
