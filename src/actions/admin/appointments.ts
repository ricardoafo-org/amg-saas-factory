'use server';

import { getStaffCtx } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// ── Types ────────────────────────────────────────────────────────────────────

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export type CalendarAppointment = {
  id: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  vehicleId: string;
  plate: string;
  serviceNames: string[];
  scheduledAt: string; // ISO string
  durationMinutes: number;
  status: AppointmentStatus;
  notes: string;
  staffId: string | null;
};

export type TodayAppointment = {
  id: string;
  scheduledAt: string;
  customerName: string;
  customerPhone: string;
  plate: string;
  services: string;
  status: AppointmentStatus;
  techName: string | null;
  baseAmount: number;
  notes: string;
};

export type AvailabilitySlot = {
  id: string;
  slotDate: string;       // YYYY-MM-DD
  startTime: string;      // HH:MM
  endTime: string;        // HH:MM
  capacity: number;
  booked: number;
};

export type AppointmentsByRangeResult = {
  appointments: CalendarAppointment[];
  availabilitySlots: AvailabilitySlot[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

// ── Actions ──────────────────────────────────────────────────────────────────

/**
 * Fetch all appointments and availability slots for the given date range.
 * Both queries are scoped to the authenticated staff member's tenantId.
 */
export async function getAppointmentsByRange(
  from: Date,
  to: Date,
): Promise<AppointmentsByRangeResult> {
  const { pb, tenantId } = await getStaffCtx();

  const fromStr = toDateStr(from);
  // Add one day to `to` so the filter is inclusive of the last day
  const toNext = new Date(to);
  toNext.setDate(toNext.getDate() + 1);
  const toStr = toDateStr(toNext);

  // Fetch appointments in range — expand customer and vehicle relations if available
  let appointmentItems: Record<string, unknown>[] = [];
  try {
    const res = await pb.collection('appointments').getList(1, 200, {
      filter: `tenant_id = "${tenantId}" && scheduled_at >= "${fromStr}" && scheduled_at < "${toStr}"`,
      sort: 'scheduled_at',
    });
    appointmentItems = res.items as unknown as Record<string, unknown>[];
  } catch {
    // Collection may not exist yet in dev — return empty gracefully
    appointmentItems = [];
  }

  // Fetch availability slots in same range
  let slotItems: Record<string, unknown>[] = [];
  try {
    const res = await pb.collection('availability_slots').getList(1, 200, {
      filter: `tenant_id = "${tenantId}" && slot_date >= "${fromStr}" && slot_date < "${toStr}"`,
      sort: 'slot_date,start_time',
    });
    slotItems = res.items as unknown as Record<string, unknown>[];
  } catch {
    slotItems = [];
  }

  const appointments: CalendarAppointment[] = appointmentItems.map((r) => ({
    id: r['id'] as string,
    tenantId: r['tenant_id'] as string,
    customerId: (r['customer_id'] as string | undefined) ?? '',
    customerName: (r['customer_name'] as string | undefined) ?? 'Cliente',
    vehicleId: (r['vehicle_id'] as string | undefined) ?? '',
    plate: (r['plate'] as string | undefined) ?? '',
    serviceNames: Array.isArray(r['service_names'])
      ? (r['service_names'] as string[])
      : typeof r['service_type'] === 'string'
        ? [r['service_type'] as string]
        : [],
    scheduledAt: r['scheduled_at'] as string,
    durationMinutes: (r['duration_minutes'] as number | undefined) ?? 60,
    status: (r['status'] as AppointmentStatus | undefined) ?? 'pending',
    notes: (r['notes'] as string | undefined) ?? '',
    staffId: (r['staff_id'] as string | undefined) ?? null,
  }));

  const availabilitySlots: AvailabilitySlot[] = slotItems.map((r) => ({
    id: r['id'] as string,
    slotDate: r['slot_date'] as string,
    startTime: r['start_time'] as string,
    endTime: r['end_time'] as string,
    capacity: (r['capacity'] as number | undefined) ?? 1,
    booked: (r['booked'] as number | undefined) ?? 0,
  }));

  return { appointments, availabilitySlots };
}

/**
 * Fetch today's appointments sorted by scheduled_at, scoped to the staff's tenant.
 */
export async function getTodayAppointments(): Promise<TodayAppointment[]> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  return fetchTodayStyleAppointments(todayStart, todayEnd);
}

/**
 * Fetch appointments for next 48h (tomorrow + day after), scoped to the staff's tenant.
 */
export async function getNext48hAppointments(): Promise<TodayAppointment[]> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const in48hEnd = new Date(todayStart.getTime() + 3 * 24 * 60 * 60 * 1000);
  return fetchTodayStyleAppointments(tomorrowStart, in48hEnd);
}

async function fetchTodayStyleAppointments(
  fromDate: Date,
  toDate: Date,
): Promise<TodayAppointment[]> {
  const { pb, tenantId } = await getStaffCtx();
  const toIso = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 19);

  let items: Record<string, unknown>[] = [];
  try {
    const res = await pb.collection('appointments').getList(1, 200, {
      filter: `tenant_id = "${tenantId}" && scheduled_at >= "${toIso(fromDate)}" && scheduled_at < "${toIso(toDate)}"`,
      sort: 'scheduled_at',
      expand: 'tech_id',
    });
    items = res.items as unknown as Record<string, unknown>[];
  } catch {
    items = [];
  }

  return items.map((r) => {
    const expanded = r['expand'] as Record<string, Record<string, unknown>> | undefined;
    const tech = expanded?.['tech_id'];
    const techName = tech
      ? ((tech['display_name'] as string | undefined) ??
          (tech['email'] as string | undefined) ??
          null)
      : null;

    const serviceNames = Array.isArray(r['service_names'])
      ? (r['service_names'] as string[]).join(', ')
      : typeof r['service_type'] === 'string'
        ? (r['service_type'] as string)
        : '';

    return {
      id: r['id'] as string,
      scheduledAt: r['scheduled_at'] as string,
      customerName: (r['customer_name'] as string | undefined) ?? '',
      customerPhone: (r['customer_phone'] as string | undefined) ?? '',
      plate: (r['plate'] as string | undefined) ?? '',
      services: serviceNames,
      status: (r['status'] as AppointmentStatus | undefined) ?? 'pending',
      techName,
      baseAmount: (r['base_amount'] as number | undefined) ?? 0,
      notes: (r['notes'] as string | undefined) ?? '',
    };
  });
}

/**
 * Update the status of a single appointment.
 * Validates tenant ownership before updating.
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { pb, tenantId } = await getStaffCtx();

    // Verify ownership before mutating
    const existing = await pb.collection('appointments').getOne(appointmentId);
    if ((existing['tenant_id'] as string) !== tenantId) {
      return { ok: false, error: 'No autorizado' };
    }

    await pb.collection('appointments').update(appointmentId, { status });
    revalidatePath('/admin/calendar');
    revalidatePath('/admin/today');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Error al actualizar el estado de la cita' };
  }
}
