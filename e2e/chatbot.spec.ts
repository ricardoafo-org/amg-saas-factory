import { test, expect } from '@playwright/test';

test.describe('Chatbot booking flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Iniciar conversación/i }).click();
    await expect(page.getByText(/Hola, soy el asistente/i)).toBeVisible({ timeout: 3000 });
  });

  test('welcome message appears after starting chat', async ({ page }) => {
    await expect(page.getByText(/Hola, soy el asistente/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Reservar cita/i })).toBeVisible();
  });

  test('oil change recommendation flow completes', async ({ page }) => {
    await page.getByRole('button', { name: /Calcular cambio aceite/i }).click();
    await expect(page.getByText(/tipo de aceite/i)).toBeVisible({ timeout: 2000 });

    await page.getByRole('button', { name: /Sintético/i }).click();
    await expect(page.getByText(/km.*último cambio/i)).toBeVisible({ timeout: 2000 });

    await page.getByPlaceholder(/Escribe aquí/i).fill('50000');
    await page.getByRole('button', { name: /Enviar/i }).click();
    await expect(page.getByText(/km.*actualmente/i)).toBeVisible({ timeout: 2000 });

    await page.getByPlaceholder(/Escribe aquí/i).fill('62000');
    await page.getByRole('button', { name: /Enviar/i }).click();

    // Should show km recommendation
    await expect(page.getByText(/km/i).nth(2)).toBeVisible({ timeout: 3000 });
  });

  test('ITV check renders correctly', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Consultar mi ITV/i }).click();
    await expect(page.getByPlaceholder(/1234 ABC/i)).toBeVisible();
  });

  test('LOPD consent cannot be submitted unchecked', async ({ page }) => {
    // Navigate through booking flow to LOPD step
    await page.getByRole('button', { name: /Reservar cita/i }).click();
    await page.getByRole('button', { name: /Cambio de aceite/i }).click();

    await page.getByPlaceholder(/Escribe aquí/i).fill('1234ABC');
    await page.keyboard.press('Enter');

    await page.getByRole('button', { name: /Gasolina/i }).click();

    await page.getByPlaceholder(/Escribe aquí/i).fill('15/06/2025');
    await page.keyboard.press('Enter');

    await page.getByPlaceholder(/Escribe aquí/i).fill('Test Usuario');
    await page.keyboard.press('Enter');

    await page.getByPlaceholder(/Escribe aquí/i).fill('+34 600 000 000');
    await page.keyboard.press('Enter');

    await page.getByPlaceholder(/Escribe aquí/i).fill('test@example.com');
    await page.keyboard.press('Enter');

    // LOPD step — confirm button should be disabled
    const confirmBtn = page.getByRole('button', { name: /Confirmar y continuar/i });
    await expect(confirmBtn).toBeDisabled({ timeout: 3000 });
  });
});
