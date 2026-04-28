'use server';

import twilio from 'twilio';
import { z } from 'zod';
import { getStaffCtx } from '@/lib/auth';
import type { SmsLog, Customer } from '@/types/pb';
import { maskPhone } from '@/lib/sms/helpers';

// ---------------------------------------------------------------------------
// Twilio client (lazy-initialised — null if credentials not configured)
// ---------------------------------------------------------------------------

let twilioClient: ReturnType<typeof twilio> | null = null;

function getTwilioClient(): ReturnType<typeof twilio> | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  if (!twilioClient) twilioClient = twilio(sid, token);
  return twilioClient;
}

// ---------------------------------------------------------------------------
// sendSms
// ---------------------------------------------------------------------------

const SendSmsSchema = z.object({
  toPhone: z.string().min(9, 'Teléfono inválido'),
  message: z.string().min(1).max(480, 'Mensaje demasiado largo (máx 3 SMS)'),
  appointmentId: z.string().optional(),
  customerId: z.string().optional(),
});

export type SendSmsInput = z.infer<typeof SendSmsSchema>;

export type SendSmsResult =
  | { ok: true; logId: string; maskedPhone: string }
  | { ok: false; error: string };

export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  const ctx = await getStaffCtx();

  const parsed = SendSmsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  const { toPhone, message, appointmentId, customerId } = parsed.data;
  const masked = maskPhone(toPhone);

  // Log to console — no PII (masked only)
  console.log(`[SMS] tenant=${ctx.tenantId} to=${masked} chars=${message.length}`);

  const client = getTwilioClient();
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  let providerId = '';
  let status: 'sent' | 'failed' = 'sent';

  if (client && fromNumber) {
    try {
      const msg = await client.messages.create({
        body: message,
        from: fromNumber,
        to: toPhone,
      });
      providerId = msg.sid;
      status = 'sent';
    } catch (err) {
      console.error('[SMS] Twilio error', err instanceof Error ? err.message : 'unknown');
      return { ok: false, error: 'Error al enviar el SMS. Comprueba las credenciales de Twilio.' };
    }
  } else {
    console.warn('[SMS] TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER not set — SMS not delivered');
  }

  try {
    const logData: Record<string, string> = {
      tenant_id: ctx.tenantId,
      to_phone: toPhone,
      message,
      status,
      provider_id: providerId,
    };
    if (appointmentId) logData['appointment_id'] = appointmentId;
    if (customerId) logData['customer_id'] = customerId;

    const log = await ctx.pb.collection('sms_log').create(logData);

    return { ok: true, logId: log.id, maskedPhone: masked };
  } catch (err) {
    console.error('[SMS] Failed to write sms_log', err instanceof Error ? err.message : 'unknown');
    return { ok: false, error: 'Error al registrar el SMS. Inténtalo de nuevo.' };
  }
}

// ---------------------------------------------------------------------------
// getSmsSuggestions — customers with ITV expiry < 30 days
// ---------------------------------------------------------------------------

export type SmsSuggestion = {
  customerId: string;
  customerName: string;
  phone: string;
  maskedPhone: string;
  plate: string;
  itvExpiry: string;
  daysLeft: number;
  marketingConsent: boolean;
};

export type GetSmsSuggestionsResult =
  | { ok: true; suggestions: SmsSuggestion[] }
  | { ok: false; error: string };

export async function getSmsSuggestions(): Promise<GetSmsSuggestionsResult> {
  const ctx = await getStaffCtx();

  const today = new Date();
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(today.getDate() + 30);
  const cutoff = thirtyDaysFromNow.toISOString().split('T')[0];

  try {
    // Fetch vehicles with ITV expiry within 30 days for this tenant
    const vehicles = await ctx.pb.collection('vehicles').getList(1, 200, {
      filter: ctx.pb.filter(
        'tenant_id = {:tenantId} && itv_expiry != "" && itv_expiry <= {:cutoff}',
        { tenantId: ctx.tenantId, cutoff },
      ),
      expand: 'customer_id',
    });

    const suggestions: SmsSuggestion[] = [];

    for (const vehicle of vehicles.items) {
      const customer = vehicle.expand?.['customer_id'] as Customer | undefined;
      if (!customer?.phone) continue;

      const itvDate = new Date(vehicle['itv_expiry'] as string);
      const msLeft = itvDate.getTime() - today.getTime();
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

      suggestions.push({
        customerId: customer.id,
        customerName: customer.name,
        phone: customer.phone,
        maskedPhone: maskPhone(customer.phone),
        plate: vehicle['plate'] as string,
        itvExpiry: vehicle['itv_expiry'] as string,
        daysLeft,
        marketingConsent: customer.marketing_consent ?? false,
      });
    }

    // Sort by most urgent first
    suggestions.sort((a, b) => a.daysLeft - b.daysLeft);

    return { ok: true, suggestions };
  } catch (err) {
    console.error('[SMS] getSmsSuggestions error', err instanceof Error ? err.message : 'unknown');
    return { ok: false, error: 'Error al obtener sugerencias de SMS.' };
  }
}

