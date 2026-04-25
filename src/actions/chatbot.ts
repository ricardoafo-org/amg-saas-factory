'use server';

import { headers } from 'next/headers';
import { getPb } from '@/lib/pb';
import { loadClientConfig } from '@/lib/config';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { AppointmentConfirmation } from '@/emails/AppointmentConfirmation';
import { QuoteRequest } from '@/emails/QuoteRequest';

async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? h.get('x-real-ip')
      ?? 'unknown';
  } catch { return 'unknown'; }
}

const TENANT_ID = process.env['TENANT_ID'] ?? 'talleres-amg';
const clientConfig = loadClientConfig(TENANT_ID);

type AppointmentPayload = {
  tenantId: string;
  matricula: string;
  fuelType: string;
  fechaPreferida: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceIds: string[];
  policyVersion: string;
  policyHash: string;
  userAgent: string;
};

export async function saveAppointment(payload: AppointmentPayload) {
  const pb = await getPb();
  const ip = await getClientIp();

  await pb.collection('consent_log').create({
    tenant_id: payload.tenantId,
    subject_email: payload.customerEmail,
    policy_version: payload.policyVersion,
    policy_hash: payload.policyHash,
    consented: true,
    consented_at: new Date().toISOString(),
    ip_address: ip,
    user_agent: payload.userAgent,
    form_context: 'chatbot_booking',
  });

  const ivaConfig = await pb.collection('config').getFirstListItem(
    pb.filter('tenant_id = {:tenantId} && key = "iva_rate"', { tenantId: payload.tenantId }),
  );
  const ivaRate = parseFloat(ivaConfig['value']);

  const businessNameConfig = await pb.collection('config').getFirstListItem(
    pb.filter('tenant_id = {:tenantId} && key = "business_name"', { tenantId: payload.tenantId }),
  ).catch(() => null);
  const businessName = businessNameConfig ? String(businessNameConfig['value']) : clientConfig.businessName;

  // Fetch service prices to compute total_amount
  let baseAmount = 0;
  const serviceNames: string[] = [];
  if (payload.serviceIds.length > 0) {
    const placeholders = payload.serviceIds.map((_, i) => `id = {:id${i}}`).join(' || ');
    const params: Record<string, string> = { tenantId: payload.tenantId };
    payload.serviceIds.forEach((id, i) => { params[`id${i}`] = id; });
    const filter = pb.filter(`tenant_id = {:tenantId} && (${placeholders})`, params);
    const serviceRecords = await pb.collection('services').getList(1, 20, { filter }).catch(() => null);
    if (serviceRecords) {
      for (const rec of serviceRecords.items) {
        baseAmount += Number(rec['base_price']) || 0;
        serviceNames.push(String(rec['name']));
      }
    }
  }
  const totalAmount = baseAmount * (1 + ivaRate);

  // LOPDGDD: consent logged above. Now find or create the customer record.
  const customerId = await findOrCreateCustomer(pb, {
    tenantId: payload.tenantId,
    name: payload.customerName,
    email: payload.customerEmail,
    phone: payload.customerPhone,
  });

  await pb.collection('appointments').create({
    tenant_id: payload.tenantId,
    customer_name: payload.customerName,
    customer_phone: payload.customerPhone,
    customer_email: payload.customerEmail,
    service_ids: payload.serviceIds,
    scheduled_at: payload.fechaPreferida,
    notes: `Matrícula: ${payload.matricula} · Combustible: ${payload.fuelType}`,
    status: 'pending',
    base_amount: baseAmount,
    iva_rate: ivaRate,
    total_amount: totalAmount,
    customer_id: customerId,
  });

  // Update customer aggregates — failure is non-fatal; appointment is already written.
  try {
    const customer = await pb.collection('customers').getOne(customerId);
    await pb.collection('customers').update(customerId, {
      last_seen: new Date().toISOString(),
      total_visits: (Number(customer['total_visits']) || 0) + 1,
      total_spent: (Number(customer['total_spent']) || 0) + totalAmount,
    });
  } catch (err) {
    console.error('Customer aggregate update failed:', err instanceof Error ? err.message : 'unknown error');
  }

  if (payload.customerEmail) {
    await sendBookingConfirmation({
      to: payload.customerEmail,
      name: payload.customerName,
      serviceNames: serviceNames.length > 0 ? serviceNames : payload.serviceIds,
      date: payload.fechaPreferida,
      matricula: payload.matricula,
      businessName,
    });
  }
}

async function findOrCreateCustomer(
  pb: Awaited<ReturnType<typeof getPb>>,
  opts: { tenantId: string; name: string; email: string; phone: string },
): Promise<string> {
  const safeEmail = opts.email.toLowerCase().trim();
  try {
    const existing = await pb.collection('customers').getFirstListItem(
      pb.filter('tenant_id = {:tenantId} && email = {:email}', {
        tenantId: opts.tenantId,
        email: safeEmail,
      }),
    );
    return existing.id;
  } catch {
    try {
      const created = await pb.collection('customers').create({
        tenant_id: opts.tenantId,
        name: opts.name,
        email: safeEmail,
        phone: opts.phone,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        total_visits: 0,
        total_spent: 0,
        preferred_contact: 'email',
        marketing_consent: false,
        notes: '',
      });
      return created.id;
    } catch (err) {
      console.error('customer_create_failed', err instanceof Error ? err.message : 'unknown');
      throw new Error('customer_create_failed');
    }
  }
}

