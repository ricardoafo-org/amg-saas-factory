/// <reference path="../pb_data/types.d.ts" />

// Enforces row-level tenant isolation on all protected collections.
// No authenticated user can see, modify, or delete records from a different tenant.

const TENANTED_COLLECTIONS = ['appointments', 'consent_log', 'config', 'bookings'];

// Inject tenant_id filter on every list request
onRecordsListRequest((e) => {
  const auth = e.requestInfo.authRecord;
  if (!auth) return;

  const tenantId = auth.getString('tenant_id');
  if (!tenantId) return;

  const existing = e.filter || '';
  e.filter = existing
    ? `(${existing}) && tenant_id = "${tenantId}"`
    : `tenant_id = "${tenantId}"`;
}, ...TENANTED_COLLECTIONS);

// Inject tenant_id filter on single-record view
onRecordViewRequest((e) => {
  const auth = e.requestInfo.authRecord;
  if (!auth) return;

  const tenantId = auth.getString('tenant_id');
  if (!tenantId) return;

  const record = e.record;
  if (record && record.getString('tenant_id') !== tenantId) {
    throw new ForbiddenError('Access denied: cross-tenant record access');
  }
}, ...TENANTED_COLLECTIONS);

// Block cross-tenant updates
onRecordUpdateRequest((e) => {
  const auth = e.requestInfo.authRecord;
  if (!auth) return;

  const tenantId = auth.getString('tenant_id');
  if (!tenantId) return;

  if (e.record.getString('tenant_id') !== tenantId) {
    throw new ForbiddenError('Access denied: cross-tenant update blocked');
  }
}, ...TENANTED_COLLECTIONS);

// Block cross-tenant deletes
onRecordDeleteRequest((e) => {
  const auth = e.requestInfo.authRecord;
  if (!auth) return;

  const tenantId = auth.getString('tenant_id');
  if (!tenantId) return;

  if (e.record.getString('tenant_id') !== tenantId) {
    throw new ForbiddenError('Access denied: cross-tenant delete blocked');
  }
}, ...TENANTED_COLLECTIONS);

// Auto-stamp tenant_id on create so clients can't spoof it
onRecordCreateRequest((e) => {
  const auth = e.requestInfo.authRecord;
  if (!auth) return;

  const tenantId = auth.getString('tenant_id');
  if (tenantId) {
    e.record.set('tenant_id', tenantId);
  }
}, ...TENANTED_COLLECTIONS);