// ---------------------------------------------------------------------------
// sendBulkSms — max 50 per call (abuse prevention)
// ---------------------------------------------------------------------------

const SendBulkSmsSchema = z.object({
  customerIds: z.array(z.string()).min(1).max(50, 'Máximo 50 SMS por envío masivo'),
  message: z.string().min(1).max(480),
});

export type SendBulkSmsResult =
  | { ok: true; sent: number; failed: number }
  | { ok: false; error: string };

export async function sendBulkSms(input: z.infer<typeof SendBulkSmsSchema>): Promise<SendBulkSmsResult> {
  const ctx = await getStaffCtx();

  const parsed = SendBulkSmsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  const { customerIds, message } = parsed.data;
  let sent = 0;
  let failed = 0;

  for (const customerId of customerIds) {
    try {
      // Fetch customer — always scoped to tenant
      const customer = await ctx.pb.collection('customers').getOne(customerId, {
        filter: ctx.pb.filter('tenant_id = {:tenantId}', { tenantId: ctx.tenantId }),
      }) as Customer;

      if (!customer.phone) { failed++; continue; }
      // LOPDGDD: only send marketing SMS to customers with marketing_consent
      if (!customer.marketing_consent) { failed++; continue; }

      const masked = maskPhone(customer.phone);
      console.log(`[SMS Bulk] tenant=${ctx.tenantId} to=${masked} chars=${message.length}`);

      const bulkClient = getTwilioClient();
      const bulkFrom = process.env.TWILIO_FROM_NUMBER;
      let bulkProviderId = '';

      if (bulkClient && bulkFrom) {
        const msg = await bulkClient.messages.create({
          body: message,
          from: bulkFrom,
          to: customer.phone,
        });
        bulkProviderId = msg.sid;
      }

      await ctx.pb.collection('sms_log').create({
        tenant_id: ctx.tenantId,
        to_phone: customer.phone,
        message,
        status: 'sent',
        provider_id: bulkProviderId,
        customer_id: customerId,
      });

      sent++;
    } catch (err) {
      console.error('[SMS Bulk] single send failed', err instanceof Error ? err.message : 'unknown');
      failed++;
    }
  }

  return { ok: true, sent, failed };
}

// ---------------------------------------------------------------------------
// getSmsLog — last 100 entries for this tenant
// ---------------------------------------------------------------------------

export type SmsLogEntry = {
  id: string;
  maskedPhone: string;
  messagePreview: string;
  status: SmsLog['status'];
  created: string;
  appointmentId: string;
};

export type GetSmsLogResult =
  | { ok: true; entries: SmsLogEntry[] }
  | { ok: false; error: string };

export async function getSmsLog(): Promise<GetSmsLogResult> {
  const ctx = await getStaffCtx();

  try {
    const logs = await ctx.pb.collection('sms_log').getList<SmsLog>(1, 100, {
      filter: ctx.pb.filter('tenant_id = {:tenantId}', { tenantId: ctx.tenantId }),
      sort: '-created',
    });

    const entries: SmsLogEntry[] = logs.items.map((log) => ({
      id: log.id,
      maskedPhone: maskPhone(log.to_phone),
      messagePreview: log.message.length > 60 ? `${log.message.slice(0, 60)}…` : log.message,
      status: log.status,
      created: log.created,
      appointmentId: log.appointment_id ?? '',
    }));

    return { ok: true, entries };
  } catch (err) {
    console.error('[SMS] getSmsLog error', err instanceof Error ? err.message : 'unknown');
    return { ok: false, error: 'Error al cargar el historial de SMS.' };
  }
}

// ---------------------------------------------------------------------------
// searchCustomers — for the composer's customer search
// ---------------------------------------------------------------------------

export type CustomerSearchResult = {
  id: string;
  name: string;
  maskedPhone: string;
  phone: string;
  marketingConsent: boolean;
};

export type SearchCustomersResult =
  | { ok: true; customers: CustomerSearchResult[] }
  | { ok: false; error: string };

export async function searchCustomers(query: string): Promise<SearchCustomersResult> {
  const ctx = await getStaffCtx();

  if (!query || query.trim().length < 2) {
    return { ok: true, customers: [] };
  }

  const safe = query.trim();

  try {
    const results = await ctx.pb.collection('customers').getList<Customer>(1, 20, {
      filter: ctx.pb.filter(
        'tenant_id = {:tenantId} && (name ~ {:q} || phone ~ {:q})',
        { tenantId: ctx.tenantId, q: safe },
      ),
      sort: 'name',
    });

    const customers: CustomerSearchResult[] = results.items.map((c) => ({
      id: c.id,
      name: c.name,
      maskedPhone: maskPhone(c.phone),
      phone: c.phone,
      marketingConsent: c.marketing_consent ?? false,
    }));

    return { ok: true, customers };
  } catch (err) {
    console.error('[SMS] searchCustomers error', err instanceof Error ? err.message : 'unknown');
    return { ok: false, error: 'Error al buscar clientes.' };
  }
}
