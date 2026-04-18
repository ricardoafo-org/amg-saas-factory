import type PocketBase from 'pocketbase';

export type TenantContext = {
  pb: PocketBase;
  tenantId: string;
  userId: string;
};

export type PbRecord = {
  id: string;
  created: string;
  updated: string;
  collectionId: string;
  collectionName: string;
};

export type Tenant = PbRecord & {
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  active: boolean;
};

export type Config = PbRecord & {
  tenant_id: string;
  key: string;
  value: string;
};

export type ConsentLog = PbRecord & {
  tenant_id: string;
  subject_email: string;
  policy_version: string;
  policy_hash: string;
  consented: boolean;
  consented_at: string;
  ip_address: string;
  user_agent: string;
  form_context: string;
};

export type Booking = PbRecord & {
  tenant_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service_type: string;
  scheduled_at: string;
  notes: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  base_amount: number;
  iva_rate: number;
};
