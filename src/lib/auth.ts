import 'server-only';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import PocketBase from 'pocketbase';
import { getPb } from './pb';
import type { TenantContext, StaffContext, StaffRole } from '@/types/pb';

const PB_URL = process.env.POCKETBASE_URL ?? 'http://127.0.0.1:8090';

export async function getTenantCtx(): Promise<TenantContext> {
  const pb = await getPb();

  if (!pb.authStore.isValid) {
    redirect('/login');
  }

  const tenantId = pb.authStore.record?.tenant_id as string | undefined;
  if (!tenantId) {
    throw new Error('Authenticated user has no tenant_id — check collection schema');
  }

  return { pb, tenantId, userId: pb.authStore.record!.id };
}

/**
 * Reads the pb_auth httpOnly cookie, validates with PocketBase staff collection,
 * and returns { pb, tenantId, staffId, role }. Throws 401 if unauthenticated.
 */
export async function getStaffCtx(): Promise<StaffContext> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('pb_auth');

  if (!authCookie?.value) {
    redirect('/admin/login');
  }

  const pb = new PocketBase(PB_URL);
  pb.authStore.loadFromCookie(`pb_auth=${authCookie.value}`);

  if (!pb.authStore.isValid) {
    redirect('/admin/login');
  }

  // Refresh token if close to expiry — PocketBase handles this automatically
  try {
    await pb.collection('staff').authRefresh();
  } catch {
    redirect('/admin/login');
  }

  const record = pb.authStore.record;
  if (!record) {
    redirect('/admin/login');
  }

  const tenantId = record['tenant_id'] as string | undefined;
  if (!tenantId) {
    throw new Error('Staff record has no tenant_id — check collection schema');
  }

  const role = (record['role'] as StaffRole | undefined) ?? 'technician';

  return {
    pb,
    tenantId,
    staffId: record.id,
    role,
  };
}
