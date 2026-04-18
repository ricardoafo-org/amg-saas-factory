import 'server-only';
import { redirect } from 'next/navigation';
import { getPb } from './pb';
import type { TenantContext } from '@/types/pb';

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
