'use server';

import { revalidatePath } from 'next/cache';
import { getStaffCtx } from '@/lib/auth';
import { addBusinessDays } from '@/lib/quotes/helpers';

export type QuoteLineItem = {
  description: string;
  qty: number;
  unit_price: number;
  type: 'labor' | 'parts' | 'diagnostic';
};

export type QuoteStatus = 'pending' | 'sent' | 'accepted' | 'rejected';

export type Quote = {
  id: string;
  tenant_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  vehicle_description: string;
  vehicle_plate: string;
  problem_description: string;
  service_type: string;
  items: QuoteLineItem[];
  subtotal: number;
  iva_rate: number;
  total: number;
  status: QuoteStatus;
  valid_until: string;
  notes: string;
  source: 'chatbot' | 'manual';
  created: string;
  updated: string;
};

export type GetQuotesResult =
  | { ok: true; quotes: Quote[] }
  | { ok: false; error: string };

/**
 * Fetch all quotes for the authenticated staff's tenant.
 * Optionally filter by status and sort by field.
 */
export async function getQuotes(opts?: {
  status?: QuoteStatus;
  sort?: 'date_asc' | 'date_desc' | 'amount_asc' | 'amount_desc';
}): Promise<GetQuotesResult> {
  try {
    const ctx = await getStaffCtx();
    const { pb, tenantId } = ctx;

    const filters: string[] = [`tenant_id = "${tenantId}"`];
    if (opts?.status) {
      filters.push(`status = "${opts.status}"`);
    }

    const sortMap: Record<string, string> = {
      date_asc: '+created',
      date_desc: '-created',
      amount_asc: '+total',
      amount_desc: '-total',
    };
    const sort = opts?.sort ? sortMap[opts.sort] : '-created';

    const records = await pb.collection('quotes').getFullList({
      filter: filters.join(' && '),
      sort,
    });

    const quotes = records.map((r) => ({
      id: r.id,
      tenant_id: r['tenant_id'] as string,
      customer_name: (r['customer_name'] as string) ?? '',
      customer_email: (r['customer_email'] as string) ?? '',
      customer_phone: (r['customer_phone'] as string) ?? '',
      vehicle_description: (r['vehicle_description'] as string) ?? '',
      vehicle_plate: (r['vehicle_plate'] as string) ?? '',
      problem_description: (r['problem_description'] as string) ?? '',
      service_type: (r['service_type'] as string) ?? '',
      items: (r['items'] as QuoteLineItem[]) ?? [],
      subtotal: (r['subtotal'] as number) ?? 0,
      iva_rate: (r['iva_rate'] as number) ?? 0,
      total: (r['total'] as number) ?? 0,
      status: (r['status'] as QuoteStatus) ?? 'pending',
      valid_until: (r['valid_until'] as string) ?? '',
      notes: (r['notes'] as string) ?? '',
      source: (r['source'] as 'chatbot' | 'manual') ?? 'manual',
      created: r.created,
      updated: r.updated,
    }));

    return { ok: true, quotes };
  } catch {
    return { ok: false, error: 'No se pudieron cargar los presupuestos' };
  }
}

export type CreateQuoteInput = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  vehicle_plate: string;
  vehicle_description: string;
  service_type: string;
  items: QuoteLineItem[];
  notes: string;
};

export type CreateQuoteResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * Create a new quote (manual source, pending status).
 * IVA rate fetched from config collection — never hardcoded.
 * Expiry = today + 12 business days (RD 1457/1986).
 */
export async function createQuote(input: CreateQuoteInput): Promise<CreateQuoteResult> {
  try {
    const ctx = await getStaffCtx();
    const { pb, tenantId } = ctx;

    // IVA rate from config collection — mandatory
    const ivaConfig = await pb
      .collection('config')
      .getFirstListItem(
        pb.filter('tenant_id = {:tenantId} && key = {:key}', {
          tenantId,
          key: 'iva_rate',
        }),
      );
    const ivaRate = parseFloat(ivaConfig['value'] as string);

    // Compute totals from line items
    const subtotal = input.items.reduce(
      (sum, item) => sum + item.qty * item.unit_price,
      0,
    );
    const total = subtotal * (1 + ivaRate);

    // RD 1457/1986: valid_until = today + 12 business days
    const validUntil = addBusinessDays(new Date(), 12);
    const validUntilStr = validUntil.toISOString().split('T')[0] + ' 00:00:00.000Z';

    const record = await pb.collection('quotes').create({
      tenant_id: tenantId,
      customer_name: input.customer_name,
      customer_email: input.customer_email,
      customer_phone: input.customer_phone,
      vehicle_plate: input.vehicle_plate,
      vehicle_description: input.vehicle_description,
      service_type: input.service_type,
      items: input.items,
      subtotal,
      iva_rate: ivaRate,
      total,
      status: 'pending',
      valid_until: validUntilStr,
      notes: input.notes,
      source: 'manual',
    });

    revalidatePath('/admin/quotes');
    return { ok: true, id: record.id };
  } catch {
    return { ok: false, error: 'No se pudo crear el presupuesto' };
  }
}

export type UpdateQuoteStatusResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Update the status of a quote — tenant-scoped, server-validated.
 */
export async function updateQuoteStatus(
  id: string,
  status: QuoteStatus,
): Promise<UpdateQuoteStatusResult> {
  try {
    const ctx = await getStaffCtx();
    const { pb, tenantId } = ctx;

    // Verify ownership — scoped query enforces tenant isolation at DB layer
    await pb.collection('quotes').getFirstListItem(
      `id = "${id}" && tenant_id = "${tenantId}"`,
    );

    await pb.collection('quotes').update(id, { status });

    revalidatePath('/admin/quotes');
    revalidatePath(`/admin/quotes/${id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'No se pudo actualizar el estado' };
  }
}
