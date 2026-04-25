'use server';

import { getPb } from '@/lib/pb';

export type AvailableSlot = {
  id: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  spotsLeft: number;
};

export async function getAvailableSlots(
  tenantId: string,
  fromDate: string,
  daysAhead = 14,
): Promise<AvailableSlot[]> {
  const pb = await getPb();

  const from = new Date(fromDate);
  const to = new Date(from);
  to.setDate(to.getDate() + daysAhead);

  const fromStr = from.toISOString().split('T')[0];
  const toStr = to.toISOString().split('T')[0];

  const res = await pb.collection('availability_slots').getList(1, 50, {
    filter: pb.filter(
      'tenant_id = {:tenantId} && slot_date >= {:fromStr} && slot_date <= {:toStr}',
      { tenantId, fromStr, toStr },
    ),
    sort: 'slot_date,start_time',
  });

  return res.items
    .filter((r) => (r['capacity'] as number) - (r['booked'] as number) > 0)
    .slice(0, 6)
    .map((r) => ({
      id: r['id'] as string,
      slotDate: r['slot_date'] as string,
      startTime: r['start_time'] as string,
      endTime: r['end_time'] as string,
      spotsLeft: (r['capacity'] as number) - (r['booked'] as number),
    }));
}

export async function getNextAvailableSlot(tenantId: string): Promise<AvailableSlot | null> {
  try {
    const pb = await getPb();

    const today = new Date().toISOString().split('T')[0];
    const to = new Date();
    to.setDate(to.getDate() + 14);
    const toStr = to.toISOString().split('T')[0];

    const res = await pb.collection('availability_slots').getList(1, 50, {
      filter: pb.filter(
        'tenant_id = {:tenantId} && slot_date >= {:today} && slot_date <= {:toStr}',
        { tenantId, today, toStr },
      ),
      sort: 'slot_date,start_time',
    });

    const first = res.items.find((r) => (r['capacity'] as number) - (r['booked'] as number) > 0);
    if (!first) return null;

    return {
      id: first['id'] as string,
      slotDate: first['slot_date'] as string,
      startTime: first['start_time'] as string,
      endTime: first['end_time'] as string,
      spotsLeft: (first['capacity'] as number) - (first['booked'] as number),
    };
  } catch {
    return null;
  }
}

export async function bookSlot(slotId: string, tenantId: string): Promise<void> {
  const pb = await getPb();
  const slot = await pb.collection('availability_slots').getOne(slotId);
  if ((slot['tenant_id'] as string) !== tenantId) throw new Error('Unauthorized');
  await pb.collection('availability_slots').update(slotId, {
    booked: (slot['booked'] as number) + 1,
  });
}
