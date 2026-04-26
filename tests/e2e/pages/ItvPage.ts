import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ItvPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  getPlateInput(): Locator {
    return this.page.locator('#itv-plate');
  }

  getDateInput(): Locator {
    return this.page.locator('#itv-last-date');
  }

  getResultBox(): Locator {
    return this.page.locator('.itv-result').first();
  }

  getExpiredBox(): Locator {
    return this.page.locator('.itv-result--expired');
  }

  async enterDate(iso: string) {
    await this.getDateInput().fill(iso);
  }
}
