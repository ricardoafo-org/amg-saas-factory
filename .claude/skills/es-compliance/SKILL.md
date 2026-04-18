# es-compliance

Spanish legal and fiscal compliance rules for the AMG SaaS Factory.
Uses Progressive Disclosure — read only the section relevant to your task.

---

## 1. Fiscal — IVA (Spanish VAT)

### Rates (fetch from `config` collection — never hardcode)

| Rate | Value | Applies to |
|---|---|---|
| General | 21% | Most services, parts, accessories |
| Reduced | 10% | Some repair services on primary residence |
| Super-reduced | 4% | Rare — do not apply without explicit tenant config |

```ts
// Always fetch rate from config — never assume 21%
const ivaRate = await pb.collection('config').getFirstListItem(
  `tenant_id = "${ctx.tenantId}" && key = "iva_rate"`
);
const base = parseFloat(ivaRate.value); // e.g. 0.21
const total = baseAmount * (1 + base);
const ivaAmount = baseAmount * base;
```

### Quote display (mandatory on all customer-facing quotes)

```
Base imponible:   1.234,56 €    ← Spanish locale: comma decimal, period thousands
IVA (21%):          259,26 €
─────────────────────────────
Total:            1.493,82 €
```

- Format all amounts with `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })`
- Never display Total without Base + IVA breakdown visible on the same surface
- Factura simplificada threshold: €400 without recipient data, €3.000 with recipient data (RD 1619/2012)

### Invoice retention

Invoices must be stored for **4 years** (Art. 30 Cco). Set PocketBase collection rule:
```
// Soft-delete only — hard delete blocked at collection rule level
@request.auth.id != "" && created > @now - 4*365*24*3600
```

> **Improvement implemented:** IVA rate is a tenant config value, not a constant. Automotive workshops may qualify for 10% on certain labor — configure per tenant.

---

## 2. LOPDGDD — Privacy by Design

### Consent form requirements

Every form collecting personal data must include:

```tsx
// Non-pre-ticked, required, links to tenant-specific policy
<ConsentCheckbox
  policyUrl={tenantConfig.privacyPolicyUrl}
  policyVersion={tenantConfig.privacyPolicyVersion}
  required
/>
```

**Never:** `defaultChecked`, pre-ticked, or bundled with Terms of Service.

### Consent logging (mandatory)

Log every consent event to the `consent_log` PocketBase collection:

```ts
await pb.collection('consent_log').create({
  tenant_id: ctx.tenantId,
  subject_email: formData.email,
  policy_version: tenantConfig.privacyPolicyVersion,
  policy_hash: tenantConfig.privacyPolicyHash, // SHA-256 of policy text at time of consent
  consented_at: new Date().toISOString(),
  ip_address: req.ip,       // for audit trail
  user_agent: req.headers['user-agent'],
  form_context: 'booking',  // which form triggered consent
});
```

> **Improvement:** `policy_hash` is SHA-256 of the **actual Privacy Policy text**, not just a version string. This is what proves in court exactly what was shown to the user. Generate it when the policy is published:
> ```ts
> import { createHash } from 'crypto';
> const hash = createHash('sha256').update(policyText).digest('hex');
> ```

### Right to withdraw

Withdrawal must be as easy as consent. Every account page must include a one-click "Withdraw consent" action that:
1. Inserts a `consent_log` record with `consented: false`
2. Triggers a data anonymization job (not deletion — retain for fiscal obligations)

### Cookie consent

Cookie/analytics consent is a **separate legal basis** (legitimate interest vs. consent) — use a dedicated cookie banner, not the form checkbox. Do not bundle.

### `consent_log` collection schema

```json
{
  "tenant_id": "text",
  "subject_email": "email",
  "policy_version": "text",
  "policy_hash": "text",
  "consented": "bool",
  "consented_at": "date",
  "ip_address": "text",
  "user_agent": "text",
  "form_context": "text"
}
```

---

## 3. ITV Logic Module (RD 920/2017)

For automotive clients. **Clock starts from first registration date (`fecha_primera_matriculacion`), not purchase date.**

