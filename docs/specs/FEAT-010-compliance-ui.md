# FEAT-010 — Compliance UI (IVA breakdown, warranty badge, legal footer)

## Intent

Implement all Spain/EU compliance UI elements required for Sprint 2: IVA breakdown on all service prices, the RD 1457/1986 warranty badge, and an enriched legal footer with consumer rights disclosure. These elements build trust and are legally required.

## Acceptance Criteria

1. [ ] All service cards in `ServiceGrid` show: base price + "IVA (21%)" line + **total** in bold
2. [ ] IVA rate fetched from config — never hardcoded as 0.21 anywhere in display code
3. [ ] RD 1457/1986 warranty badge: "✓ 3 meses o 2.000 km de garantía en reparaciones" visible on each service card
4. [ ] Presupuesto disclosure in booking flow summary: "Todo trabajo está sujeto a presupuesto previo según RD 1457/1986"
5. [ ] Footer enriched with: consumer rights link (OCU), taller registration number, ITV authority link, cancellation policy summary
6. [ ] Legal footer line: "© {year} {businessName} — CIF: {cif} — Inscrito en el Registro de Talleres de la Región de Murcia n.º {registrationNumber}"
7. [ ] `npm run type-check` → zero exit

## IVA display pattern

```
Cambio de aceite
Base: 39,67 €
IVA (21%): 8,33 €
─────────────────
Total: 48,00 €
```

## Warranty badge content (RD 1457/1986 Art. 16)

- "3 meses o 2.000 km de garantía en reparaciones" (minimum legal guarantee)
- Badge shown per service card and in appointment confirmation email

## Constraints

- **IVA rate**: always from `config.iva_rate` — never `0.21` literal in display components
- **Registration number**: from `config.legal.registrationNumber` in config.json
- **RD 1457/1986**: Art. 14 requires presupuesto; Art. 16 requires 3-month/2000km guarantee
- **No financial advice**: prices are estimates; "precios orientativos, sujetos a revisión"

## Out of Scope

- IVA invoice PDF generation (Sprint 6 owner dashboard)
- EU Right to Repair 2024/1799 full compliance (effective July 2026 — deferred)
- Digital signatures on presupuestos

## Files to Touch

- `src/core/components/ServiceGrid.tsx` — add IVA breakdown + warranty badge per card
- `src/core/components/Footer.tsx` — legal footer line with CIF + registration
- `src/core/chatbot/ChatEngine.tsx` — presupuesto disclosure in booking summary step
- `clients/talleres-amg/config.json` — add `legal.cif`, `legal.registrationNumber`
- `src/actions/chatbot.ts` — include warranty info in confirmation email
