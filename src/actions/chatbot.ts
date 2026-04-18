'use server';

import { getPb } from '@/lib/pb';
import { Resend } from 'resend';

type AppointmentPayload = {
  tenantId: string;
  matricula: string;
  fuelType: string;
  fechaPreferida: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceId: string;
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
  const businessName = businessNameConfig ? String(businessNameConfig['value']) : 'Talleres AMG';

  await pb.collection('appointments').create({
    tenant_id: payload.tenantId,
    customer_name: payload.customerName,
    customer_phone: payload.customerPhone,
    customer_email: payload.customerEmail,
    service_type: payload.serviceId,
    scheduled_at: payload.fechaPreferida,
    notes: `Matrícula: ${payload.matricula} · Combustible: ${payload.fuelType}`,
    status: 'pending',
    base_amount: 0,
    iva_rate: ivaRate,
  });

  if (payload.customerEmail) {
    await sendBookingConfirmation({
      to: payload.customerEmail,
      name: payload.customerName,
      service: payload.serviceId,
      date: payload.fechaPreferida,
      matricula: payload.matricula,
      businessName,
    });
  }
}

async function sendBookingConfirmation(opts: {
  to: string;
  name: string;
  service: string;
  date: string;
  matricula: string;
  businessName: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const resend = new Resend(apiKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

  const serviceLabel: Record<string, string> = {
    'cambio-aceite': 'Cambio de Aceite',
    'pre-itv': 'Revisión Pre-ITV',
    'mecanica-general': 'Mecánica General',
    'otro': 'Consulta General',
  };

  await resend.emails.send({
    from: fromEmail,
    to: opts.to,
    subject: `Confirmación de cita — ${opts.businessName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111">
        <h2 style="color:#dc2626">✅ Cita recibida</h2>
        <p>Hola <strong>${opts.name}</strong>,</p>
        <p>Hemos recibido tu solicitud de cita en <strong>${opts.businessName}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#555">Servicio</td>
              <td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${serviceLabel[opts.service] ?? opts.service}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#555">Matrícula</td>
              <td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${opts.matricula}</td></tr>
          <tr><td style="padding:8px;color:#555">Fecha preferida</td>
              <td style="padding:8px;font-weight:600">${opts.date}</td></tr>
        </table>
        <p style="color:#555;font-size:14px">Te llamaremos al número facilitado para confirmar la hora exacta.</p>
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
