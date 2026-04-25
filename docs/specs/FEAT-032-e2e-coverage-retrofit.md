# FEAT-032 — E2E Coverage Retrofit

**Sprint:** 8 — Design Alignment + UX Polish
**Priority:** High (regression-class prevention)
**Branch:** `feature/FEAT-032-e2e-retrofit`
**Author:** Claude (orchestrator) · 2026-04-25

## 1. Problem

BUG-007 (ServiceGrid IDs vs chatbot flow mismatch) shipped through 3 PRs (FEAT-028, FEAT-029, FEAT-033) without anyone catching it. Manual testing found it after deploy. Root cause is **shallow test coverage of cross-component contracts**:

| Test | What it actually tests | Gap |
|---|---|---|
| `e2e/chatbot-preselect.spec.ts` | Manually dispatches `amg:open-chat` event with `cambio-aceite` | Doesn't click the real button. Tests 1 of 6 services. |
| `e2e/chatbot-booking-golden-path.spec.ts` | Welcome → Reservar → flow | Bypasses ServiceGrid entirely |
| Unit tests | Per-component | None assert ServiceGrid IDs ⊆ flow.options[].value |

Three deeper symptoms:

1. **No "click every CTA"** test for any surface — service cards, footer CTAs, hero buttons.
2. **No data-contract tests** between hardcoded constants and the JSON flow file. Anything in `clients/talleres-amg/*.json` could drift from code with no signal.
3. **Mocked transport in E2E** — `chatbot-preselect.spec.ts` calls `page.evaluate` to fire the event directly, bypassing the actual click handler. Same anti-pattern as mocking the DB in integration tests.

## 2. Goals

1. Every public CTA on every public surface gets a Playwright test that **clicks the real element** and asserts the expected next state.
2. Every cross-component contract between hardcoded constants and JSON config files is asserted by a fast unit test (`npm test`, not Playwright).
3. The booking happy-path is covered for **all 6 services**, not just `cambio-aceite`.
4. Cookie banner blocking behavior is tested — banner does NOT block site usage (per AEPD 2023 / LSSI-CE).
5. Tests run in a parallel-safe way; no flake on CI.

## 3. Non-goals

- Testing PocketBase admin internal flows beyond what's already covered.
- Visual regression testing — separate concern, has its own skill (`qa-testing-patterns`).
- Mobile-specific tests beyond `e2e/mobile.spec.ts` — keep the existing scope.
- 100% coverage as a metric — we target **paths** not lines. A path-shallow test on a critical user flow > 100% line coverage of trivial code.

## 4. Test additions

### A. Service card click matrix (`e2e/services-ctas.spec.ts` — NEW)

For each of the 6 services in `BUNDLE_SERVICES`:

```ts
const SERVICES = [
  { id: 'cambio-aceite', label: 'Cambio de aceite y filtros' },
  { id: 'frenos',        label: 'Revisión de frenos' },
  { id: 'pre-itv',       label: 'Pre-revisión ITV' },
  { id: 'neumaticos',    label: 'Neumáticos y equilibrado' },
  { id: 'aire-acondicionado', label: 'Aire acondicionado' },
  { id: 'diagnostico-obd', label: 'Diagnóstico OBD' },
];

for (const svc of SERVICES) {
  test(`Pedir ${svc.label} opens chat with service preselected`, async ({ page }) => {
    await page.goto('/');
    // Click the actual button, not page.evaluate
    await page.getByRole('button', { name: new RegExp(`Reservar ${svc.label}`, 'i') }).click();
    const dialog = page.getByRole('dialog', { name: /Asistente de reservas/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(`Vamos con ${svc.label}`)).toBeVisible();
    // Selected chip should appear with primary border
    await expect(dialog.getByRole('button', { name: new RegExp(svc.label, 'i') })).toHaveClass(/border-primary/);
  });
}
```

### B. Hero + footer + visit-section CTA tests (`e2e/global-ctas.spec.ts` — NEW)

