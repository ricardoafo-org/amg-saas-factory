/**
 * tenant-isolation-live.integration.test.ts — FEAT-052
 *
 * Live PocketBase smoke for rubric S1/S2: a request authenticated as a staff
 * user belonging to tenant A must NOT see records belonging to tenant B.
 *
 * Strategy:
 *   1. Authenticate as superuser, seed two ephemeral tenants + one staff each
 *      + one trivial appointment per tenant.
 *   2. Authenticate as staff-A. List appointments. Assert the response
 *      contains tenant-A's appointment and NOT tenant-B's.
 *   3. Tear down (delete the two tenants — cascade).
 *
 * Skips when PB unreachable. Only runs in CI integration job (preview-deploy
 * stack) or locally when env is set.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const EMAIL = process.env.PB_BOOTSTRAP_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const PASSWORD =
  process.env.PB_BOOTSTRAP_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;

interface AuthRes {
  token: string;
  record: { id: string };
}

let superToken: string | null = null;
let pbReachable = false;
let tenantAId: string | null = null;
let tenantBId: string | null = null;
let staffAToken: string | null = null;
let appointmentAId: string | null = null;
let appointmentBId: string | null = null;

const PASS = 'TestPass1234!';

async function pbReq<T = unknown>(
  method: 'GET' | 'POST' | 'DELETE',
  urlPath: string,
  body?: unknown,
  token?: string,
): Promise<{ status: number; body: T }> {
  const res = await fetch(`${PB_URL}${urlPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(5000),
  });
  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    parsed = undefined;
  }
  return { status: res.status, body: parsed as T };
}

beforeAll(async () => {
  if (!EMAIL || !PASSWORD) {
    console.warn('[tenant-isolation-live] missing PB creds — suite skipped');
    return;
  }

  try {
    const auth = await pbReq<AuthRes>(
      'POST',
      '/api/collections/_superusers/auth-with-password',
      { identity: EMAIL, password: PASSWORD },
    );
    if (auth.status !== 200 || !auth.body.token) {
      console.warn(`[tenant-isolation-live] auth failed (${auth.status}) — suite skipped`);
      return;
    }
    superToken = auth.body.token;
    pbReachable = true;
  } catch {
    console.warn(`[tenant-isolation-live] PB unreachable at ${PB_URL} — suite skipped`);
    return;
  }

  // Seed two tenants
  const slug = `test-iso-${Date.now()}`;
  const aRes = await pbReq<{ id: string }>(
    'POST',
    '/api/collections/tenants/records',
    { slug: `${slug}-a`, business_name: 'Tenant A', timezone: 'Europe/Madrid' },
    superToken,
  );
  const bRes = await pbReq<{ id: string }>(
    'POST',
    '/api/collections/tenants/records',
    { slug: `${slug}-b`, business_name: 'Tenant B', timezone: 'Europe/Madrid' },
    superToken,
  );
  if (aRes.status !== 200 || bRes.status !== 200) {
    console.warn(
      `[tenant-isolation-live] tenant seed failed (a=${aRes.status} b=${bRes.status}) — suite will skip`,
    );
    pbReachable = false;
    return;
  }
  tenantAId = aRes.body.id;
  tenantBId = bRes.body.id;

  // Seed one staff per tenant
  const emailA = `staff-a-${Date.now()}@example.test`;
  const emailB = `staff-b-${Date.now()}@example.test`;
  const staffARes = await pbReq<{ id: string }>(
    'POST',
    '/api/collections/staff/records',
    {
      tenant_id: tenantAId,
      email: emailA,
      password: PASS,
      passwordConfirm: PASS,
      name: 'Staff A',
      role: 'admin',
      active: true,
    },
    superToken,
  );
  const staffBRes = await pbReq<{ id: string }>(
    'POST',
    '/api/collections/staff/records',
    {
      tenant_id: tenantBId,
      email: emailB,
      password: PASS,
      passwordConfirm: PASS,
      name: 'Staff B',
      role: 'admin',
      active: true,
    },
    superToken,
  );
  if (staffARes.status !== 200 || staffBRes.status !== 200) {
    console.warn(
      `[tenant-isolation-live] staff seed failed (a=${staffARes.status} b=${staffBRes.status}) — suite will skip`,
    );
    pbReachable = false;
    return;
  }

  // One appointment per tenant
  const aptA = await pbReq<{ id: string }>(
    'POST',
    '/api/collections/appointments/records',
    {
      tenant_id: tenantAId,
      slot_id: 'placeholder-a',
      service_ids: ['svc-a'],
      customer_name: 'Customer A',
      customer_email: 'a@example.test',
      customer_phone: '+34600000001',
      status: 'pending',
    },
    superToken,
  );
  const aptB = await pbReq<{ id: string }>(
    'POST',
    '/api/collections/appointments/records',
    {
      tenant_id: tenantBId,
      slot_id: 'placeholder-b',
      service_ids: ['svc-b'],
      customer_name: 'Customer B',
      customer_email: 'b@example.test',
      customer_phone: '+34600000002',
      status: 'pending',
    },
    superToken,
  );
  if (aptA.status !== 200 || aptB.status !== 200) {
    console.warn(
      `[tenant-isolation-live] appointment seed failed (a=${aptA.status} b=${aptB.status}) — suite will skip`,
    );
    pbReachable = false;
    return;
  }
  appointmentAId = aptA.body.id;
  appointmentBId = aptB.body.id;

  // Authenticate as staff A (the cross-tenant probe)
  const staffAuth = await pbReq<AuthRes>(
    'POST',
    '/api/collections/staff/auth-with-password',
    { identity: emailA, password: PASS },
  );
  if (staffAuth.status !== 200) {
    console.warn(
      `[tenant-isolation-live] staff-A auth failed (${staffAuth.status}) — suite will skip`,
    );
    pbReachable = false;
    return;
  }
  staffAToken = staffAuth.body.token;
});

afterAll(async () => {
  if (!superToken) return;
  // Tear down — delete in reverse
  if (appointmentAId)
    await pbReq('DELETE', `/api/collections/appointments/records/${appointmentAId}`, undefined, superToken);
  if (appointmentBId)
    await pbReq('DELETE', `/api/collections/appointments/records/${appointmentBId}`, undefined, superToken);
  if (tenantAId)
    await pbReq('DELETE', `/api/collections/tenants/records/${tenantAId}`, undefined, superToken);
  if (tenantBId)
    await pbReq('DELETE', `/api/collections/tenants/records/${tenantBId}`, undefined, superToken);
});

describe('tenant isolation — live cross-tenant probe (S1/S2)', () => {
  it.skipIf(!pbReachable)(
    'staff-A list of appointments contains tenant-A row',
    async () => {
      const res = await pbReq<{ items: Array<{ id: string; tenant_id: string }> }>(
        'GET',
        '/api/collections/appointments/records?perPage=200',
        undefined,
        staffAToken!,
      );
      expect(res.status).toBe(200);
      const ids = res.body.items.map((i) => i.id);
      expect(ids).toContain(appointmentAId);
    },
  );

  it.skipIf(!pbReachable)(
    'staff-A list of appointments does NOT contain tenant-B row (S2 cross-tenant IDOR)',
    async () => {
      const res = await pbReq<{ items: Array<{ id: string; tenant_id: string }> }>(
        'GET',
        '/api/collections/appointments/records?perPage=200',
        undefined,
        staffAToken!,
      );
      expect(res.status).toBe(200);
      const tenantIds = new Set(res.body.items.map((i) => i.tenant_id));
      expect(
        tenantIds.has(tenantBId!),
        `staff-A leaked tenant-B rows — listRule failed`,
      ).toBe(false);
    },
  );

  it.skipIf(!pbReachable)(
    'staff-A view of tenant-B appointment by id returns 403/404 (S1 PII leak)',
    async () => {
      const res = await pbReq(
        'GET',
        `/api/collections/appointments/records/${appointmentBId}`,
        undefined,
        staffAToken!,
      );
      expect([403, 404], 'expected forbidden / not found').toContain(res.status);
    },
  );
});
