# FEAT-022 — QA Full Suite (Framework + All Test Types)

## Intent

Establish and execute a complete QA strategy for the AMG SaaS Factory MVP. Covers framework verification, test creation across all layers (smoke, sanity, regression, E2E, API, DB, performance, accessibility, visual regression), and identification of which test cases require manual execution by the user.

Sprint 4 gate: this spec is the entry point for Sprint 4. Before any new feature work, QA framework must be verified and the full suite created, run, and passing.

## Acceptance Criteria

### Phase 1 — Framework verification
1. [ ] `e2e/pages/` POM base classes exist for all public flows (Home, Chatbot, ITV, Admin)
2. [ ] `e2e/fixtures/` booking and admin fixtures present and typed
3. [ ] `playwright.config.ts` has projects: Chromium desktop, Firefox desktop, Mobile Safari (iPhone 13), Mobile Chrome (Pixel 5), `network-resilience` (Chromium only)
4. [ ] `vitest.config.ts` configured, `npm test` passes with ≥ 80% coverage on `src/lib/` and `src/actions/`
5. [ ] CI gate: `npm run type-check` + `npm test` + `npx playwright test --project=chromium` run in sequence, non-zero = fail

### Phase 2 — Smoke tests (critical path, fast, <5 min)
6. [ ] Homepage loads, title = "Talleres AMG", 5 service cards visible
7. [ ] Chatbot opens and sends first message
8. [ ] Admin login page renders, login form accepts credentials
9. [ ] `/politica-de-privacidad` returns HTTP 200
10. [ ] `/politica-de-cookies` returns HTTP 200
11. [ ] PocketBase `/api/health` returns `{"code":200}`

### Phase 3 — Sanity tests (UI completeness, <10 min)
12. [ ] All 5 service cards show IVA breakdown (base + IVA % + total)
13. [ ] Warranty badge present on each service card with "3 meses o 2.000 km"
14. [ ] Footer contains: CIF, registration number, warranty line, "Precios orientativos sin IVA", OCU link
15. [ ] Cookie consent banner appears on first visit (no prior localStorage)
16. [ ] "Rechazar todo" and "Aceptar todo" have same visual weight in banner
17. [ ] Admin Today page renders KPI cards and appointment list
18. [ ] Admin Quotes Kanban renders with correct columns

### Phase 4 — Regression tests (full happy path + edge cases)

#### Chatbot booking flow
19. [ ] Reservation golden path: service → plate → fuel → slot → name → phone → email → LOPD checkbox unchecked by default → check → confirm → "Cita registrada" confirmation
20. [ ] LOPD checkbox: confirm button disabled until checked
21. [ ] Oil change recommendation: synthetic + 50k km + 65k km → "Ya tocaba el cambio" + slot picker
22. [ ] Presupuesto flow: service type → vehicle → description → name → phone → email → LOPD → confirm
23. [ ] Presupuesto disclosure shown in booking summary: "Todo trabajo está sujeto a presupuesto previo según el RD 1457/1986"
24. [ ] Chatbot recovers from unknown input (fallback message, no crash)

#### ITV widget
25. [ ] Plate input appears after "Consultar mi ITV"
26. [ ] Date < 4 years → green, "Primera ITV"
27. [ ] Date > 10 years → red/yellow, "ITV anual"
28. [ ] Past due date → overdue indication

#### Cookie consent
29. [ ] "Aceptar todo" → `amg_cookie_consent` set in localStorage `{analytics: true, marketing: true}`
30. [ ] "Solo necesarias" → `{analytics: false, marketing: false}`
31. [ ] "Gestionar preferencias" opens panel, analíticas toggle off by default
32. [ ] Banner does NOT reappear on second visit (localStorage persists)
33. [ ] Consent record created in PocketBase `cookie_consents` collection

#### Admin dashboard
34. [ ] Appointment status change (Pendiente → En proceso → Listo) persists on page refresh
35. [ ] Customer search filters list correctly
36. [ ] Customer edit saves, consent log record created when `marketing_consent` changes
37. [ ] Quote Kanban drag-and-drop changes status (or status action button)
38. [ ] Reports page renders revenue chart for last 30 days
39. [ ] CSV download produces valid file with headers
40. [ ] Settings: saving business info reflects on admin layout

### Phase 5 — E2E cross-browser / mobile
41. [ ] Chatbot booking golden path: Firefox
42. [ ] Chatbot booking golden path: Mobile Safari (375px)
43. [ ] Cookie banner: Mobile Chrome (375px) — does not cover full screen
44. [ ] All prices readable at 375px — no truncation
45. [ ] ITV widget: Mobile Safari

### Phase 6 — Network resilience (Chromium only, CDP)
46. [ ] Chatbot: slow 3G → typing indicator shows, eventually responds
47. [ ] Chatbot: offline → graceful error message, no crash
48. [ ] Slot fetch: offline → fallback or error state, no crash

### Phase 7 — API contract tests
49. [ ] `POST /api/chat` — returns 200 with `{ message: string }` for valid payload
50. [ ] `POST /api/chat` — returns 400 for missing `message` field
51. [ ] `POST /api/appointments` (server action) — rejects missing `tenant_id`
52. [ ] `POST /actions/consent` — creates `cookie_consents` record, returns 200
53. [ ] Admin API routes return 401 when unauthenticated
54. [ ] Admin API routes return 403 when authenticated as wrong tenant

