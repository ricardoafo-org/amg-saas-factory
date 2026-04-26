import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getTenantId } from '../tenant';

describe('getTenantId', () => {
  const original = process.env['TENANT_ID'];

  beforeEach(() => {
    delete process.env['TENANT_ID'];
  });

  afterEach(() => {
    if (original === undefined) delete process.env['TENANT_ID'];
    else process.env['TENANT_ID'] = original;
  });

  it('returns the env value when TENANT_ID is set', () => {
    process.env['TENANT_ID'] = 'talleres-amg';
    expect(getTenantId()).toBe('talleres-amg');
  });

  it('throws when TENANT_ID is unset', () => {
    expect(() => getTenantId()).toThrow(/TENANT_ID env var is unset/);
  });

  it('throws when TENANT_ID is empty string', () => {
    process.env['TENANT_ID'] = '';
    expect(() => getTenantId()).toThrow(/TENANT_ID env var is unset/);
  });

  it('throws when TENANT_ID is whitespace only', () => {
    process.env['TENANT_ID'] = '   ';
    expect(() => getTenantId()).toThrow(/TENANT_ID env var is unset/);
  });

  it('error message mentions cross-tenant data leak risk', () => {
    expect(() => getTenantId()).toThrow(/cross-tenant data leak/);
  });
});
