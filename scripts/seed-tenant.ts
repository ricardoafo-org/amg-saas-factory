#!/usr/bin/env tsx
/**
 * seed-tenant.ts — deterministic tenant seed
 *
 * Idempotent. Captures the 2026-04-26 manual-API seed (84 slots over 14 days)
 * as code so CI / preview / cutover all use the same procedure.
 *
 * Reads tenant config from clients/<slug>/config.json.
 *
 * Usage:
 *   tsx scripts/seed-tenant.ts                      # default tenant talleres-amg
 *   tsx scripts/seed-tenant.ts --tenant=other-slug
 *   tsx scripts/seed-tenant.ts --skip-slots         # only tenants/services/staff
 *   tsx scripts/seed-tenant.ts --slots-days=14
 *
 * Env:
 *   POCKETBASE_URL           default http://127.0.0.1:8090
 *   PB_BOOTSTRAP_EMAIL       superuser email (preferred)
 *   PB_BOOTSTRAP_PASSWORD    superuser password
 *   POCKETBASE_ADMIN_EMAIL   fallback
 *   POCKETBASE_ADMIN_PASSWORD fallback
 *   STAFF_OWNER_EMAIL        owner staff account email (default owner@<tenant>.es)
 *   STAFF_OWNER_PASSWORD     owner staff password (default ChangeMe1234!)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  generateSlots,
  type OperatingDay,
  type SlotRecord,
} from './generate-slots.js';

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const EMAIL = process.env.PB_BOOTSTRAP_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const PASSWORD =
  process.env.PB_BOOTSTRAP_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;

const args = new Map<string, string>();
for (const a of process.argv.slice(2)) {
  const [k, v] = a.replace(/^--/, '').split('=');
  args.set(k, v ?? 'true');
}

const TENANT_SLUG = args.get('tenant') || 'talleres-amg';
const SKIP_SLOTS = args.get('skip-slots') === 'true';
const SLOTS_DAYS = Number(args.get('slots-days') ?? '14');

if (!EMAIL || !PASSWORD) {
  console.error('Missing PB superuser credentials.');
  process.exit(2);
}

interface TenantConfig {
  tenantId: string;
  businessName: string;
  industry: string;
  services: Array<{
    id: string;
    name: string;
    description?: string;
    basePrice: number;
    duration: number;
    category?: string;
  }>;
  operatingHours?: OperatingDay[];
  ivaRate?: number;
}

interface PbAuthResponse {
  token: string;
}

interface PbListResponse<T> {
  items: T[];
  totalItems: number;
}

interface PbRecord {
  id: string;
  [k: string]: unknown;
}

async function pb<T = unknown>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  body?: unknown,
  token?: string,
): Promise<{ status: number; body: T }> {
  const res = await fetch(`${PB_URL}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    parsed = undefined;
  }
  return { status: res.status, body: parsed as T };
}

async function findOne(
  collection: string,
  filter: string,
  token: string,
): Promise<PbRecord | null> {
  const res = await pb<PbListResponse<PbRecord>>(
    'GET',
    `/api/collections/${collection}/records?filter=${encodeURIComponent(filter)}&perPage=1`,
    undefined,
    token,
  );
  if (res.status !== 200) return null;
  return res.body.items[0] ?? null;
}

async function upsert(
  collection: string,
  filter: string,
  data: Record<string, unknown>,
  token: string,
): Promise<{ id: string; created: boolean }> {
  const existing = await findOne(collection, filter, token);
  if (existing) {
    return { id: existing.id, created: false };
  }
  const res = await pb<PbRecord>(
    'POST',
    `/api/collections/${collection}/records`,
    data,
    token,
  );
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(
      `upsert ${collection} failed (${res.status}): ${JSON.stringify(res.body)}`,
    );
  }
  return { id: res.body.id, created: true };
}

async function main() {
  const cfgPath = path.join(process.cwd(), 'clients', TENANT_SLUG, 'config.json');
  if (!fs.existsSync(cfgPath)) {
    console.error(`Tenant config not found: ${cfgPath}`);
    process.exit(2);
  }
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as TenantConfig;

  // Auth
  const auth = await pb<PbAuthResponse>(
    'POST',
    '/api/collections/_superusers/auth-with-password',
    { identity: EMAIL, password: PASSWORD },
  );
  if (auth.status !== 200) {
    console.error(`Auth failed (${auth.status}).`);
    process.exit(2);
  }
  const token = auth.body.token;

  // 1. Tenant
  const tenant = await upsert(
    'tenants',
    `slug='${TENANT_SLUG}'`,
    {
      name: cfg.businessName,
      slug: TENANT_SLUG,
      industry: cfg.industry,
      active: true,
    },
    token,
  );
  console.log(`tenant ${tenant.created ? 'created' : 'exists'}: ${tenant.id}`);
  const tenantId = tenant.id;

  // 2. Services
  let svcCreated = 0;
  for (const svc of cfg.services || []) {
    const r = await upsert(
      'services',
      `tenant_id='${tenantId}' && name='${svc.name.replace(/'/g, "\\'")}'`,
      {
        tenant_id: tenantId,
        name: svc.name,
        description: svc.description ?? '',
        base_price: svc.basePrice,
        duration: svc.duration,
        category: svc.category ?? '',
        active: true,
      },
      token,
    );
    if (r.created) svcCreated++;
  }
  console.log(`services: ${svcCreated} created (${(cfg.services || []).length} total)`);

  // 3. Staff owner
  const staffEmail =
    process.env.STAFF_OWNER_EMAIL || `owner@${TENANT_SLUG}.es`;
  const staffPassword = process.env.STAFF_OWNER_PASSWORD || 'ChangeMe1234!';
  const staffExists = await findOne(
    'staff',
    `tenant_id='${tenantId}' && email='${staffEmail}'`,
    token,
  );
  if (staffExists) {
    console.log(`staff exists: ${staffEmail}`);
  } else {
    const r = await pb<PbRecord>(
      'POST',
      '/api/collections/staff/records',
      {
        tenant_id: tenantId,
        email: staffEmail,
        password: staffPassword,
        passwordConfirm: staffPassword,
        role: 'owner',
        display_name: 'Propietario',
        active: true,
      },
      token,
    );
    if (r.status !== 200 && r.status !== 201) {
      throw new Error(`staff create failed (${r.status}): ${JSON.stringify(r.body)}`);
    }
    console.log(`staff created: ${staffEmail}`);
  }

  // 4. Slots
  if (SKIP_SLOTS) {
    console.log('slots: skipped (--skip-slots)');
  } else {
    const existing = await pb<PbListResponse<PbRecord>>(
      'GET',
      `/api/collections/availability_slots/records?filter=${encodeURIComponent(`tenant_id='${tenantId}'`)}&perPage=1`,
      undefined,
      token,
    );
    if (existing.body.totalItems > 0) {
      console.log(
        `slots: skipped (${existing.body.totalItems} already exist for tenant)`,
      );
    } else {
      const slots: SlotRecord[] = generateSlots({
        tenantId,
        startDate: new Date(),
        days: SLOTS_DAYS,
        operatingHours: cfg.operatingHours,
      });
      let slotCreated = 0;
      for (const s of slots) {
        const r = await pb<PbRecord>(
          'POST',
          '/api/collections/availability_slots/records',
          s,
          token,
        );
        if (r.status === 200 || r.status === 201) slotCreated++;
        else
          console.warn(
            `  slot ${s.slot_date} ${s.start_time} failed (${r.status}): ${JSON.stringify(r.body)}`,
          );
      }
      console.log(`slots: ${slotCreated} created (${slots.length} planned)`);
    }
  }

  console.log('Seed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