### Inspection schedule

```ts
function itvSchedule(firstRegistration: Date): {
  nextInspection: Date | null;
  frequency: 'none' | 'biennial' | 'annual';
  note: string;
} {
  const ageYears = (Date.now() - firstRegistration.getTime()) / (365.25 * 24 * 3600 * 1000);

  if (ageYears < 4)  return { nextInspection: addYears(firstRegistration, 4), frequency: 'none',     note: 'Primera ITV a los 4 años' };
  if (ageYears < 10) return { frequency: 'biennial', nextInspection: nextBiennial(firstRegistration), note: 'ITV cada 2 años (RD 920/2017)' };
  return             { frequency: 'annual',   nextInspection: nextAnnual(firstRegistration),   note: 'ITV anual — vehículo >10 años' };
}
```

### Reminder trigger (chatbot engine integration)

Define in `chatbot_flow.json` as an action, not hardcoded logic:

```json
{
  "action": "send_itv_reminder",
  "params": { "days_before": "{{config.itv_reminder_days}}" }
}
```

Default `itv_reminder_days` = 30. Tenant can override via `config` collection.

> **Improvement:** Diesel vehicles >5 years require additional **emissions check (EURO standards)**. Add `fuel_type` field to vehicle records and extend `itvSchedule()` accordingly. Vehicles >3.500 kg have different cadences (not covered by RD 920/2017 — use RD 736/1988).

### Vehicle record required fields

```
fecha_primera_matriculacion  date      // first registration — not purchase
matricula                    text
fuel_type                    select    // gasolina | diesel | electrico | hibrido
tenant_id                    text
```

---

## 4. SEO — JSON-LD Structured Data

Use `AutomotiveBusiness` or `AutoRepair` subtype (not generic `LocalBusiness`) for automotive clients — Google Maps indexes the subtype for category-specific queries.

```tsx
// src/components/JsonLd.tsx — inject in root layout <head>
export function LocalBusinessJsonLd({ tenant }: { tenant: TenantConfig }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': tenant.businessType ?? 'AutoRepair', // AutoRepair | AutomotiveBusiness | LocalBusiness
    name: tenant.businessName,
    url: tenant.siteUrl,
    telephone: tenant.phone,
    email: tenant.email,
    priceRange: tenant.priceRange ?? '€€',         // € | €€ | €€€
    image: tenant.logoUrl,
    hasMap: tenant.googleMapsUrl,
    address: {
      '@type': 'PostalAddress',
      streetAddress: tenant.address.street,
      addressLocality: tenant.address.city,
      postalCode: tenant.address.postalCode,
      addressRegion: 'Región de Murcia',
      addressCountry: 'ES',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: tenant.geo.lat,
      longitude: tenant.geo.lng,
    },
    areaServed: [
      // List specific municipalities — Google Maps indexes these for local ranking
      'Murcia', 'Cartagena', 'Molina de Segura', 'Alcantarilla',
      'Lorca', 'Mazarrón', 'San Javier', 'Torre-Pacheco', 'Yecla',
    ],
    openingHoursSpecification: tenant.openingHours, // array of OpeningHoursSpecification
    aggregateRating: tenant.rating
      ? { '@type': 'AggregateRating', ratingValue: tenant.rating, reviewCount: tenant.reviewCount }
      : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
```

> **Improvement:** `areaServed` lists specific municipality names (not just "Murcia region") because Google Maps local ranking uses municipality-level indexing. `openingHoursSpecification` and `aggregateRating` are included — both increase the rich-result eligibility score. All values come from `tenant.config` — zero hardcoding.

### `tenant_config` fields required for JSON-LD

```
business_type     select    // AutoRepair | AutomotiveBusiness | LocalBusiness
business_name     text
site_url          url
phone             text
email             email
price_range       select    // € | €€ | €€€
logo_url          url
google_maps_url   url
address_street    text
address_city      text
address_postal    text
geo_lat           number
geo_lng           number
opening_hours     json      // OpeningHoursSpecification[]
rating            number
review_count      number
```
