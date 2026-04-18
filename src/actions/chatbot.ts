'use server';

import { getPb } from '@/lib/pb';
import { loadClientConfig } from '@/lib/config';
import { Resend } from 'resend';

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

  await pb.collection('consent_log').create({
    tenant_id: payload.tenantId,
    subject_email: payload.customerEmail,
    policy_version: payload.policyVersion,
    policy_hash: payload.policyHash,
    consented: true,
    consented_at: new Date().toISOString(),
    ip_address: '',
    user_agent: payload.userAgent,
    form_context: 'chatbot_booking',
  });

  const ivaConfig = await pb.collection('config').getFirstListItem(
    `tenant_id = "${payload.tenantId}" && key = "iva_rate"`,
  );
  const ivaRate = parseFloat(ivaConfig['value']);

  const businessNameConfig = await pb.collection('config').getFirstListItem(
    `tenant_id = "${payload.tenantId}" && key = "business_name"`,
  ).catch(() => null);
  const businessName = businessNameConfig ? String(businessNameConfig['value']) : clientConfig.businessName;

  // Fetch service prices to compute total_amount
  let baseAmount = 0;
  const serviceNames: string[] = [];
  if (payload.serviceIds.length > 0) {
    const filter = `tenant_id = "${payload.tenantId}" && (${payload.serviceIds.map((id) => `id = "${id}"`).join(' || ')})`;
    const serviceRecords = await pb.collection('services').getList(1, 20, { filter }).catch(() => null);
    if (serviceRecords) {
      for (const rec of serviceRecords.items) {
        baseAmount += Number(rec['base_price']) || 0;
        serviceNames.push(String(rec['name']));
      }
    }
  }
  const totalAmount = baseAmount * (1 + ivaRate);

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
  });

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

  const servicesHtml = opts.serviceNames
    .map((s) => `<li style="padding:4px 0">${s}</li>`)
    .join('');

  await resend.emails.send({
    from: fromEmail,
    to: opts.to,
    subject: `Confirmación de cita — ${opts.businessName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111">
        <h2 style="color:#dc2626">Cita recibida</h2>
        <p>Hola <strong>${opts.name}</strong>,</p>
        <p>Hemos recibido tu solicitud de cita en <strong>${opts.businessName}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#555;vertical-align:top">Servicios</td>
              <td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">
                <ul style="margin:0;padding-left:16px">${servicesHtml}</ul>
              </td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#555">Matrícula</td>
              <td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${opts.matricula}</td></tr>
          <tr><td style="padding:8px;color:#555">Fecha preferida</td>
              <td style="padding:8px;font-weight:600">${opts.date}</td></tr>
        </table>
        <p style="color:#555;font-size:14px">Te llamaremos al número facilitado para confirmar la hora exacta.</p>
        <p style="margin-top:16px;color:#555;font-size:13px;font-style:italic;border-top:1px solid #eee;padding-top:12px">
          Garantía de reparación: 3 meses o 2.000 km (RD 1457/1986 Art. 16).
          Todo trabajo está sujeto a presupuesto previo (RD 1457/1986 Art. 14).
        </p>
        <p style="margin-top:16px;color:#888;font-size:12px">— ${opts.businessName}</p>
      </div>
    `,
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

  // LOPDGDD: consent MUST be logged first — throw if this fails
  await pb.collection('consent_log').create({
    tenant_id: payload.tenantId,
    subject_email: payload.customerEmail,
    policy_version: payload.policyVersion,
    policy_hash: payload.policyHash,
    consented: true,
    consented_at: new Date().toISOString(),
    ip_address: '',
    user_agent: payload.userAgent,
    form_context: 'chatbot_quote',
  });

  const ivaConfig = await pb.collection('config').getFirstListItem(
    `tenant_id = "${payload.tenantId}" && key = "iva_rate"`,
  );
  const ivaRate = parseFloat(ivaConfig['value']);

  const businessNameConfig = await pb.collection('config').getFirstListItem(
    `tenant_id = "${payload.tenantId}" && key = "business_name"`,
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

  await resend.emails.send({
    from: fromEmail,
    to: opts.to,
    subject: `Solicitud de presupuesto recibida — ${opts.businessName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111">
        <h2 style="color:#dc2626">Solicitud de presupuesto recibida</h2>
        <p>Hola <strong>${opts.name}</strong>,</p>
        <p>Hemos recibido tu solicitud de presupuesto en <strong>${opts.businessName}</strong>. Te contactaremos en 24h con el presupuesto detallado.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#555">Tipo de servicio</td>
              <td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${opts.serviceType}</td></tr>
          <tr><td style="padding:8px;color:#555">Válido hasta</td>
              <td style="padding:8px;font-weight:600">${opts.validUntil}</td></tr>
        </table>
        <p style="color:#555;font-size:13px;font-style:italic">Este presupuesto es orientativo y sin compromiso (RD 1457/1986). Válido 12 días hábiles. Los precios no incluyen IVA hasta emisión de factura.</p>
        <p style="margin-top:24px;color:#888;font-size:12px">— ${opts.businessName}</p>
      </div>
    `,
  });
}

export async function resolveFlowTokens(
  text: string,
  tenantId: string,
): Promise<string> {
  const pb = await getPb();
  const keys = [...text.matchAll(/\{\{config\.(\w+)\}\}/g)].map((m) => m[1]);
  if (keys.length === 0) return text;

  const filter = `tenant_id = "${tenantId}" && (${keys.map((k) => `key = "${k}"`).join(' || ')})`;
  const records = await pb.collection('config').getList(1, 50, { filter });
  const map = Object.fromEntries(records.items.map((r) => [r['key'], r['value']]));

  return text.replace(/\{\{config\.(\w+)\}\}/g, (_, key) => map[key] ?? `{{config.${key}}}`);
}
