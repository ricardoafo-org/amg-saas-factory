'use server';

import { getStaffCtx } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Vehicle } from '@/types/pb';

export type VehicleRow = {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  fuel_type: Vehicle['fuel_type'];
  last_km: number;
  itv_expiry: string;
  notes: string;
  customer_id: string;
  customer_name: string;
  last_service_date: string;
};

export type VehicleListResult = {
  items: VehicleRow[];
  totalPages: number;
  totalItems: number;
};

export type VehicleSortField = 'itv_expiry' | 'plate' | 'brand';

export async function getVehicles(
  page = 1,
  q = '',
  sort: VehicleSortField = 'itv_expiry',
): Promise<VehicleListResult> {
  const ctx = await getStaffCtx();
  const perPage = 20;

  const filterParams: Record<string, string> = { tenantId: ctx.tenantId };
  let filterTpl = 'tenant_id = {:tenantId}';
  if (q.trim()) {
    filterParams['q'] = q.trim();
    filterTpl += ' && plate ~ {:q}';
  }
  const filter = ctx.pb.filter(filterTpl, filterParams);

  const sortMap: Record<VehicleSortField, string> = {
    itv_expiry: 'itv_expiry',
    plate: 'plate',
    brand: 'brand',
  };

  const res = await ctx.pb.collection('vehicles').getList(page, perPage, {
    filter,
    sort: sortMap[sort],
    expand: 'customer_id',
  });

  // For each vehicle, get the most recent appointment date
  const vehicleIds = res.items.map((v) => v.id);
  const lastServiceMap: Record<string, string> = {};

  if (vehicleIds.length > 0) {
    const idPlaceholders = vehicleIds.map((_, i) => `vehicle_id = {:vid${i}}`).join(' || ');
    const apptParams: Record<string, string> = { tenantId: ctx.tenantId };
    vehicleIds.forEach((id, i) => { apptParams[`vid${i}`] = id; });
    const appts = await ctx.pb.collection('appointments').getFullList({
      filter: ctx.pb.filter(
        `tenant_id = {:tenantId} && (${idPlaceholders}) && status = "completed"`,
        apptParams,
      ),
      sort: '-scheduled_at',
      fields: 'vehicle_id,scheduled_at',
    });
    // Keep the first (most recent) per vehicle
    for (const a of appts) {
      const vid = a['vehicle_id'] as string;
      if (!lastServiceMap[vid]) {
        lastServiceMap[vid] = a['scheduled_at'] as string;
      }
    }
  }

  return {
    items: res.items.map((r) => {
      const expanded = r['expand'] as
        | Record<string, Record<string, unknown>>
        | undefined;
      const customerName =
        (expanded?.['customer_id']?.['name'] as string | undefined) ?? '';

      return {
        id: r.id,
        plate: r['plate'] as string,
        brand: r['brand'] as string,
        model: r['model'] as string,
        year: r['year'] as number,
        fuel_type: r['fuel_type'] as Vehicle['fuel_type'],
        last_km: r['last_km'] as number,
        itv_expiry: r['itv_expiry'] as string,
        notes: r['notes'] as string,
        customer_id: r['customer_id'] as string,
        customer_name: customerName,
        last_service_date: lastServiceMap[r.id] ?? '',
      };
    }),
    totalPages: res.totalPages,
    totalItems: res.totalItems,
  };
}

export type VehicleDetail = VehicleRow & {
  appointments: Array<{
    id: string;
    scheduled_at: string;
    service_type: string;
    base_amount: number;
    status: string;
  }>;
  appointmentsTotalPages: number;
};

export async function getVehicle(
  id: string,
  appointmentsPage = 1,
): Promise<VehicleDetail | null> {
  const ctx = await getStaffCtx();

  let vehicle;
  try {
    vehicle = await ctx.pb.collection('vehicles').getOne(id, {
      expand: 'customer_id',
    });
  } catch {
    return null;
  }

  if ((vehicle['tenant_id'] as string) !== ctx.tenantId) {
    return null;
  }

  const appointmentsRes = await ctx.pb
    .collection('appointments')
    .getList(appointmentsPage, 10, {
      filter: ctx.pb.filter(
        'tenant_id = {:tenantId} && vehicle_id = {:id}',
        { tenantId: ctx.tenantId, id },
      ),
      sort: '-scheduled_at',
    });

  const expanded = vehicle['expand'] as
    | Record<string, Record<string, unknown>>
    | undefined;
  const customerName =
    (expanded?.['customer_id']?.['name'] as string | undefined) ?? '';

  return {
    id: vehicle.id,
    plate: vehicle['plate'] as string,
    brand: vehicle['brand'] as string,
    model: vehicle['model'] as string,
    year: vehicle['year'] as number,
    fuel_type: vehicle['fuel_type'] as Vehicle['fuel_type'],
    last_km: vehicle['last_km'] as number,
    itv_expiry: vehicle['itv_expiry'] as string,
    notes: vehicle['notes'] as string,
    customer_id: vehicle['customer_id'] as string,
    customer_name: customerName,
    last_service_date: '',
    appointments: appointmentsRes.items.map((a) => ({
      id: a.id,
      scheduled_at: a['scheduled_at'] as string,
      service_type: a['service_type'] as string,
      base_amount: a['base_amount'] as number,
      status: a['status'] as string,
    })),
    appointmentsTotalPages: appointmentsRes.totalPages,
  };
}

const UpdateVehicleSchema = z.object({
  last_km: z.number().int().min(0),
  itv_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  fuel_type: z.enum(['gasolina', 'diesel', 'electrico', 'hibrido']),
  notes: z.string().max(1000),
});

export type UpdateVehicleInput = z.infer<typeof UpdateVehicleSchema>;

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

export async function updateVehicle(
  id: string,
  input: UpdateVehicleInput,
): Promise<ActionResult> {
  const ctx = await getStaffCtx();

  const parsed = UpdateVehicleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Datos inválidos' };
  }

  let existing;
  try {
    existing = await ctx.pb.collection('vehicles').getFirstListItem(
      ctx.pb.filter('id = {:id} && tenant_id = {:tenantId}', { id, tenantId: ctx.tenantId }),
    );
  } catch {
    return { success: false, error: 'Vehículo no encontrado' };
  }

  try {
    await ctx.pb.collection('vehicles').update(id, parsed.data);
  } catch {
    return { success: false, error: 'Error al guardar los cambios' };
  }

  revalidatePath(`/admin/vehicles/${id}`);
  revalidatePath('/admin/vehicles');
  return { success: true };
}
