import { getVehicles } from '@/actions/admin/vehicles';
import { VehicleTable } from '@/core/components/admin/VehicleTable';
import { SearchInput } from '@/core/components/admin/SearchInput';
import type { VehicleSortField } from '@/actions/admin/vehicles';
import { getStaffCtx } from '@/lib/auth';

type Props = {
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
};

const VALID_SORTS: VehicleSortField[] = ['itv_expiry', 'plate', 'brand'];

export default async function VehiclesPage({ searchParams }: Props) {
  await getStaffCtx();

  const params = await searchParams;
  const q = params.q ?? '';
  const rawSort = params.sort as VehicleSortField | undefined;
  const sort: VehicleSortField =
    rawSort && VALID_SORTS.includes(rawSort) ? rawSort : 'itv_expiry';
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);

  const result = await getVehicles(page, q, sort);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Vehículos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {result.totalItems} vehículo{result.totalItems !== 1 ? 's' : ''} en total
          </p>
        </div>
        <div className="w-full sm:w-72">
          <SearchInput placeholder="Buscar por matrícula…" />
        </div>
      </div>

      <VehicleTable result={result} sort={sort} q={q} page={page} />
    </div>
  );
}