### Phase 8 — DB integration tests (Vitest + real PocketBase)
55. [ ] `getTodayAppointments()` returns only records where `tenant_id` = test tenant
56. [ ] `updateCustomer()` with `marketing_consent = true` creates `consent_log` record before updating customer
57. [ ] `updateCustomer()` cross-tenant attempt (wrong `tenant_id`) → `RecordNotFoundError`
58. [ ] `createQuote()` assigns `tenant_id` from context, not from caller input
59. [ ] `updateQuoteStatus()` cross-tenant attempt → `RecordNotFoundError`
60. [ ] `updateVehicle()` cross-tenant attempt → `RecordNotFoundError`

### Phase 9 — Performance (Lighthouse CI)
61. [ ] Homepage Lighthouse performance score ≥ 85 (desktop)
62. [ ] Homepage Lighthouse performance score ≥ 70 (mobile)
63. [ ] LCP ≤ 2.5s on simulated 4G (Lighthouse)
64. [ ] Homepage JS bundle < 150 KB gzipped (Next.js build output)

### Phase 10 — Accessibility (axe-core)
65. [ ] Homepage: zero axe critical/serious violations
66. [ ] Chatbot widget: zero axe critical/serious violations
67. [ ] Cookie banner: zero axe critical/serious violations; focus trapped in "Gestionar" panel
68. [ ] Admin login page: zero axe critical/serious violations
69. [ ] Legal pages: zero axe critical/serious violations
70. [ ] All interactive elements have accessible labels (no unlabelled buttons)

### Phase 11 — Visual regression baselines
71. [ ] Baseline screenshots captured: homepage (desktop 1280×720, mobile 375×812)
72. [ ] Baseline screenshots captured: chatbot open state
73. [ ] Baseline screenshots captured: cookie banner
74. [ ] Baseline screenshots captured: admin today page
75. [ ] CI comparison: ≤ 0.1% pixel diff allowed before flagging

## Manual Test Cases (user must perform)

The following require human judgement or cannot be automated reliably:

| TC# | Area | Steps | Expected |
|---|---|---|---|
| MTC-001 | Cookie consent UX | Visit site in private browsing, observe banner | Banner appears, no pre-ticked boxes, "Rechazar" and "Aceptar" equal size |
| MTC-002 | Cookie consent UX | Click "Gestionar preferencias", inspect toggles | All toggles off except "Estrictamente necesarias" (locked ON) |
| MTC-003 | LOPD flow | Complete chatbot booking, read consent text before checkbox | Consent text legible, checkbox unchecked |
| MTC-004 | IVA display | View service cards on real device (iOS Safari) | Prices readable, no truncation at 375px |
| MTC-005 | Warranty badge | Read badge text on each service card | "3 meses o 2.000 km de garantía en reparaciones (lo primero que ocurra)" verbatim |
| MTC-006 | Footer legal | Read footer on all pages | CIF, registration number, OCU link, warranty line all present |
| MTC-007 | Admin booking | Create appointment in admin, change status through all stages | Status persists, correct timestamps |
| MTC-008 | Admin SMS | Send SMS to a real number (if Twilio configured) | SMS received with correct content, no PII in log |
| MTC-009 | Admin reports | Download CSV, open in Excel/Sheets | Valid data, UTF-8, correct headers |
| MTC-010 | Legal pages | Read `/politica-de-privacidad` and `/politica-de-cookies` | All LOPDGDD Art. 13 sections present, AEPD link works |

## Files to Create/Touch

- `e2e/smoke.spec.ts` — AC #6–11
- `e2e/sanity.spec.ts` — AC #12–18
- `e2e/regression/chatbot.spec.ts` — AC #19–24
- `e2e/regression/itv.spec.ts` — AC #25–28
- `e2e/regression/cookie-consent.spec.ts` — AC #29–33
- `e2e/regression/admin.spec.ts` — AC #34–40
- `e2e/cross-browser.spec.ts` — AC #41–45
- `e2e/network-resilience.spec.ts` — AC #46–48 (already partially exists)
- `src/actions/admin/__tests__/appointments.test.ts` — AC #55
- `src/actions/admin/__tests__/customers.test.ts` — AC #56–57
- `src/actions/admin/__tests__/quotes.test.ts` — AC #58–60
- `src/actions/admin/__tests__/vehicles.test.ts` — AC #61
- `e2e/accessibility.spec.ts` — AC #65–70 (axe-core via `@axe-core/playwright`)
- `lighthouse.config.json` — AC #61–64
- `.github/workflows/qa.yml` — CI gate (type-check + unit + smoke E2E)
- `docs/qa-reports/` — QA run summaries per session

## Dependencies

- `@axe-core/playwright` — accessibility assertions in Playwright
- `lighthouse` + `chrome-launcher` — Lighthouse CI
- Playwright visual comparisons — built-in `expect(page).toHaveScreenshot()`

## Constraints

- **No CSS class selectors** in POM files — use `getByRole`, `getByText`, `getByLabel`, `getByPlaceholder`
- **No `page.waitForTimeout`** — use `waitForLoadState('networkidle')` or `waitForSelector`
- **DB integration tests** require a dedicated test PocketBase instance (port 8091) with seeded tenant data — never run against production
- **Visual baselines** must be committed to repo before CI comparison can run
- **Manual TCs** documented in `docs/qa-reports/manual-tc-checklist.md` for user to track

## Out of Scope

- Load/stress testing (k6 or Artillery) — Sprint 6
- Security scanning (OWASP ZAP) — FEAT-023
- Mutation testing — post-MVP
- Test case management tool (Notion/TestRail) — user decision pending
