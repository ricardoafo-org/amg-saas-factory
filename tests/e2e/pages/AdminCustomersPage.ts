import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminCustomersPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto('/admin/customers');
  }

  /**
   * Types a search query into the search input.
   */
  async search(query: string) {
    const input = this.page.getByPlaceholder(/Buscar por nombre o email/i);
    await input.fill(query);
    await this.page.keyboard.press('Enter');
  }

  /**
   * Returns table row locators (tbody tr elements).
   */
  getRows(): Locator {
    return this.page.getByRole('row').filter({
      hasNot: this.page.getByRole('columnheader'),
    });
  }
}
