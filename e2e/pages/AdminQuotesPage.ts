import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminQuotesPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto('/admin/quotes');
  }

  /**
   * Returns all Kanban column header locators.
   * The QuoteKanban renders 4 columns: Pendiente, Enviado, Aprobado, Rechazado.
   */
  getKanbanColumns(): Locator {
    return this.page.getByRole('heading', {
      name: /Pendiente|Enviado|Aprobado|Rechazado/i,
    });
  }

  async clickNewQuote() {
    await this.page.getByRole('link', { name: /Nuevo presupuesto/i }).click();
  }

  /**
   * Returns quote card locators within the Kanban board.
   */
  getQuoteCards(): Locator {
    return this.page.locator('[data-quote-card]');
  }
}
