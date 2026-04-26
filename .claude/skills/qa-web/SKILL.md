# QA Skill — Web Testing

Domain: Playwright E2E and manual browser testing for the AMG SaaS Factory.

---

## Architecture context

- **Stack**: Next.js 15 App Router + PocketBase at :8090
- **E2E tool**: Playwright (`tests/e2e/*.spec.ts`)
- **Unit tool**: Vitest (`src/**/__tests__/**`)
- **Dev server**: must be running at `:3000`; PocketBase at `:8090`

Check both are live before running E2E:
```sh
curl -s http://localhost:3000/ -o /dev/null -w "%{http_code}"   # expect 200
curl -s http://127.0.0.1:8090/api/health | grep -q '"code":200' && echo ok
```

---

## Running tests

```sh
# Unit tests (fast, no server required)
npm test

# Full type check
npm run type-check

# E2E — all suites
npx playwright test

# E2E — single file
npx playwright test tests/e2e/chatbot.spec.ts

# E2E — headed (see browser)
npx playwright test --headed

# E2E — UI mode (interactive)
npx playwright test --ui
```

---

## Critical paths to test every release

### 1. Homepage integrity
- Title = "Talleres AMG"
- Logo renders (not broken img)
- 5 service cards visible
- Stats bar: 4 metrics visible
- WhatsApp link → `wa.me/34604273678`
- Phone link → `tel:+34968000000`

### 2. ITV widget full flow
- Click "Consultar mi ITV" → plate input appears
- Enter plate → spinner for ~2s → date input appears with DGT note
- Enter date < 4 years ago → green result, "Primera ITV" label
- Enter date > 10 years ago → red/yellow result, "ITV anual" label, overdue if past due
- Enter today's date → "¡Hoy!" result

### 3. Chatbot booking (golden path)
- Start → "Reservar cita" → service selection
- Select service → matricula input
- Enter plate → fuel type options
- Select fuel → date/slot selection (should show available slots)
- Select slot → name input → phone → email → LOPD consent
- LOPD checkbox unchecked by default — confirm button disabled
- Check checkbox → confirm → "Cita registrada" confirmation message
- Check PocketBase: appointment record created, consent_log record created

### 4. Oil change recommendation
- Start → "Calcular cambio aceite"
- Select "Sintético" → enter 50000 km → enter 65000 km
- Expect: "Ya tocaba el cambio" + slot picker appears
- Select slot → proceed to name/phone/email/LOPD

### 5. Mobile viewport (375px)
- All sections readable, no horizontal overflow
- Chatbot slot picker wraps cleanly
- Buttons min-height 44px (iOS tap target)

---

## Known Playwright gotchas — App Router

- Server Actions show as fetch requests, not page navigations
- After chatbot action (save), wait for `getByText(/cita.*registrada/i)` not navigation
- Typing indicator is `animate-pulse` — don't wait for it to disappear, it's always present during bot typing
- `waitForLoadState('networkidle')` needed after slot fetch

---

## Severity classification

| Severity | Examples |
|---|---|
| critical | PII logged, LOPD checkbox pre-ticked, appointment saved without consent, data loss |
| high | Feature path broken (can't complete booking), JS crash, type errors in build |
| medium | UI element missing or misaligned on key path, wrong price displayed |
| low | Cosmetic, typo, animation jitter, non-blocking console warning |
