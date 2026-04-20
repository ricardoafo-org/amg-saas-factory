export type Industry = 'automotive' | 'barbershop' | 'clinic' | 'restaurant' | string;

export type OperatingHours = {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  open: string;   // "09:00"
  close: string;  // "18:00"
  closed?: boolean;
};

export type Service = {
  id: string;
  name: string;
  description?: string;
  basePrice: number;   // before IVA — never store total
  duration: number;    // minutes
  category?: string;
};

export type Branding = {
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  fontFamily: string;
  logoUrl?: string;
};

export type LocalBusiness = {
  tenantId: string;
  businessName: string;
  industry: Industry;
  tagline?: string;
  foundingYear?: number;
  reviewRating?: number;
  reviewCount?: number;
  address: {
    street: string;
    city: string;
    postalCode: string;
    region: string;
    country: string;
    geo: { lat: number; lng: number };
  };
  contact: {
    phone: string;
    email: string;
    whatsapp?: string;
    googleMapsUrl?: string;
  };
  branding: Branding;
  services: Service[];
  operatingHours: OperatingHours[];
  privacyPolicy: {
    url: string;
    version: string;
    hash: string;  // SHA-256 of policy text at publish time
  };
  ivaRate: number;   // 0.21 — fetched from config, never hardcoded in components
  locale: string;    // 'es-ES'
  currency: string;  // 'EUR'
  legal?: {
    cif: string;
    registrationNumber: string;
    dpoEmail: string;
  };
};
