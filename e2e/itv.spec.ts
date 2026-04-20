import { test, expect } from '@playwright/test';
import { ItvPage } from './pages/ItvPage';

test.describe('ITV Countdown widget', () => {
  let itv: ItvPage;

  test.beforeEach(async ({ page }) => {
    itv = new ItvPage(page);
    await page.goto('/');
  });

  test('shows calculate button initially', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Calcular mi ITV/i })).toBeVisible();
  });

  test('date input appears after clicking calculate', async ({ page }) => {
    await itv.openWidget();
    await itv.waitForDateInput();
    await expect(itv.getDateInput()).toBeVisible();
  });

  test('shows guidance card with registration date hint', async ({ page }) => {
    await itv.openWidget();
    await expect(page.getByText(/primera matriculación/i)).toBeVisible({ timeout: 4000 });
  });

  test('calculate button is disabled when no date entered', async ({ page }) => {
    await itv.openWidget();
    await itv.waitForDateInput();
    // Calcular button should be disabled when dateInput is empty
    await expect(page.getByRole('button', { name: /Calcular/i })).toBeDisabled();
  });

  test('shows result for a vehicle older than 10 years (ITV anual)', async ({ page }) => {
    await itv.openWidget();
    await itv.waitForDateInput();
    await itv.enterDate('2012-03-15');
    await itv.clickCalculate();

    await expect(page.getByText(/ITV anual/i)).toBeVisible({ timeout: 3000 });
  });

  test('shows result for a vehicle under 4 years (Primera ITV)', async ({ page }) => {
    await itv.openWidget();
    await itv.waitForDateInput();

    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    await itv.enterDate(twoYearsAgo.toISOString().split('T')[0]);
    await itv.clickCalculate();

    await expect(page.getByText(/Primera ITV/i)).toBeVisible({ timeout: 3000 });
  });

  test('shows bienal result for 5-year-old vehicle', async ({ page }) => {
    await itv.openWidget();
    await itv.waitForDateInput();

    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    await itv.enterDate(fiveYearsAgo.toISOString().split('T')[0]);
    await itv.clickCalculate();

    await expect(page.getByText(/ITV bienal/i)).toBeVisible({ timeout: 3000 });
  });

  test('getResultType returns correct type for old vehicle', async ({ page }) => {
    await itv.openWidget();
    await itv.waitForDateInput();
    await itv.enterDate('2010-01-01');
    await itv.clickCalculate();

    await expect(page.getByText(/ITV anual/i)).toBeVisible({ timeout: 3000 });
    const type = await itv.getResultType();
    expect(['anual', 'anual_overdue']).toContain(type);
  });

  test('reset button returns widget to idle state', async ({ page }) => {
    await itv.openWidget();
    await itv.waitForDateInput();
    await itv.enterDate('2012-03-15');
    await itv.clickCalculate();
    await expect(page.getByText(/ITV anual/i)).toBeVisible({ timeout: 3000 });

    await page.getByRole('button', { name: /Resetear/i }).click();
    await expect(page.getByRole('button', { name: /Calcular mi ITV/i })).toBeVisible({ timeout: 3000 });
  });
});
