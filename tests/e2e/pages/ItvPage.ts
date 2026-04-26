import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ItvPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async openWidget() {
    await this.page.getByRole('button', { name: /Calcular mi ITV/i }).click();
  }

  getPlateInput(): Locator {
    return this.page.getByPlaceholder('1234 ABC');
  }

  async enterPlate(plate: string) {
    await this.getPlateInput().fill(plate);
    await this.page.keyboard.press('Enter');
  }

  async waitForDateInput() {
    await this.page.locator('input[type="date"]').waitFor({ timeout: 5000 });
  }

  getDateInput(): Locator {
    return this.page.locator('input[type="date"]');
  }

  async enterDate(dateStr: string) {
    await this.getDateInput().fill(dateStr);
  }

  async clickCalculate() {
    await this.page.getByRole('button', { name: /Calcular/i }).click();
  }

  async getResultText(): Promise<string> {
    // The result section shows one of: "ITV vencida", "hasta la próxima ITV"
    // and the schedule label containing "ITV anual", "ITV bienal", "Primera ITV"
    const el = this.page.getByText(/ITV (anual|bienal|vencida)|Primera ITV/i).first();
    return (await el.textContent()) ?? '';
  }

  async getResultType(): Promise<'primera' | 'bienal' | 'anual' | 'anual_overdue'> {
    const isOverdue = await this.page.getByText(/ITV vencida/i).isVisible().catch(() => false);
    if (isOverdue) return 'anual_overdue';
    const label = this.page.getByText(/ITV anual|ITV bienal|Primera ITV/i).first();
    const text = (await label.textContent() ?? '').toLowerCase();
    if (text.includes('primera')) return 'primera';
    if (text.includes('bienal')) return 'bienal';
    return 'anual';
  }
}