- Hero "Reservar cita" → opens chat with no preselected service (welcome menu)
- Hero secondary CTA (if any) → expected target
- Footer phone link → `tel:` href
- Footer email link → `mailto:` href
- Visit-section "Cómo llegar" → opens Google Maps (assert `target=_blank` + correct href)
- Visit-section "Llamar ahora" → `tel:` link

### C. Cookie banner non-blocking behavior (`e2e/cookie-banner.spec.ts` — NEW)

- On first visit, banner is visible, but main page is fully scrollable
- Click anywhere on the page (not banner) → click registers, no banner-imposed block
- "Aceptar todo" → banner dismisses, click logs to `cookie_consents` collection
- "Solo necesarias" → banner dismisses, no analytics flag set
- "Gestionar preferencias" → toggles panel, individual switches work
- Reload after consent → banner does NOT reappear (localStorage persisted)
- Programmatic clear of localStorage → banner reappears on next reload

### D. Chatbot golden path × all services (`e2e/chatbot-multi-service-flow.spec.ts` — NEW)

For 2 representative services (one fast, one with NLP fallback), complete the full flow: open → service preselect → matrícula → fuel → slot pick → name → email → phone → consent → confirm → assert customer + appointment created in PB.

Don't run all 6 in E2E — that's 6× slow. Two coverage points are enough since the per-service contract test (4D) already proves all 6 enter the flow.

### E. Contract tests (unit, fast — `src/**/__tests__/*-contract.test.ts`)

Land via BUG-007 fix already, but extend in this PR:

- `service-flow-contract.test.ts` — BUNDLE_SERVICES IDs ⊆ flow `ask_service` options
- `flow-node-references.test.ts` — every `next` value in flow JSON points to an existing node
- `flow-action-references.test.ts` — every `action` value matches a known action in `ChatEngine.tsx` (`save_appointment`, `save_quote`, `calc_oil_change`, `load_slots`, `collect_lopd_consent`)
- `chatbot-collect-vars.test.ts` — every `collect` field name matches a variable consumed in `saveAppointment` or `saveQuoteRequest`
- `tenant-config-keys.test.ts` — every `{{config.X}}` token in flow JSON has a corresponding `key` in the config seed/migration

### F. Network resilience (`e2e/network-resilience.spec.ts` — EXTEND existing)

- `getAvailableSlots` 500 → cached banner shows (already tested)
- `saveAppointment` 500 → "hubo un error" message renders (NEW)
- Resend `RESEND_API_KEY` missing → booking still completes, just no email (NEW — verify in unit, not E2E)

## 5. Files touched

| File | Change |
|---|---|
| `e2e/services-ctas.spec.ts` | NEW |
| `e2e/global-ctas.spec.ts` | NEW |
| `e2e/cookie-banner.spec.ts` | NEW |
| `e2e/chatbot-multi-service-flow.spec.ts` | NEW |
| `src/core/components/__tests__/flow-node-references.test.ts` | NEW |
| `src/core/components/__tests__/flow-action-references.test.ts` | NEW |
| `src/core/components/__tests__/chatbot-collect-vars.test.ts` | NEW |
| `src/core/components/__tests__/tenant-config-keys.test.ts` | NEW |
| `e2e/network-resilience.spec.ts` | extend |
| `playwright.config.ts` | maybe bump default timeout / workers if flake appears |

## 6. CI integration

- Unit tests run on every push (already configured)
- E2E suite runs on PRs touching `src/**`, `clients/**`, `e2e/**`
- New required check: `npm test` → contract tests in this matrix
- Don't block on E2E for docs-only PRs

## 7. Quality gates

1. `npm run type-check` — zero
2. `npm test` — full suite green, +5 new contract tests minimum
3. `npm run e2e` — green locally
4. CI pipeline runs both gates on the PR
5. PR opened atomically with metadata.

## 8. Out-of-scope follow-ups

- Visual regression baseline against bundle (separate spec)
- Performance budgets (LCP, INP) — separate spec
- A11y audit pass with axe-playwright — separate spec
- Load tests (covered in FEAT-034)
