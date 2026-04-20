'use server';

import { revalidatePath } from 'next/cache';
import { getStaffCtx } from '@/lib/auth';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Upsert a single key/value pair in the `config` collection. */
async function setConfigKey(
  pb: Awaited<ReturnType<typeof getStaffCtx>>['pb'],
  tenantId: string,
  key: string,
  value: string,
): Promise<void> {
  let existing: { id: string } | null = null;
  try {
    existing = await pb
      .collection('config')
      .getFirstListItem(`tenant_id = "${tenantId}" && key = "${key}"`);
  } catch {
    existing = null;
  }

  if (existing) {
    await pb.collection('config').update(existing.id, { value });
  } else {
    await pb.collection('config').create({ tenant_id: tenantId, key, value });
  }
}

// ── Business Info ──────────────────────────────────────────────────────────

export type BusinessInfoResult = { ok: true } | { ok: false; error: string };

export async function updateBusinessInfo(
  formData: FormData,
): Promise<BusinessInfoResult> {
  let ctx;
  try {
    ctx = await getStaffCtx();
  } catch {
    return { ok: false, error: 'No autenticado' };
  }

  const { pb, tenantId } = ctx;

  const fields: Record<string, string> = {
    business_name: String(formData.get('business_name') ?? '').trim(),
    business_tagline: String(formData.get('business_tagline') ?? '').trim(),
    business_address: String(formData.get('business_address') ?? '').trim(),
    business_phone: String(formData.get('business_phone') ?? '').trim(),
    business_email: String(formData.get('business_email') ?? '').trim(),
    business_whatsapp: String(formData.get('business_whatsapp') ?? '').trim(),
  };

  try {
    for (const [key, value] of Object.entries(fields)) {
      await setConfigKey(pb, tenantId, key, value);
    }
    revalidatePath('/');
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Error al guardar la información del negocio' };
  }
}

// ── Opening Hours ──────────────────────────────────────────────────────────

export type OpeningHoursResult = { ok: true } | { ok: false; error: string };

export async function updateOpeningHours(
  formData: FormData,
): Promise<OpeningHoursResult> {
  let ctx;
  try {
    ctx = await getStaffCtx();
  } catch {
    return { ok: false, error: 'No autenticado' };
  }

  const { pb, tenantId } = ctx;

  const DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

  const hoursObj: Record<string, { open: boolean; from: string; to: string }> = {};
  for (const day of DAYS) {
    hoursObj[day] = {
      open: formData.get(`${day}_open`) === 'true',
      from: String(formData.get(`${day}_from`) ?? '08:00'),
      to: String(formData.get(`${day}_to`) ?? '20:00'),
    };
  }

  try {
    await setConfigKey(pb, tenantId, 'opening_hours', JSON.stringify(hoursObj));
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Error al guardar los horarios' };
  }
}

// ── Service Catalog ────────────────────────────────────────────────────────

export type ServiceResult = { ok: true; id: string } | { ok: false; error: string };

export async function upsertService(
  formData: FormData,
): Promise<ServiceResult> {
  let ctx;
  try {
    ctx = await getStaffCtx();
  } catch {
    return { ok: false, error: 'No autenticado' };
  }

  const { pb, tenantId } = ctx;

  const id = String(formData.get('id') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim();
  const basePriceRaw = String(formData.get('base_price') ?? '0');
  const durationRaw = String(formData.get('duration_minutes') ?? '60');
  const description = String(formData.get('description') ?? '').trim();

  if (!name) return { ok: false, error: 'El nombre del servicio es obligatorio' };

  const basePrice = parseFloat(basePriceRaw);
  const durationMinutes = parseInt(durationRaw, 10);

  if (isNaN(basePrice) || basePrice < 0) {
    return { ok: false, error: 'El precio debe ser un número positivo' };
  }
  if (isNaN(durationMinutes) || durationMinutes < 1) {
    return { ok: false, error: 'La duración debe ser al menos 1 minuto' };
  }

  const payload = {
    tenant_id: tenantId,
    name,
    category,
    base_price: basePrice,
    duration_minutes: durationMinutes,
    description,
    active: true,
  };

  try {
    if (id) {
      // Verify this service belongs to the tenant before updating
      const existing = await pb
        .collection('services')
        .getOne(id, { filter: `tenant_id = "${tenantId}"` })
        .catch(() => null);

      if (!existing) return { ok: false, error: 'Servicio no encontrado' };

      await pb.collection('services').update(id, payload);
      revalidatePath('/');
      revalidatePath('/admin/settings');
      return { ok: true, id };
    } else {
      const record = await pb.collection('services').create(payload);
      revalidatePath('/');
      revalidatePath('/admin/settings');
      return { ok: true, id: record.id };
    }
  } catch {
    return { ok: false, error: 'Error al guardar el servicio' };
  }
}

export type ToggleServiceResult = { ok: true } | { ok: false; error: string };

export async function toggleServiceActive(
  id: string,
  active: boolean,
): Promise<ToggleServiceResult> {
  let ctx;
  try {
    ctx = await getStaffCtx();
  } catch {
    return { ok: false, error: 'No autenticado' };
  }

  const { pb, tenantId } = ctx;

  try {
    const existing = await pb
      .collection('services')
      .getOne(id, { filter: `tenant_id = "${tenantId}"` })
      .catch(() => null);

    if (!existing) return { ok: false, error: 'Servicio no encontrado' };

    await pb.collection('services').update(id, { active });
    revalidatePath('/');
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Error al actualizar el servicio' };
  }
}

// ── Notification Preferences ───────────────────────────────────────────────

export type NotifPrefsResult = { ok: true } | { ok: false; error: string };

export async function updateNotificationPrefs(
  formData: FormData,
): Promise<NotifPrefsResult> {
  let ctx;
  try {
    ctx = await getStaffCtx();
  } catch {
    return { ok: false, error: 'No autenticado' };
  }

  const { pb, tenantId } = ctx;

  const prefs: Record<string, string> = {
    notif_email_confirmation: formData.get('notif_email_confirmation') === 'true' ? 'true' : 'false',
    notif_sms_reminder_24h: formData.get('notif_sms_reminder_24h') === 'true' ? 'true' : 'false',
    notif_sms_reminder_2h: formData.get('notif_sms_reminder_2h') === 'true' ? 'true' : 'false',
    notif_sms_vehicle_ready: formData.get('notif_sms_vehicle_ready') === 'true' ? 'true' : 'false',
  };

  try {
    for (const [key, value] of Object.entries(prefs)) {
      await setConfigKey(pb, tenantId, key, value);
    }
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Error al guardar las preferencias de notificaciones' };
  }
}
