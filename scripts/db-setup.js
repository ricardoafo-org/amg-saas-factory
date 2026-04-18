#!/usr/bin/env node
/**
 * db-setup.js — PocketBase setup for AMG SaaS Factory
 * Run: node scripts/db-setup.js
 *      or: node -r dotenv/config scripts/db-setup.js
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// 1. Load .env manually (fallback — dotenv/config may already have run)
// ---------------------------------------------------------------------------
try {
  const envPath = path.join(process.cwd(), '.env');
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
} catch (_) {
  // .env not found — rely on environment variables already set
}

// ---------------------------------------------------------------------------
// 2. Config
// ---------------------------------------------------------------------------
const PB_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('✗ Missing POCKETBASE_ADMIN_EMAIL or POCKETBASE_ADMIN_PASSWORD');
  process.exit(1);
}

// Counters
let collectionsCreated = 0;
let recordsCreated = 0;

// ---------------------------------------------------------------------------
// 3. HTTP helper
// ---------------------------------------------------------------------------
/**
 * @param {'GET'|'POST'|'PATCH'|'DELETE'} method
 * @param {string} urlPath  e.g. '/api/collections'
 * @param {object|null} body
 * @param {string|null} token
 * @returns {Promise<{status: number, body: any}>}
 */
function request(method, urlPath, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const url = new URL(urlPath, PB_URL);

    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch (_) { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// 4. Collection helper
// ---------------------------------------------------------------------------
/**
 * @param {string} name
 * @param {object[]} schema  — array of PocketBase field descriptors
 * @param {string} token
 */
async function createCollection(name, schema, token) {
  const res = await request('POST', '/api/collections', {
    name,
    type: 'base',
    schema,
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
  }, token);

  if (res.status === 200 || res.status === 201) {
    console.log(`  ✓ Collection '${name}' created`);
    collectionsCreated++;
    return res.body;
  } else if (res.status === 400) {
    // Could be duplicate OR a real validation error — check message
    const msg = res.body?.message || '';
    if (
      msg.toLowerCase().includes('already exists') ||
      msg.toLowerCase().includes('unique') ||
      (res.body?.data && JSON.stringify(res.body.data).includes('already'))
    ) {
      console.log(`  SKIP Collection '${name}' already exists`);
    } else {
      // Still treat 400 as "skip" per spec, but log the detail
      console.log(`  SKIP Collection '${name}' (400: ${msg})`);
    }
    // Fetch existing to return its id
    const existing = await request('GET', `/api/collections/${name}`, null, token);
    return existing.body;
  } else {
    console.log(`  ✗ Collection '${name}' failed (${res.status}): ${JSON.stringify(res.body)}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 5. Seed helper
// ---------------------------------------------------------------------------
/**
 * @param {string} collection
 * @param {object} data
 * @param {string} token
 * @returns {Promise<object|null>}  created or existing record
 */
async function seedRecord(collection, data, token) {
  const res = await request('POST', `/api/collections/${collection}/records`, data, token);
  if (res.status === 200 || res.status === 201) {
    recordsCreated++;
    return res.body;
  } else {
    console.log(`  ✗ Seed '${collection}' failed (${res.status}): ${JSON.stringify(res.body)}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 6. Count helper (to check if seed data already exists)
// ---------------------------------------------------------------------------
async function getCount(collection, filter, token) {
  const filterQ = filter ? `?filter=${encodeURIComponent(filter)}&perPage=1` : '?perPage=1';
  const res = await request('GET', `/api/collections/${collection}/records${filterQ}`, null, token);
  if (res.status === 200) return res.body.totalItems ?? 0;
  return -1; // collection might not exist yet
}

// ---------------------------------------------------------------------------
// 7. Date utilities
// ---------------------------------------------------------------------------
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Day-of-week: 0=Sun,1=Mon,...,6=Sat
const WEEKDAY_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '15:00', '16:00', '17:00'];
const SATURDAY_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00'];

function endTime(start) {
  const [h, m] = start.split(':').map(Number);
  const endH = h + 1;
  return `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// 8. Schema definitions
// ---------------------------------------------------------------------------
function field(name, type, opts = {}) {
  return { name, type, required: false, ...opts };
}

const SCHEMAS = {
  tenants: [
    field('name', 'text', { required: true }),
    field('slug', 'text', { required: true }),
    field('industry', 'select', {
      required: true,
      options: { maxSelect: 1, values: ['automotive', 'barbershop', 'clinic', 'restaurant', 'other'] },
    }),
    field('active', 'bool'),
  ],

  config: [
    field('tenant_id', 'text', { required: true }),
    field('key', 'text', { required: true }),
    field('value', 'text', { required: true }),
  ],

  services: [
    field('tenant_id', 'text', { required: true }),
    field('name', 'text', { required: true }),
    field('description', 'text'),
    field('base_price', 'number', { required: true }),
    field('duration', 'number', { required: true }),
    field('category', 'text'),
    field('active', 'bool'),
  ],

  availability_slots: [
    field('tenant_id', 'text', { required: true }),
    field('service_id', 'text'),
    field('slot_date', 'date', { required: true }),
    field('start_time', 'text', { required: true }),
    field('end_time', 'text', { required: true }),
    field('is_available', 'bool', { required: true }),
  ],

  appointments: [
    field('tenant_id', 'text', { required: true }),
    field('slot_id', 'text', { required: true }),
    field('service_id', 'text', { required: true }),
    field('customer_name', 'text', { required: true }),
    field('customer_email', 'email', { required: true }),
    field('customer_phone', 'text', { required: true }),
    field('matricula', 'text'),
    field('fuel_type', 'select', {
      options: { maxSelect: 1, values: ['gasolina', 'diesel', 'electrico', 'hibrido'] },
    }),
    field('km_current', 'number'),
    field('km_last_oil_change', 'number'),
    field('oil_type', 'select', {
      options: { maxSelect: 1, values: ['mineral', 'semi_sintetico', 'sintetico'] },
    }),
    field('first_registration_date', 'text'),
    field('notes', 'text'),
    field('status', 'select', {
      required: true,
      options: { maxSelect: 1, values: ['pending', 'confirmed', 'completed', 'cancelled'] },
    }),
    field('base_amount', 'number'),
    field('iva_rate', 'number'),
    field('total_amount', 'number'),
    field('email_sent', 'bool'),
  ],

  consent_log: [
    field('tenant_id', 'text', { required: true }),
    field('subject_email', 'email'),
    field('policy_version', 'text', { required: true }),
    field('policy_hash', 'text', { required: true }),
    field('consented', 'bool', { required: true }),
    field('consented_at', 'text', { required: true }),
    field('ip_address', 'text'),
    field('user_agent', 'text'),
    field('form_context', 'text', { required: true }),
  ],
};

// ---------------------------------------------------------------------------
// 9. Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== AMG SaaS Factory — PocketBase DB Setup ===\n');

  // --- Authenticate ---
  console.log('Authenticating as admin...');
  const authRes = await request('POST', '/api/collections/_superusers/auth-with-password', {
    identity: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (authRes.status !== 200) {
    console.error(`✗ Auth failed (${authRes.status}): ${JSON.stringify(authRes.body)}`);
    process.exit(1);
  }

  const token = authRes.body.token;
  console.log('✓ Authenticated\n');

  // --- Create collections ---
  console.log('--- Collections ---');
  const collectionRefs = {};
  for (const [name, schema] of Object.entries(SCHEMAS)) {
    collectionRefs[name] = await createCollection(name, schema, token);
  }
  console.log('');

  // --- Seed: Tenant ---
  console.log('--- Seed: tenants ---');
  let tenantId;
  const tenantCount = await getCount('tenants', "slug='talleres-amg'", token);
  if (tenantCount > 0) {
    console.log("  SKIP Tenant 'talleres-amg' already exists — fetching id...");
    const existing = await request(
      'GET',
      "/api/collections/tenants/records?filter=" + encodeURIComponent("slug='talleres-amg'") + "&perPage=1",
      null,
      token
    );
    tenantId = existing.body?.items?.[0]?.id;
    console.log(`  (id: ${tenantId})`);
  } else {
    const tenant = await seedRecord('tenants', {
      name: 'Talleres AMG',
      slug: 'talleres-amg',
      industry: 'automotive',
      active: true,
    }, token);
    if (tenant) {
      tenantId = tenant.id;
      console.log(`  ✓ Tenant created (id: ${tenantId})`);
    }
  }

  if (!tenantId) {
    console.error('✗ Could not obtain tenant id — aborting seed.');
    process.exit(1);
  }

  // --- Seed: Config ---
  console.log('\n--- Seed: config ---');
  const configEntries = [
    { key: 'iva_rate',                    value: '0.21' },
    { key: 'business_name',               value: 'Talleres AMG' },
    { key: 'business_phone',              value: '+34 968 000 000' },
    { key: 'itv_reminder_days',           value: '30' },
    { key: 'oil_change_km_mineral',       value: '7500' },
    { key: 'oil_change_km_semi',          value: '10000' },
    { key: 'oil_change_km_synthetic',     value: '15000' },
    { key: 'oil_change_months',           value: '12' },
    { key: 'greeting',                    value: 'Hola, soy el asistente de Talleres AMG' },
    { key: 'privacy_policy_url',          value: 'https://talleresentamg.es/privacidad' },
    { key: 'privacy_policy_version',      value: '1.0.0' },
  ];

  for (const entry of configEntries) {
    const count = await getCount(
      'config',
      `tenant_id='${tenantId}' && key='${entry.key}'`,
      token
    );
    if (count > 0) {
      console.log(`  SKIP config[${entry.key}] already exists`);
    } else {
      const rec = await seedRecord('config', { tenant_id: tenantId, ...entry }, token);
      if (rec) console.log(`  ✓ config[${entry.key}] = ${entry.value}`);
    }
  }

  // --- Seed: Services ---
  console.log('\n--- Seed: services ---');
  const servicesDef = [
    { name: 'Cambio de Aceite',    description: 'Cambio de aceite y filtro con revisión de niveles', base_price: 39.99, duration: 45, category: 'mantenimiento' },
    { name: 'Revisión Pre-ITV',    description: 'Inspección completa antes de pasar la ITV',         base_price: 49.99, duration: 60, category: 'inspeccion'   },
    { name: 'Mecánica General',    description: 'Diagnóstico y reparación de averías',               base_price: 65.00, duration: 90, category: 'reparacion'   },
    { name: 'Cambio de Neumáticos',description: 'Montaje, equilibrado y alineación',                 base_price: 15.00, duration: 30, category: 'neumaticos'   },
    { name: 'Revisión de Frenos',  description: 'Inspección y sustitución de pastillas y discos',    base_price: 79.99, duration: 75, category: 'seguridad'    },
    { name: 'Diagnóstico Electrónico', description: 'Diagnóstico completo con escáner profesional e informe detallado', base_price: 45.00, duration: 60, category: 'electronica' },
    { name: 'Escáner OBD',            description: 'Lectura rápida de códigos de error y borrado de averías',          base_price: 25.00, duration: 30, category: 'electronica' },
  ];

  const serviceIds = [];
  for (const svc of servicesDef) {
    const count = await getCount(
      'services',
      `tenant_id='${tenantId}' && name='${svc.name}'`,
      token
    );
    if (count > 0) {
      console.log(`  SKIP service '${svc.name}' already exists`);
      // fetch id for slot seeding
      const res = await request(
        'GET',
        '/api/collections/services/records?filter=' +
          encodeURIComponent(`tenant_id='${tenantId}' && name='${svc.name}'`) + '&perPage=1',
        null,
        token
      );
      const id = res.body?.items?.[0]?.id;
      if (id) serviceIds.push(id);
    } else {
      const rec = await seedRecord('services', {
        tenant_id: tenantId,
        active: true,
        ...svc,
      }, token);
      if (rec) {
        console.log(`  ✓ service '${svc.name}'`);
        serviceIds.push(rec.id);
      }
    }
  }

  // --- Seed: Availability slots ---
  console.log('\n--- Seed: availability_slots (next 21 days) ---');

  // Check total existing slots for this tenant to decide whether to skip
  const existingSlotCount = await getCount('availability_slots', `tenant_id='${tenantId}'`, token);
  if (existingSlotCount > 0) {
    console.log(`  SKIP availability_slots — ${existingSlotCount} slots already exist for this tenant`);
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let slotCount = 0;
    for (let i = 0; i < 21; i++) {
      const day = addDays(today, i);
      const dow = day.getDay(); // 0=Sun, 6=Sat
      if (dow === 0) continue; // Sunday — no slots

      const slots = dow === 6 ? SATURDAY_SLOTS : WEEKDAY_SLOTS;
      const dateStr = toDateString(day);

      for (const start of slots) {
        const rec = await seedRecord('availability_slots', {
          tenant_id: tenantId,
          service_id: '',
          slot_date: dateStr + ' 00:00:00.000Z',
          start_time: start,
          end_time: endTime(start),
          is_available: true,
        }, token);
        if (rec) slotCount++;
      }
    }
    console.log(`  ✓ ${slotCount} availability slots created`);
  }

  // --- Summary ---
  console.log('\n=== DB setup complete. ' +
    `${collectionsCreated} collections, ${recordsCreated} records created. ===`);
}

main().catch((err) => {
  console.error('✗ Unexpected error:', err);
  process.exit(1);
});
