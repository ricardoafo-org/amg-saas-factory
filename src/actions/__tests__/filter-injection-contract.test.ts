// SEV-1: Security axis row S4 (filter injection — user-controlled input interpolated raw into a PocketBase filter).
// This contract test enforces the BUG-015 / BUG-016 fix: every PocketBase filter MUST be built via
// `pb.filter('… {:k} …', { k })` parameterised form. Raw `${value}` interpolation inside filter strings
// (template literals containing `tenant_id =` or surrounding a `filter:` key) is forbidden.
//
// If this test fails, a regression has been introduced. The fix is mechanical: convert the offending
// site to `pb.filter('…', { … })`. See docs/bugs/wip-BUG-016.md and PR #31 (BUG-015) for the pattern.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = join(__dirname, '..', '..', '..');
const SCAN_DIRS = [
  join(ROOT, 'src', 'actions'),
  join(ROOT, 'src', 'lib', 'chatbot'),
  join(ROOT, 'src', 'app'),
];

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      yield* walk(full);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry)) yield full;
  }
}

// Match a template literal that interpolates `${...}` immediately after `tenant_id = "`.
// This is the BUG-015 / BUG-016 anti-pattern.
const RAW_TENANT_INTERPOLATION = /tenant_id\s*=\s*"\$\{/;

// Match a `filter: \`...\${...}\`` shape — any raw interpolation inside an object literal whose key is `filter`.
// We deliberately accept `filter: pb.filter(...)` and `filter: someVariable` — only template-literal `${...}` is flagged.
const RAW_FILTER_INTERPOLATION = /filter\s*:\s*`[^`]*\$\{[^}]+\}[^`]*`/;

describe('PocketBase filter contract — no raw interpolation (SEV-1 / S4)', () => {
  it('no source file interpolates `${...}` after `tenant_id = "`', () => {
    const offenders: string[] = [];
    for (const dir of SCAN_DIRS) {
      for (const file of walk(dir)) {
        const text = readFileSync(file, 'utf8');
        if (RAW_TENANT_INTERPOLATION.test(text)) {
          offenders.push(relative(ROOT, file));
        }
      }
    }
    expect(
      offenders,
      `Raw \`tenant_id = "\${...}"\` interpolation found. Convert to pb.filter('tenant_id = {:tenantId}', { tenantId }):\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });

  it('no `filter:` value is a template literal containing `${...}`', () => {
    const offenders: string[] = [];
    for (const dir of SCAN_DIRS) {
      for (const file of walk(dir)) {
        const text = readFileSync(file, 'utf8');
        if (RAW_FILTER_INTERPOLATION.test(text)) {
          offenders.push(relative(ROOT, file));
        }
      }
    }
    expect(
      offenders,
      `Raw template-literal interpolation found in a \`filter:\` value. Convert to pb.filter('… {:k} …', { k }):\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });
});
