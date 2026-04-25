'use server';

import { getStaffCtx } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Customer } from '@/types/pb';

export type CustomerRow = Pick<
  Customer,
  | 'id'
  | 'name'
  | 'email'
  | 'phone'
  | 'first_seen'
  | 'last_seen'
  | 'total_visits'
  | 'total_spent'
  | 'marketing_consent'
  | 'preferred_contact'
  | 'notes'
>;

export type CustomerListResult = {
  items: (CustomerRow & { vehicle_count: number })[];
  totalPages: number;
  totalItems: number;
};

export type SortField = 'name' | 'last_seen' | 'total_spent';

export async function getCustomers(
  page = 1,
  q = '',
  sort: SortField = 'name',
): Promise<CustomerListResult> {
  const ctx = await getStaffCtx();
  const perPage = 20;

  const filterParams: Record<string, string> = { tenantId: ctx.tenantId };
  let filterTpl = 'tenant_id = {:tenantId}';
  if (q.trim()) {
    filterParams['q'] = q.trim();
    filterTpl += ' && (name ~ {:q} || email ~ {:q})';
  }
  const filter = ctx.pb.filter(filterTpl, filterParams);

  const sortMap: Record<SortField, string> = {
    name: 'name',
    last_seen: '-last_seen',
    total_spent: '-total_spent',
  };

  const res = await ctx.pb.collection('customers').getList(page, perPage, {
    filter,
    sort: sortMap[sort],
  });

  // Fetch vehicle counts for all customer ids in one batch
  const ids = res.items.map((c) => c.id);
  const vehicleCountMap: Record<string, number> = {};

  if (ids.length > 0) {
    const idPlaceholders = ids.map((_, i) => `customer_id = {:cid${i}}`).join(' || ');
    const vehicleParams: Record<string, string> = { tenantId: ctx.tenantId };
    ids.forEach((id, i) => { vehicleParams[`cid${i}`] = id; });
    const vehicles = await ctx.pb.collection('vehicles').getFullList({
      filter: ctx.pb.filter(`tenant_id = {:tenantId} && (${idPlaceholders})`, vehicleParams),
      fields: 'customer_id',
    });
    for (const v of vehicles) {
      const cid = v['customer_id'] as string;
      vehicleCountMap[cid] = (vehicleCountMap[cid] ?? 0) + 1;
    }
  }

  return {
    items: res.items.map((r) => ({
      id: r.id,
      name: r['name'] as string,
      email: r['email'] as string,
      phone: r['phone'] as string,
      first_seen: r['first_seen'] as string,
      last_seen: r['last_seen'] as string,
      total_visits: r['total_visits'] as number,
      total_spent: r['total_spent'] as number,
      marketing_consent: r['marketing_consent'] as boolean,
      preferred_contact: r['preferred_contact'] as Customer['preferred_contact'],
      notes: r['notes'] as string,
      vehicle_count: vehicleCountMap[r.id] ?? 0,
    })),
    totalPages: res.totalPages,
    totalItems: res.totalItems,
  };
}

export type CustomerDetail = CustomerRow & {
  vehicles: Array<{
    id: string;
    plate: string;
    brand: string;
    model: string;
    year: number;
    last_km: number;
    itv_expiry: string;
    fuel_type: string;
  }>;
  appointments: Array<{
    id: string;
    scheduled_at: string;
    service_type: string;
    base_amount: number;
    status: string;
  }>;
  appointmentsTotalPages: number;
};

export async function getCustomer(
  id: string,
  appointmentsPage = 1,
): Promise<CustomerDetail | null> {
  const ctx = await getStaffCtx();

  let customer;
  try {
    customer = await ctx.pb.collection('customers').getOne(id, {
      filter: ctx.pb.filter('tenant_id = {:tenantId}', { tenantId: ctx.tenantId }),
    });
  } catch {
    return null;
  }

  // Verify tenant ownership
  if ((customer['tenant_id'] as string) !== ctx.tenantId) {
    return null;
  }

  const [vehiclesRes, appointmentsRes] = await Promise.all([
    ctx.pb.collection('vehicles').getFullList({
      filter: ctx.pb.filter(
        'tenant_id = {:tenantId} && customer_id = {:id}',
        { tenantId: ctx.tenantId, id },
      ),
      sort: '-created',
    }),
    ctx.pb.collection('appointments').getList(appointmentsPage, 10, {
      filter: ctx.pb.filter(
        'tenant_id = {:tenantId} && customer_id = {:id}',
        { tenantId: ctx.tenantId, id },
      ),
      sort: '-scheduled_at',
    }),
  ]);

  return {
    id: customer.id,
    name: customer['name'] as string,
    email: customer['email'] as string,
    phone: customer['phone'] as string,
    notes: customer['notes'] as string,
    first_seen: customer['first_seen'] as string,
    last_seen: customer['last_seen'] as string,
    total_visits: customer['total_visits'] as number,
    total_spent: customer['total_spent'] as number,
    marketing_consent: customer['marketing_consent'] as boolean,
    preferred_contact: customer['preferred_contact'] as Customer['preferred_contact'],
    vehicles: vehiclesRes.map((v) => ({
      id: v.id,
      plate: v['plate'] as string,
      brand: v['brand'] as string,
      model: v['model'] as string,
      year: v['year'] as number,
      last_km: v['last_km'] as number,
      itv_expiry: v['itv_expiry'] as string,
      fuel_type: v['fuel_type'] as string,
    })),
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

const UpdateCustomerSchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().max(20),
  notes: z.string().max(1000),
  preferred_contact: z.enum(['sms', 'email', 'whatsapp']),
  marketing_consent: z.boolean(),
});

export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput,
): Promise<ActionResult> {
  const ctx = await getStaffCtx();

  const parsed = UpdateCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Datos inválidos' };
  }

  // Verify ownership — scoped getOne prevents unscoped reads
  let existing;
  try {
    existing = await ctx.pb.collection('customers').getFirstListItem(
      ctx.pb.filter('id = {:id} && tenant_id = {:tenantId}', { id, tenantId: ctx.tenantId }),
    );
  } catch {
    return { success: false, error: 'Cliente no encontrado' };
  }

  const isConsentChange =
    parsed.data.marketing_consent !== undefined &&
    parsed.data.marketing_consent !== (existing['marketing_consent'] as boolean);

  if (isConsentChange) {
    try {
      await ctx.pb.collection('consent_log').create({
        tenant_id: ctx.tenantId,
        customer_id: id,
        type: parsed.data.marketing_consent ? 'marketing_opt_in' : 'marketing_opt_out',
        source: 'admin_edit',
        ip: 'admin',
      });
    } catch {
      return { success: false, error: 'Error al registrar el consentimiento' };
    }
  }

  try {
    await ctx.pb.collection('customers').update(id, parsed.data);
  } catch {
    return { success: false, error: 'Error al guardar los cambios' };
  }

  revalidatePath(`/admin/customers/${id}`);
  revalidatePath('/admin/customers');
  return { success: true };
}
