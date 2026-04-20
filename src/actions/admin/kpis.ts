'use server';

import { getStaffCtx } from '@/lib/auth';

export type KpiData = {
  todayCount: number;
  inProgressCount: number;
  readyCount: number;
  todayRevenue: number;
  yesterdayCount: number;
  yesterdayInProgressCount: number;
  yesterdayReadyCount: number;
  yesterdayRevenue: number;
};

/**
 * Fetches today's and yesterday's KPI data scoped to the authenticated staff's tenant.
 * IVA rate comes from the config collection — never hardcoded.
 */
export async function getTodayKpis(): Promise<KpiData> {
  const ctx = await getStaffCtx();
  const { pb, tenantId } = ctx;

  // Fetch IVA rate from config collection
  let ivaRate = 0.21; // fallback only if config is missing
  try {
    const configResult = await pb.collection('config').getFirstListItem(
      `tenant_id = "${tenantId}" && key = "iva_rate"`,
    );
    const parsed = parseFloat(configResult['value'] as string);
    if (!isNaN(parsed)) ivaRate = parsed;
  } catch {
    // config key absent — use default 0.21
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayEnd = todayStart;

  const toIso = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 19);

  const [todayItems, yesterdayItems] = await Promise.all([
    pb
      .collection('appointments')
      .getFullList({
        filter: `tenant_id = "${tenantId}" && scheduled_at >= "${toIso(todayStart)}" && scheduled_at < "${toIso(todayEnd)}"`,
      }),
    pb
      .collection('appointments')
      .getFullList({
        filter: `tenant_id = "${tenantId}" && scheduled_at >= "${toIso(yesterdayStart)}" && scheduled_at < "${toIso(yesterdayEnd)}"`,
      }),
  ]);

  const revenueStatuses = new Set(['confirmed', 'in_progress', 'ready', 'delivered', 'completed']);

  const calcRevenue = (items: typeof todayItems) =>
    items
      .filter((r) => revenueStatuses.has(r['status'] as string))
      .reduce((sum, r) => {
        const base = (r['base_amount'] as number) ?? 0;
        return sum + base * (1 + ivaRate);
      }, 0);

  return {
    todayCount: todayItems.length,
    inProgressCount: todayItems.filter((r) => r['status'] === 'in_progress').length,
    readyCount: todayItems.filter((r) => r['status'] === 'ready').length,
    todayRevenue: calcRevenue(todayItems),
    yesterdayCount: yesterdayItems.length,
    yesterdayInProgressCount: yesterdayItems.filter((r) => r['status'] === 'in_progress').length,
    yesterdayReadyCount: yesterdayItems.filter((r) => r['status'] === 'ready').length,
    yesterdayRevenue: calcRevenue(yesterdayItems),
  };
}
