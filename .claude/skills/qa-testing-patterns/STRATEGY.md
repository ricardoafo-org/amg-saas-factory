---
name: Testing Architecture & Patterns
description: QA best practices for E2E, API, DB, and unit tests before Sprint 4
type: project
---

## Testing Pyramid & Patterns

### 1. Unit Tests (Vitest) — Pure Logic
**Pattern: Arrange-Act-Assert with fixtures**

```ts
// src/lib/chatbot/oil-calc.test.ts
import { describe, it, expect } from 'vitest';
import { calculateOilChange } from './oil-calc';

describe('Oil change calculator', () => {
  it('recommends oil change at correct km interval', () => {
    const result = calculateOilChange({
      lastChangeKm: 50000,
      currentKm: 62000,
      oilType: 'synthetic',
    });
    expect(result.nextChangeKm).toBe(66000); // synthetic every 10k
  });
});
```

**Scope:** Pure functions (calculations, formatters, validators), not I/O

---

### 2. Integration Tests (Vitest + PocketBase) — DB + Business Logic
**Pattern: Real PocketBase test instance + seed data + cleanup**

```ts
// src/actions/slots.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getPb } from '@/lib/pb';
import { getAvailableSlots } from './slots';

describe('getAvailableSlots', () => {
  let pb: PocketBase;

  beforeEach(async () => {
    pb = await initTestPb(); // spin up local PB with test data
    await seedTestData(pb, {
      tenantId: 'test-tenant-1',
      slots: [
        { date: '2026-04-20', start: '09:00', capacity: 5, booked: 3 },
        { date: '2026-04-20', start: '14:00', capacity: 5, booked: 5 },
      ],
    });
  });

  afterEach(async () => {
    await cleanupTestData(pb);
  });

  it('returns slots with available spots', async () => {
    const slots = await getAvailableSlots('test-tenant-1', '2026-04-20');
    expect(slots).toHaveLength(1);
    expect(slots[0].spotsLeft).toBe(2);
  });

  it('filters by tenant_id (cross-tenant isolation)', async () => {
    const otherSlots = await getAvailableSlots('other-tenant', '2026-04-20');
    expect(otherSlots).toHaveLength(0);
  });
});
```

**Scope:** Server actions, database queries, auth logic. Real PocketBase, not mocks.

---

### 3. API Contract Tests (Vitest) — PB Schema Versioning
**Pattern: TypeScript types ↔ PocketBase schema sync**

```ts
// src/types/pb.test.ts
import { describe, it, expect } from 'vitest';
import { getPb } from '@/lib/pb';

describe('PocketBase schema contracts', () => {
  it('appointments collection has required fields', async () => {
    const pb = await getPb();
    const schema = await pb.collections.getOne('pbc_1037645436');
    
    const requiredFields = ['tenant_id', 'customer_email', 'scheduled_at', 'status'];
    requiredFields.forEach(field => {
      expect(schema.fields.map(f => f.name)).toContain(field);
    });
  });

  it('tenant_id is indexed for filtering', async () => {
    const pb = await getPb();
    const schema = await pb.collections.getOne('pbc_1037645436');
    expect(schema.indexes).toContain(
      expect.stringContaining('tenant_id')
    );
  });
});
```

---

### 4. E2E Tests (Playwright) — Full User Journeys
**Pattern: Page Object Model + Test Fixtures**

#### Page Objects (reusable abstractions)
```ts
// e2e/pages/ChatbotPage.ts
export class ChatbotPage {
  constructor(private page: Page) {}

  async startChat() {
    await this.page.getByRole('button', { name: /Iniciar conversación/i }).click();
    await this.page.getByText(/Hola, soy el asistente/i).waitFor();
  }

  async selectService(serviceName: string) {
    await this.page.getByRole('button', { name: new RegExp(serviceName) }).click();
  }

  async fillOilChangeFlow(oilType: string, lastKm: string, currentKm: string) {
    await this.page.getByRole('button', { name: new RegExp(oilType) }).click();
    await this.page.getByPlaceholder(/Escribe aquí/i).fill(lastKm);
    await this.page.keyboard.press('Enter');
    await this.page.getByPlaceholder(/Escribe aquí/i).fill(currentKm);
    await this.page.keyboard.press('Enter');
  }

  async expectRecommendation(text: RegExp) {
    await expect(this.page.getByText(text)).toBeVisible({ timeout: 3000 });
  }
}
```

