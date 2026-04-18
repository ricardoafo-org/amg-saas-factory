#!/usr/bin/env node
// Validates chatbot_flow.json files against the flow schema.
// Usage: node scripts/validate-flow.js path/to/chatbot_flow.json
//        node scripts/validate-flow.js  (scans all tenant dirs under pb_data/tenants/)
const fs = require('fs');
const path = require('path');

const FLOW_SCHEMA = {
  required: ['version', 'start', 'nodes'],
  properties: {
    version: { type: 'number' },
    start: { type: 'string' },
    nodes: { type: 'object' },
  },
};

const NODE_SCHEMA = {
  oneOf: [
    { required: ['message'], properties: { message: { type: 'string' }, options: { type: 'array' }, next: { type: 'string' } } },
    { required: ['action'], properties: { action: { type: 'string' }, next: { type: 'string' } } },
  ],
};

function validateFlow(json, filePath) {
  const errors = [];

  for (const key of FLOW_SCHEMA.required) {
    if (json[key] === undefined) errors.push(`Missing required field: "${key}"`);
  }
  if (typeof json.nodes !== 'object' || Array.isArray(json.nodes)) {
    errors.push('"nodes" must be an object');
    return errors;
  }
  if (!json.nodes[json.start]) {
    errors.push(`"start" node "${json.start}" does not exist in nodes`);
  }

  // Check all referenced "next" nodes exist
  for (const [nodeId, node] of Object.entries(json.nodes)) {
    if (node.next && !json.nodes[node.next]) {
      errors.push(`Node "${nodeId}": next="${node.next}" references missing node`);
    }
    if (node.options) {
      for (const opt of node.options) {
        if (opt.next && !json.nodes[opt.next]) {
          errors.push(`Node "${nodeId}" option "${opt.label}": next="${opt.next}" references missing node`);
        }
      }
    }
    // Warn on hardcoded prices (anti-pattern)
    const msg = JSON.stringify(node);
    if (/\d+[.,]\d{2}/.test(msg) && !msg.includes('{{')) {
      errors.push(`Node "${nodeId}": possible hardcoded price detected — use {{config.key}} tokens`);
    }
  }

  return errors;
}

function run() {
  let files = process.argv.slice(2);

  if (files.length === 0) {
    // Auto-discover tenant flow files under clients/
    const clientsDir = path.join(process.cwd(), 'clients');
    if (fs.existsSync(clientsDir)) {
      files = fs.readdirSync(clientsDir)
        .map(t => path.join(clientsDir, t, 'chatbot_flow.json'))
        .filter(f => fs.existsSync(f));
    }
  }

  if (files.length === 0) {
    console.log('No chatbot_flow.json files found.');
    process.exit(0);
  }

  let failed = 0;
  for (const file of files) {
    let json;
    try {
      json = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      console.error(`  INVALID JSON  ${file}: ${e.message}`);
      failed++;
      continue;
    }

    const errors = validateFlow(json, file);
    if (errors.length > 0) {
      console.error(`  FAIL  ${file}`);
      errors.forEach(e => console.error(`         - ${e}`));
      failed++;
    } else {
      console.log(`  OK    ${file}`);
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} flow(s) failed validation.`);
    process.exit(1);
  }
  console.log('\nAll flows valid.');
}

run();
