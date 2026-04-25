---
id: BUG-014
title: Visítanos section — wrong address, wrong geo, generic Maps link
severity: high
status: open
filed: 2026-04-25
filed-by: manual
branch: fix/BUG-014-visit-section-address
---

## Summary

The `Visítanos` section on the homepage shows the wrong physical address, points "Cómo llegar" at a generic Google Maps search instead of the place deep-link, and the geo coordinates in `config.json` do not match the real location. Triple data integrity issue, all in the same surface.

User-provided canonical Maps URL:
```
https://www.google.com/maps/place/Talleres+Amg/@37.6293588,-0.9948787,17z/data=!3m1!4b1!4m6!3m5!1s0xd634208b25890d1:0xd2a60fc0d7751fe1!8m2!3d37.6293546!4d-0.9923038!16s%2Fg%2F11jk6hl0nr
```

## Problems

### 1. "Cómo llegar" goes to a search query, not the place

`config.json:21` →
```
"googleMapsUrl": "https://maps.google.com/?q=Talleres+AMG+Cartagena"
```
This drops users on a results list, not on the Talleres AMG place card. Replace with the canonical place URL above (recommend trimming the tracking params after `?entry=` for cleanliness — keep everything up to and including `16s%2Fg%2F11jk6hl0nr`).

### 2. Hardcoded WRONG address (CLAUDE.md violation)

`src/core/components/VisitSection.tsx:16` →
```tsx
<h2>Calle Mayor 42 · a dos pasos del Ayuntamiento.</h2>
```
`src/core/components/VisitSection.tsx:46` →
```tsx
<p>Calle Mayor 42, 30201 Cartagena, Murcia</p>
```

Real address per `config.json:11–14`:
```
Polígono Industrial Cabezo Beaza, Calle Zinc 12, 30353 Cartagena, Región de Murcia
```

This is a tenant-data leak into a Server Component — direct violation of the rule "All magic numbers and tenant data live in the PocketBase `config` collection — never hardcoded" (CLAUDE.md). The component already receives `config` as a prop; it must read `config.address.street`, `config.address.postalCode`, `config.address.city`, `config.address.region`. The "a dos pasos del Ayuntamiento" tagline is also wrong (Cabezo Beaza is an industrial estate, not city centre) — should be removed or replaced with something accurate, e.g. "En el polígono Cabezo Beaza · 5 minutos del centro en coche".

### 3. Geo coordinates don't match the real place

`config.json:15` says `lat 37.5731, lng -0.9945`.
User's verified Maps URL says `lat 37.6293546, lng -0.9923038`.

The config coordinates point south of Cartagena; the real place is north (Cabezo Beaza). The geo block in `config.json` needs to be reconciled with the place URL. Schema markup (`LocalBusiness` JSON-LD) likely picks up these wrong coords too — needs SEO check.

## Files affected

- `clients/talleres-amg/config.json` — fix `contact.googleMapsUrl` and `address.geo`
- `src/core/components/VisitSection.tsx` — replace hardcoded address with `config.address.*` reads, fix tagline
- Any JSON-LD `LocalBusiness` emitter that reads `address.geo` (verify in `src/app/layout.tsx` or equivalent)

## Steps to Reproduce

1. Open homepage on tst
2. Scroll to "Visítanos" section
3. Observe wrong address ("Calle Mayor 42")
4. Click "Cómo llegar" → lands on Maps search results, not the place
5. Inspect `config.json` → `address.geo` doesn't match the real location

## Expected

- Address rendered from `config.address.*`, matching `Polígono Industrial Cabezo Beaza, Calle Zinc 12, 30353 Cartagena`
- "Cómo llegar" deep-links to the canonical place URL above
- `config.json` `address.geo` matches the place coords (37.6293546, -0.9923038)

## Root Cause

Likely a v1 placeholder ("Calle Mayor 42 · a dos pasos del Ayuntamiento") that was used during the design exploration and never wired to `config`. The original `config.json` was authored against a different assumption (city-centre address), so `googleMapsUrl` and `geo` are also stale. No contract test asserts that VisitSection renders strings sourced from `config.address`.

## Fix

1. Update `clients/talleres-amg/config.json`:
   - `contact.googleMapsUrl` → canonical place URL (trimmed)
   - `address.geo.lat` → 37.6293546
   - `address.geo.lng` → -0.9923038
2. Update `src/core/components/VisitSection.tsx` to read all address strings from `config.address.*` — no string literals
3. Remove the misleading "a dos pasos del Ayuntamiento" tagline; replace with a fact derived from config or drop entirely
4. Add a Vitest snapshot test asserting that `VisitSection` rendered with a fixture config contains the fixture's `address.street`, `address.postalCode`, and the fixture's `googleMapsUrl` as an `href`. Prevents regression.

## Verification

- [ ] Address text in DOM equals `config.address.street + ", " + config.address.postalCode + " " + config.address.city`
- [ ] "Cómo llegar" `href` equals `config.contact.googleMapsUrl`
- [ ] Clicking "Cómo llegar" opens the actual Talleres AMG place card on Google Maps
- [ ] `address.geo` matches the place URL coords
- [ ] JSON-LD `LocalBusiness` (if emitted) uses correct geo
- [ ] Snapshot/unit test asserts no hardcoded street name in `VisitSection.tsx`
- [ ] No other component contains a hardcoded "Calle Mayor 42" or "30201" string
