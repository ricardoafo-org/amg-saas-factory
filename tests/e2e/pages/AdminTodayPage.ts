import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminTodayPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto('/admin/today');
  }

  /**
   * Returns all 4 KPI card locators (Citas hoy / En taller / Listas / Ingresos hoy).
   */
  getKpiCards(): Locator {
    return this.page.locator('.glass').filter({
      has: this.page.locator('p.text-2xl'),
    });
  }

  /**
   * Returns appointment card locators (glass cards inside the timeline section).
   */
  getAppointmentCards(): Locator {
    return this.page.locator('section').filter({
      has: this.page.getByText(/Citas de hoy/i),
    }).locator('.glass.rounded-xl');
  }

  /**
   * Returns the "Próximas 48h" collapsible toggle (details > summary).
   */
  getNext48hToggle(): Locator {
    return this.page.getByText(/Próximas 48h/i);
  }

  /**
   * Asserts the empty state message is visible.
   */
  async expectEmptyState() {
    await expect(
      this.page.getByText(/No hay citas programadas para hoy/i),
    ).toBeVisible({ timeout: 5000 });
  }
}
