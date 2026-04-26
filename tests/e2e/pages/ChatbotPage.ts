import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ChatbotPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Opens the chatbot drawer and waits for the first bot message to appear.
   * The "Iniciar conversación" button is inside the chat panel — we first
   * need to open the panel via the FAB (or data-action="open-chat" buttons).
   */
  async open() {
    // Click FAB if panel is not yet open
    const startBtn = this.page.getByRole('button', { name: /Iniciar conversación/i });
    const fabBtn = this.page.getByRole('button', { name: /Abrir asistente de reservas/i });

    // If the FAB is visible the panel is closed — open it first
    if (await fabBtn.isVisible().catch(() => false)) {
      await fabBtn.click();
    }

    // Now click "Iniciar conversación"
    await startBtn.waitFor({ timeout: 5000 });
    await startBtn.click();
  }

  /**
   * Waits for a new bot message element to appear in the message list.
   * We look for any visible bot message bubble (the rounded div next to Bot icon).
   * Do NOT wait for the typing indicator to disappear — it may always be present.
   */
  async waitForBotMessage(timeout = 5000) {
    // Bot messages are divs with specific class combination; wait for last message
    await this.page
      .locator('[role="dialog"]')
      .getByText(/./i)
      .last()
      .waitFor({ timeout });
  }

  /**
   * Clicks a quick-reply option button matching the given label.
   */
  async clickOption(label: string | RegExp) {
    const btn = this.page.getByRole('button', { name: label });
    await btn.waitFor({ timeout: 5000 });
    await btn.click();
  }

  /**
   * Types a message into the text input and sends it.
   */
  async typeMessage(text: string) {
    const input = this.page.getByPlaceholder(/Escribe aquí/i);
    await input.waitFor({ timeout: 5000 });
    await input.fill(text);
    await this.page.keyboard.press('Enter');
  }

  /**
   * Returns the text of the last visible bot message.
   * Bot messages sit adjacent to the Bot SVG icon — we locate them by
   * finding all non-typing-indicator children of the scroll container
   * that contain substantive text.
   */
  async getLastBotMessage(): Promise<string> {
    // The bot message text is the only text sibling of the Bot icon
    // in each message row. We find all bot message rows by the Bot
    // icon's aria context and read the sibling text.
    const msgRows = this.page.locator('svg[class*="Bot"], [data-lucide="bot"]')
      .locator('..')     // icon container div
      .locator('..');    // message row div
    const count = await msgRows.count();
    if (count === 0) return '';
    return (await msgRows.nth(count - 1).textContent()) ?? '';
  }

  /**
   * Asserts that a bot message matching the pattern is visible.
   */
  async expectMessage(pattern: RegExp) {
    await expect(this.page.getByText(pattern)).toBeVisible({ timeout: 5000 });
  }

  /**
   * Fills the contact step fields (name, phone, email) in sequence.
   * Each field is collected one at a time by the chatbot engine.
   */
  async fillBookingContact(name: string, phone: string, email: string) {
    // Name
    await this.typeMessage(name);
    // Phone — wait for prompt
    await this.page.getByPlaceholder(/Escribe aquí/i).waitFor({ timeout: 5000 });
    await this.typeMessage(phone);
    // Email — wait for prompt
    await this.page.getByPlaceholder(/Escribe aquí/i).waitFor({ timeout: 5000 });
    await this.typeMessage(email);
  }

  /**
   * Returns the LOPD consent checkbox locator.
   * The checkbox (sr-only) is inside the label that contains "Política de Privacidad".
   * Scoping to that label avoids matching service-selection checkboxes.
   */
  getConsentCheckbox(): Locator {
    return this.page
      .locator('label', { hasText: /Política de Privacidad/i })
      .locator('input[type="checkbox"]');
  }

  /**
   * Returns the "Confirmar y continuar" button locator.
   */
  getConfirmButton(): Locator {
    return this.page.getByRole('button', { name: /Confirmar y continuar/i });
  }
}
