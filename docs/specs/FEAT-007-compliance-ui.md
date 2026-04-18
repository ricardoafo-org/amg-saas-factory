# FEAT-007 — Compliance UI (Guarantee Badge + Price Transparency)

## Intent

Make Spain-specific legal disclosures visible in the UI: the 3-month/2,000km repair guarantee (RD 1457/1986) and full IVA-breakdown pricing (EU Right to Repair Directive 2024/1799, effective July 2026). Currently prices show on service cards but without IVA split, and no guarantee is mentioned anywhere.

## Acceptance Criteria

1. [ ] Every service card in ServiceGrid shows: base price + "IVA 21%" + total price (e.g. "€39.99 + IVA 21% = €48.39")
2. [ ] IVA rate fetched from `config` collection — never hardcoded
3. [ ] Guarantee badge displayed on service cards and in a dedicated section: "Garantía: 3 meses · 2.000 km — RD 1457/1986"
4. [ ] Presupuesto disclosure visible on ServiceGrid section header or CTA: "Siempre recibirás presupuesto escrito antes de cualquier trabajo"
5. [ ] Legal footer includes: "Garantía de reparación: 3 meses o 2.000 km (lo primero que ocurra) · RD 1457/1986"
6. [ ] Price transparency section readable on mobile (no truncation)

## Constraints

- **IVA always dynamic**: `ivaRate` prop passed from server-side fetch — never `0.21` in component
- **RD 1457/1986**: guarantee must say "3 meses O 2.000 km, lo primero que ocurra" — both conditions
- **Design**: use existing glass card + gradient-text design tokens — no new design patterns
- **Tenant**: IVA rate per tenant from config

## Out of Scope

- Generating PDF presupuestos
- Price history or price change tracking
- Service comparison table

## Test Cases

| Scenario | Expected |
|---|---|
| Service card renders | Shows "€39.99 + IVA 21% = €48.39" |
| IVA config changes | Price display updates without code change |
| Guarantee badge | Visible on all service cards |
| Footer | Guarantee text present |
| Mobile 375px | Prices readable, no overflow |

## Files to Touch

- `src/core/components/ServiceGrid.tsx` — IVA breakdown display + guarantee badge
- `src/core/components/Footer.tsx` — legal guarantee line + consumer rights note
- `src/core/types/adapter.ts` — verify `ivaRate` is in `LocalBusiness` type (it is — just use it)
- `src/app/page.tsx` — verify `ivaRate` passed as prop (already done — verify only)
