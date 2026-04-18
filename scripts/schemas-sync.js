#!/usr/bin/env node
// Diffs src/schemas/*.schema.json against live PocketBase collection definitions.
// Exits non-zero if any field names or types diverge — use in CI pre-build.
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;
const SCHEMAS_DIR = path.join(__dirname, '..', 'src', 'schemas');

if (!EMAIL || !PASSWORD) {
  console.error('Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD in .env');
  process.exit(1);
}

async function request(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(PB_URL + urlPath);
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

// Maps JSON Schema types to PocketBase field types (extend as needed)
const PB_TYPE_MAP = { string: 'text', number: 'number', boolean: 'bool', array: 'json', object: 'json' };

async function main() {
  if (!fs.existsSync(SCHEMAS_DIR)) {
    console.log('No src/schemas/ directory found — skipping sync check.');
    process.exit(0);
  }

  const auth = await request('POST', '/api/admins/auth-with-password', { identity: EMAIL, password: PASSWORD });
  if (auth.status !== 200) { console.error('Auth failed'); process.exit(1); }
  const token = auth.body.token;

  const collections = await request('GET', '/api/collections?perPage=500', null, token);
  const pbByName = Object.fromEntries((collections.body.items || []).map(c => [c.name, c]));

  const schemaFiles = fs.readdirSync(SCHEMAS_DIR).filter(f => f.endsWith('.schema.json'));
  let drifts = 0;

  for (const file of schemaFiles) {
    const collectionName = file.replace('.schema.json', '');
    const schema = JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, file), 'utf8'));
    const pbCol = pbByName[collectionName];

    if (!pbCol) {
      console.warn(`  MISSING  Collection "${collectionName}" in PocketBase (defined in ${file})`);
      drifts++;
      continue;
    }

    const pbFields = Object.fromEntries((pbCol.schema || []).map(f => [f.name, f]));
    const schemaProps = schema.properties || {};

    for (const [field, def] of Object.entries(schemaProps)) {
      if (field === 'id' || field === 'created' || field === 'updated') continue;
      const pbField = pbFields[field];
      if (!pbField) {
        console.warn(`  DRIFT    ${collectionName}.${field} exists in schema but not in PocketBase`);
        drifts++;
        continue;
      }
      const expectedType = PB_TYPE_MAP[def.type] || 'text';
      if (pbField.type !== expectedType && pbField.type !== 'relation' && pbField.type !== 'select') {
        console.warn(`  TYPE     ${collectionName}.${field}: schema=${expectedType}, PocketBase=${pbField.type}`);
        drifts++;
      }
    }

    for (const pbField of (pbCol.schema || [])) {
      if (!schemaProps[pbField.name]) {
        console.warn(`  EXTRA    ${collectionName}.${pbField.name} in PocketBase but not in schema`);
        drifts++;
      }
    }

    if (drifts === 0) console.log(`  OK       ${collectionName}`);
  }

  if (drifts > 0) {
    console.error(`\nSchema sync failed: ${drifts} drift(s) found. Update src/schemas/ or PocketBase collections.`);
    process.exit(1);
  }

  console.log('\nAll schemas in sync with PocketBase.');
}

main().catch(e => { console.error(e); process.exit(1); });
