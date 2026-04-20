import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open() {
    await this.goto('/');
  }

  getServiceCards(): Locator {
    // Service grid section — each card contains a service name heading
    return this.page.locator('#servicios').getByRole('heading');
  }

  async clickChatbot() {
    // The floating FAB button (aria-label="Abrir asistente de reservas")
    await this.page
      .getByRole('button', { name: /Abrir asistente de reservas/i })
      .click();
  }

  async clickItvConsult() {
    // The ITV section CTA
    await this.page
      .getByRole('button', { name: /Calcular mi ITV/i })
      .click();
  }

  getWhatsappLink(): Locator {
    return this.page.getByRole('link', { name: /WhatsApp/i });
  }

  getPhoneLink(): Locator {
    return this.page.getByRole('link', { name: /968/ });
  }
}
