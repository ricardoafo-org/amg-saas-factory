#!/usr/bin/env node
// Applies pb_migrations/*.json to a running PocketBase instance in chronological order.
// Idempotent: skips collections that already exist (matched by ID).
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD in .env');
  process.exit(1);
}

async function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(PB_URL + path);
    const lib = url.protocol === 'https:' ? https : http;
    const payload = body ? JSON.stringify(body) : undefined;
    const req = lib.request(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data || '{}') }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  // Authenticate
  const auth = await request('POST', '/api/admins/auth-with-password', { identity: EMAIL, password: PASSWORD });
  if (auth.status !== 200) {
    console.error('Auth failed:', auth.body);
    process.exit(1);
  }
  const token = auth.body.token;

  // Get existing collection IDs
  const existing = await request('GET', '/api/collections?perPage=500', null, token);
  const existingIds = new Set((existing.body.items || []).map(c => c.id));

  // Load migration files in order
  const dir = path.join(__dirname, '..', 'pb_migrations');
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.json') && !f.startsWith('README'))
    .sort();

  let applied = 0, skipped = 0;
  for (const file of files) {
    const collections = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const list = Array.isArray(collections) ? collections : [collections];
    for (const col of list) {
      if (existingIds.has(col.id)) {
        console.log(`  SKIP  ${col.name} (${file})`);
        skipped++;
        continue;
      }
      const res = await request('POST', '/api/collections', col, token);
      if (res.status === 200 || res.status === 201) {
        console.log(`  APPLY ${col.name} (${file})`);
        applied++;
      } else {
        console.error(`  FAIL  ${col.name} (${file}):`, res.body);
      }
    }
  }

  console.log(`\nDone: ${applied} applied, ${skipped} skipped.`);
}

main().catch(e => { console.error(e); process.exit(1); });