async function sendBookingConfirmation(opts: {
  to: string;
  name: string;
  serviceNames: string[];
  date: string;
  matricula: string;
  businessName: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const resend = new Resend(apiKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
  const baseUrl = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'http://localhost:3000';

  const html = await render(
    AppointmentConfirmation({
      customerName: opts.name,
      serviceName: opts.serviceNames.join(', '),
      scheduledAt: opts.date,
      plate: opts.matricula,
      businessName: opts.businessName,
      businessPhone: clientConfig.contact.phone,
      businessAddress: `${clientConfig.address.street}, ${clientConfig.address.city}`,
      warrantyNote: 'Garantía de reparación: 3 meses o 2.000 km (RD 1457/1986)',
      cancelLink: `${baseUrl}/cancelar`,
      baseUrl,
      primaryColor: clientConfig.branding.primaryColor,
    }),
  );

  await resend.emails.send({
    from: fromEmail,
    to: opts.to,
    subject: `Confirmación de cita — ${opts.businessName}`,
    html,
  });
}

type QuotePayload = {
  tenantId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  vehicleDescription: string;
  problemDescription: string;
  serviceType: string;
  policyVersion: string;
  policyHash: string;
  userAgent: string;
};

/**
 * Add N business days (Mon–Fri) to a date.
 * RD 1457/1986 requires quote validity of at least 12 business days.
 */
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

export async function saveQuoteRequest(payload: QuotePayload) {
  const pb = await getPb();
  const ip = await getClientIp();

  // LOPDGDD: consent MUST be logged first — throw if this fails
  await pb.collection('consent_log').create({
    tenant_id: payload.tenantId,
    subject_email: payload.customerEmail,
    policy_version: payload.policyVersion,
    policy_hash: payload.policyHash,
    consented: true,
    consented_at: new Date().toISOString(),
    ip_address: ip,
    user_agent: payload.userAgent,
    form_context: 'chatbot_quote',
  });

  const ivaConfig = await pb.collection('config').getFirstListItem(
    pb.filter('tenant_id = {:tenantId} && key = "iva_rate"', { tenantId: payload.tenantId }),
  );
  const ivaRate = parseFloat(ivaConfig['value']);

  const businessNameConfig = await pb.collection('config').getFirstListItem(
    pb.filter('tenant_id = {:tenantId} && key = "business_name"', { tenantId: payload.tenantId }),
  ).catch(() => null);
  const businessName = businessNameConfig ? String(businessNameConfig['value']) : clientConfig.businessName;

  // RD 1457/1986: valid_until = today + 12 business days
  const validUntil = addBusinessDays(new Date(), 12);
  const validUntilStr = validUntil.toISOString().split('T')[0] + ' 00:00:00.000Z';

  await pb.collection('quotes').create({
    tenant_id: payload.tenantId,
    customer_name: payload.customerName,
    customer_email: payload.customerEmail,
    customer_phone: payload.customerPhone,
    vehicle_description: payload.vehicleDescription,
    problem_description: payload.problemDescription,
    service_type: payload.serviceType,
    items: [],
    subtotal: 0,
    iva_rate: ivaRate,
    total: 0,
    status: 'pending',
    valid_until: validUntilStr,
    source: 'chatbot',
    notes: '',
  });

  if (payload.customerEmail) {
    await sendQuoteConfirmation({
      to: payload.customerEmail,
      name: payload.customerName,
      serviceType: payload.serviceType,
      validUntil: validUntil.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
      businessName,
    });
  }
}

async function sendQuoteConfirmation(opts: {
  to: string;
  name: string;
  serviceType: string;
  validUntil: string;
  businessName: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const resend = new Resend(apiKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
  const baseUrl = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'http://localhost:3000';

  const html = await render(
    QuoteRequest({
      customerName: opts.name,
      serviceType: opts.serviceType,
      vehicleDescription: '',
      businessName: opts.businessName,
      businessPhone: clientConfig.contact.phone,
      validUntilStr: opts.validUntil,
      baseUrl,
      primaryColor: clientConfig.branding.primaryColor,
    }),
  );

  await resend.emails.send({
    from: fromEmail,
    to: opts.to,
    subject: `Solicitud de presupuesto recibida — ${opts.businessName}`,
    html,
  });
}

export async function resolveFlowTokens(
  text: string,
  tenantId: string,
): Promise<string> {
  const pb = await getPb();
  const keys = [...text.matchAll(/\{\{config\.(\w+)\}\}/g)].map((m) => m[1]);
  if (keys.length === 0) return text;

  const placeholders = keys.map((_, i) => `key = {:k${i}}`).join(' || ');
  const params: Record<string, string> = { tenantId };
  keys.forEach((k, i) => { params[`k${i}`] = k!; });
  const filter = pb.filter(`tenant_id = {:tenantId} && (${placeholders})`, params);
  const records = await pb.collection('config').getList(1, 50, { filter });
  const map = Object.fromEntries(records.items.map((r) => [r['key'], r['value']]));

  return text.replace(/\{\{config\.(\w+)\}\}/g, (_, key) => map[key] ?? `{{config.${key}}}`);
}
