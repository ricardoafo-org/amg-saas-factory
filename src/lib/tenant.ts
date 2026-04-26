import 'server-only';

export function getTenantId(): string {
  const value = process.env['TENANT_ID'];
  if (!value || value.trim() === '') {
    throw new Error(
      'TENANT_ID env var is unset. Set TENANT_ID to a tenant slug (e.g. "talleres-amg") before booting the app. Refusing silent fallback to avoid cross-tenant data leak.',
    );
  }
  return value;
}
