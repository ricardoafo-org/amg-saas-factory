# FEAT-030 — Admin Design Token Sweep

## Intent

Customer surface is now aligned with the Claude Design v2 bundle (FEAT-028). Admin surface still has hardcoded HSL colors, hex codes, raw `bg-purple-500`/`text-purple-400` Tailwind primitives, and `bg-white` toggle thumbs. That breaks the design system promise: any token change in `globals.css` won't propagate. This sweep replaces every raw color in admin with the semantic tokens we already defined.

Out of scope for this PR: motion sweep, LOPD checkbox on QuoteForm, full admin layout redesign — those are FEAT-030b/c.

## Acceptance Criteria

1. [ ] No `bg-purple-500/10`, `text-purple-400`, or `border-purple-500/20` strings remain in `src/app/(admin)/**` or `src/core/components/admin/**`. The "in_progress" status uses `var(--status-in-progress)` via inline style or a semantic utility.
2. [ ] `RevenueBarChart.tsx` uses `var(--primary)`, `var(--accent)`, `var(--muted-fg)`, `var(--border)`, `var(--card)`, `var(--foreground)` — no `hsl(...)` literals.
3. [ ] `ServiceDonutChart.tsx` uses a CSS-variable-driven palette in this order: `--primary`, `--accent`, `--brand-m-darkblue`, `--brand-m-lightblue`, `--status-ready`, `--status-pending`, `--status-completed`. No `hsl(...)` literals.
4. [ ] `EditCustomerModal.tsx:170` toggle thumb uses `bg-card` or `bg-background` instead of `bg-white`.
5. [ ] `OpeningHoursForm.tsx:124` toggle thumb uses `bg-card` or `bg-background` instead of `bg-white`.
6. [ ] `email-preview/page.tsx` and `email-preview/[template]/page.tsx` use `var(--*)` via inline style or semantic Tailwind utilities — no hex codes (`#666`, `#111`, `#1a1a2e`, `#fff`, `#aaa`, `#e5e5e5`).
7. [ ] `CopyHtmlButton.tsx` uses `var(--success)` for the copied state, `var(--secondary)` or `var(--card)` for default — no `#16a34a`, `#374151`, `#fff`.
8. [ ] All admin pages render without console errors. Visual diff against current admin: parity or improvement (the dark-on-dark palette these tokens render as in light mode is closer to the bundle's intent).
9. [ ] `npm run type-check` zero exit.
10. [ ] `npm test` 179/179 still passing.

## Constraints

- **Legal**: No legal changes — pure visual.
- **Performance**: No new dependencies, no extra CSS load.
- **Compatibility**: Light-first (per FEAT-028 SKILL.md rewrite). Charts must read clearly on `--background` (paper-white).
- **Tenant**: Not applicable — no DB changes.

## Out of Scope

- `framer-motion` admin sweep (deferred to FEAT-030b)
- LOPD checkbox on QuoteForm (FEAT-030c)
- Sidebar / topbar / spacing redesign — only color/token correctness here
- Phantom `hover:shadow-glow` removal — covered separately if it surfaces in QA

## Test Cases

| Scenario | Input | Expected output |
|---|---|---|
| In-progress badge | Today page with appointment in `in_progress` | Badge renders with `var(--status-in-progress)` purple — same hue as before, but tied to token |
| Revenue chart on light bg | Reports page in light mode | Bars render with primary red + accent amber, grid lines visible against `--background` |
| Donut chart 7+ services | Reports page with 8 services | First 7 use the palette in order; remainder fall back to `--muted-fg` |
| Customer detail modal toggle | Open EditCustomerModal | Toggle thumb is the `--card` color, not pure white |
| Email preview index | Visit `/admin/email-preview` | Heading and link colors come from tokens, not hex |

## Files to Touch

- [ ] `src/app/(admin)/admin/(app)/today/page.tsx` — line 74 status badge map
- [ ] `src/app/(admin)/admin/(app)/customers/[id]/page.tsx` — line 17 status map
- [ ] `src/core/components/admin/reports/RevenueBarChart.tsx` — all `hsl(...)` → CSS vars
- [ ] `src/core/components/admin/reports/ServiceDonutChart.tsx` — palette constant + text fills
- [ ] `src/core/components/admin/EditCustomerModal.tsx` — line 170 thumb color
- [ ] `src/core/components/admin/settings/OpeningHoursForm.tsx` — line 124 thumb color
- [ ] `src/app/(admin)/admin/email-preview/page.tsx` — replace inline hex with tokens
- [ ] `src/app/(admin)/admin/email-preview/[template]/page.tsx` — replace `PRIMARY = '#1a1a2e'` and other hex
- [ ] `src/app/(admin)/admin/email-preview/[template]/CopyHtmlButton.tsx` — replace hex

## Builder-Validator Checklist

- [ ] All PocketBase queries scoped to `tenant_id` (no DB queries added)
- [ ] LOPDGDD: no PII or consent flow touched
- [ ] No hardcoded IVA rate
- [ ] No PII in `console.log`
- [ ] No hardcoded tenant data
- [ ] `npm run type-check` zero exit
- [ ] `npm test` all pass
- [ ] `npm run lint` zero errors
- [ ] `grep -rn "hsl(" src/app/(admin) src/core/components/admin` returns zero matches
- [ ] `grep -rn "bg-purple\|text-purple\|border-purple" src/app/(admin) src/core/components/admin` returns zero matches
- [ ] `grep -rn "#[0-9a-fA-F]\{3,6\}" src/app/(admin)/admin/email-preview` returns zero matches (other than asset URLs)