#### Test Fixtures (data + setup)
```ts
// e2e/fixtures/chatbot.fixture.ts
export const chatbotFixture = {
  oilChangeBooking: {
    service: 'Cambio de aceite',
    oilType: 'Sintético',
    lastKm: '50000',
    currentKm: '62000',
    plate: '1234ABC',
    date: '2026-04-25',
  },
};
```

#### Tests using patterns
```ts
// e2e/chatbot-booking.spec.ts
import { test, expect } from '@playwright/test';
import { ChatbotPage } from './pages/ChatbotPage';
import { chatbotFixture } from './fixtures/chatbot.fixture';

test.describe('Chatbot booking flow', () => {
  let chatbot: ChatbotPage;

  test.beforeEach(async ({ page }) => {
    chatbot = new ChatbotPage(page);
    await page.goto('/');
    await chatbot.startChat();
  });

  test('oil change booking completes end-to-end', async () => {
    const booking = chatbotFixture.oilChangeBooking;
    await chatbot.selectService(booking.service);
    await chatbot.fillOilChangeFlow(booking.oilType, booking.lastKm, booking.currentKm);
    await chatbot.expectRecommendation(/km.*próximo cambio/i);
  });
});
```

---

### 5. Network Resilience Tests (Playwright) — Poor Connections
**Pattern: Throttling profiles + graceful degradation checks**

```ts
// e2e/network-resilience.spec.ts
import { test, expect, devices } from '@playwright/test';

test.describe('Network resilience', () => {
  test('booking form retries on 3G slow-down', async ({ page }) => {
    // Simulate 3G (1.6 Mbps down, 750 Kbps up, 150ms latency)
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 150);
    });

    await page.goto('/');
    await page.getByRole('button', { name: /Reservar/ }).click();
    
    // Should show loading state, not error
    await expect(page.getByText(/Cargando/i)).toBeVisible();
    
    // After retry, should eventually load
    await expect(page.getByText(/Selecciona un servicio/i)).toBeVisible({ timeout: 10000 });
  });

  test('offline mode shows cached slots', async ({ page, context }) => {
    // Visit once to cache
    await page.goto('/');
    
    // Go offline
    await context.setOffline(true);
    await page.reload();
    
    // Should still show previous slots from localStorage
    await expect(page.getByText(/Próximo hueco/i)).toBeVisible();
  });
});
```

---

### 6. Visual Regression Tests (Playwright Screenshots)
**Pattern: Baseline → diffs on changes**

```ts
// e2e/visual.spec.ts
test.describe('Visual regression', () => {
  test('service card layout on mobile', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone
    await expect(page).toHaveScreenshot('service-cards-mobile.png');
  });

  test('email template renders correctly', async ({ page }) => {
    await page.goto('/admin/email-preview/appointment-confirmation');
    await expect(page).toHaveScreenshot('email-appointment.png');
  });
});
```

---

## Test Data & Environment

### Seed Data Pattern
```ts
// e2e/helpers/seed.ts
export async function seedTestTenant(pb: PocketBase, name: string) {
  const tenant = await pb.collection('tenants').create({
    name,
    slug: `test-${Date.now()}`,
    plan: 'pro',
    active: true,
  });

  const slots = await pb.collection('availability_slots').create({
    tenant_id: tenant.id,
    slot_date: tomorrow().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '18:00',
    capacity: 5,
    booked: 0,
  });

  return { tenant, slots };
}
```

### Cleanup Pattern
```ts
// e2e/helpers/cleanup.ts
export async function cleanupTestData(pb: PocketBase, tenantId: string) {
  const collections = ['appointments', 'availability_slots', 'quotes', 'consent_log'];
  for (const col of collections) {
    await pb.collection(col).delete(/* batch delete where tenant_id = tenantId */);
  }
}
```

---

## CI/CD Integration

```yaml
# .github/workflows/test.yml
- Run unit tests (Vitest)
- Run integration tests against test PocketBase
- Run E2E on Desktop + Mobile viewports
- Lighthouse CI (LCP threshold 2.5s on 3G)
- Visual regression (compare against main branch)
- Network resilience (3G throttling profile)
- Coverage reports to Codecov
```

---

## Ownership & Maintenance

- **Unit/Integration:** Developer writes before merging (TDD)
- **E2E:** QA engineer maintains page objects + fixtures
- **Network resilience:** Joint (infra + QA)
- **Visual regression:** Design system owner approves baselines

---

## Metrics

- **Coverage target:** 70% lines, 100% business logic paths
- **E2E flakiness:** < 2% retry rate
- **Test suite speed:** < 5 minutes on CI
- **Feedback loop:** Developers see failures in < 2 min locally
