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

export type StaffRole = 'owner' | 'technician' | 'admin';

export type Staff = PbRecord & {
  tenant_id: string;
  role: StaffRole;
  display_name: string;
  phone: string;
  active: boolean;
  email: string;
};

export type StaffContext = {
  pb: PocketBase;
  tenantId: string;
  staffId: string;
  role: StaffRole;
};

export type Customer = PbRecord & {
  tenant_id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  first_seen: string;
  last_seen: string;
  total_visits: number;
  total_spent: number;
  preferred_contact: 'sms' | 'email' | 'whatsapp';
  marketing_consent: boolean;
};

export type Vehicle = PbRecord & {
  tenant_id: string;
  customer_id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  fuel_type: 'gasolina' | 'diesel' | 'electrico' | 'hibrido';
  engine_cc: number;
  last_km: number;
  itv_expiry: string;
  notes: string;
};

export type WorkOrderStatus = 'intake' | 'diagnosis' | 'repair' | 'quality_check' | 'ready' | 'delivered';

export type WorkOrder = PbRecord & {
  tenant_id: string;
  appointment_id: string;
  customer_id: string;
  vehicle_id: string;
  status: WorkOrderStatus;
  tech_notes: string;
  estimated_ready: string;
  actual_cost: number;
  labor_minutes: number;
};

export type Appointment = PbRecord & {
  tenant_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service_ids: string[];
  scheduled_at: string;
  notes: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  base_amount: number;
  iva_rate: number;
  total_amount: number;
  customer_id?: string;
};

export type SmsLogStatus = 'sent' | 'delivered' | 'failed';

export type SmsLog = PbRecord & {
  tenant_id: string;
  to_phone: string;
  message: string;
  status: SmsLogStatus;
  provider_id: string;
  appointment_id: string;
};
