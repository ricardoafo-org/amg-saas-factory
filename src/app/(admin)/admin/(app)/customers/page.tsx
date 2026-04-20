import { getCustomers } from '@/actions/admin/customers';
import { CustomerTable } from '@/core/components/admin/CustomerTable';
import { SearchInput } from '@/core/components/admin/SearchInput';
import type { SortField } from '@/actions/admin/customers';
import { getStaffCtx } from '@/lib/auth';

type Props = {
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
};

const VALID_SORTS: SortField[] = ['name', 'last_seen', 'total_spent'];

export default async function CustomersPage({ searchParams }: Props) {
  await getStaffCtx();

  const params = await searchParams;
  const q = params.q ?? '';
  const rawSort = params.sort as SortField | undefined;
  const sort: SortField =
    rawSort && VALID_SORTS.includes(rawSort) ? rawSort : 'name';
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);

  const result = await getCustomers(page, q, sort);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {result.totalItems} cliente{result.totalItems !== 1 ? 's' : ''} en total
          </p>
        </div>
        <div className="w-full sm:w-72">
          <SearchInput placeholder="Buscar por nombre o email…" />
        </div>
      </div>

      <CustomerTable result={result} sort={sort} q={q} page={page} />
    </div>
  );
}
