import { test, expect } from '@playwright/test';

test.describe('ITV Countdown widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows consult button initially', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Consultar mi ITV/i })).toBeVisible();
  });

  test('plate input appears after clicking consult', async ({ page }) => {
    await page.getByRole('button', { name: /Consultar mi ITV/i }).click();
    await expect(page.getByPlaceholder('1234 ABC')).toBeVisible();
  });

  test('shows lookup spinner after entering plate', async ({ page }) => {
    await page.getByRole('button', { name: /Consultar mi ITV/i }).click();
    await page.getByPlaceholder('1234 ABC').fill('1234ABC');
    await page.locator('button[class*="rounded"]').filter({ hasText: '' }).last().click();
    await expect(page.getByText(/Consultando registro DGT/i)).toBeVisible();
  });

  test('falls back to date input after lookup', async ({ page }) => {
    await page.getByRole('button', { name: /Consultar mi ITV/i }).click();
    await page.getByPlaceholder('1234 ABC').fill('1234ABC');
    // Submit
    await page.keyboard.press('Enter');
    // After 2.5s, date input should appear
    await expect(page.getByText(/primera matriculación/i)).toBeVisible({ timeout: 4000 });
    await expect(page.locator('input[type="date"]')).toBeVisible();
  });

  test('shows result for a vehicle older than 10 years', async ({ page }) => {
    await page.getByRole('button', { name: /Consultar mi ITV/i }).click();
    await page.getByPlaceholder('1234 ABC').fill('5678XYZ');
    await page.keyboard.press('Enter');

    await page.locator('input[type="date"]').waitFor({ timeout: 4000 });
    await page.locator('input[type="date"]').fill('2012-03-15');
    await page.getByRole('button', { name: /Calcular/i }).click();

    await expect(page.getByText(/ITV anual/i)).toBeVisible({ timeout: 2000 });
  });

  test('shows result for a vehicle under 4 years', async ({ page }) => {
    await page.getByRole('button', { name: /Consultar mi ITV/i }).click();
    await page.getByPlaceholder('1234 ABC').fill('9999ZZZ');
    await page.keyboard.press('Enter');

    await page.locator('input[type="date"]').waitFor({ timeout: 4000 });
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    await page.locator('input[type="date"]').fill(twoYearsAgo.toISOString().split('T')[0]);
    await page.getByRole('button', { name: /Calcular/i }).click();

    await expect(page.getByText(/Primera ITV/i)).toBeVisible({ timeout: 2000 });
  });
});
