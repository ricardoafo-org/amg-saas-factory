import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminLoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto('/admin/login');
  }

  async login(email: string, password: string) {
    await this.page.getByLabel(/Email/i).fill(email);
    await this.page.getByLabel(/Contraseña/i).fill(password);
    await this.page.getByRole('button', { name: /Iniciar sesión/i }).click();
  }

  async expectError() {
    await expect(this.page.getByRole('alert')).toBeVisible({ timeout: 5000 });
  }
}
