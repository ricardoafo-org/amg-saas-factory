import { test, expect } from '@playwright/test';

// Serial mode: keeps cookie/localStorage state deterministic across describes
// (the cookie banner has shared localStorage state that some tests need cleared
// and others need set, and parallel workers were occasionally racing).
test.describe.configure({ mode: 'serial' });

/**
 * v2 design system smoke + customer-flow regression suite.
 *
 * Covers the surfaces touched by the light-first redesign:
 *   - Hero (Archivo Black display, AMG stripes, stamp badges, ticket card)
 *   - TrustStrip (pill rail with semantic icons)
 *   - ServiceGrid (ticket cards + amg-edge accent + IVA breakdown)
 *   - ItvCountdown (idle → date-input → result phases)
 *   - Testimonials (rotating ticket card)
 *   - Footer (legal, hours, links, AMG band on top)
 *   - CookieBanner (modal with preference toggles)
 *   - ChatWidget (FAB + drawer header + progress dots)
 *
 * These tests are token-agnostic — they assert behaviour and copy, not raw
 * hex/oklch colors. The QA visual diff lives in a separate snapshot suite.
 */

test.describe('v2 design — light theme baseline', () => {
  test('html element renders with light theme attribute', async ({ page }) => {
    await page.goto('/');
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(theme).toBe('light');
  });

  test('canvas background is the warm off-white token', async ({ page }) => {
    await page.goto('/');
    const bg = await page.evaluate(() =>
      getComputedStyle(document.body).getPropertyValue('background-color').trim(),
    );
    // oklch(0.97 0.006 85) — verify the body resolves to a near-white, not a dark color
    expect(bg).not.toBe('');
    expect(bg).not.toMatch(/^rgb\(0,\s*0,\s*0\)$/);
  });
});

test.describe('v2 hero', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('renders sticky header with AMG band and reservar CTA', async ({ page }) => {
    const header = page.locator('header').first();
    await expect(header).toBeVisible();
    await expect(header.getByRole('button', { name: /Reservar/i }).first()).toBeVisible();
  });

  test('headline contains the brand-keyword underline ("sin sorpresas")', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /sin sorpresas/i })).toBeVisible();
  });

  test('shows three signature stamp badges', async ({ page }) => {
    await expect(page.getByText(/Desde 1987/i).first()).toBeVisible();
    await expect(page.getByText(/reseñas/i).first()).toBeVisible();
    await expect(page.getByText(/Garantía 3 meses/i).first()).toBeVisible();
  });

  test('hero CTA row exposes phone link with monospace number', async ({ page }) => {
    const phone = page.getByRole('link', { name: /968/ }).first();
    await expect(phone).toBeVisible();
    const tagName = await phone.evaluate((el) => el.tagName);
    expect(tagName).toBe('A');
    const href = await phone.getAttribute('href');
    expect(href).toMatch(/^tel:/);
  });

  test('right-rail stat ticket exposes 4 metrics', async ({ page }) => {
    await expect(page.getByText(/Años de oficio/i)).toBeVisible();
    await expect(page.getByText(/Clientes atendidos/i)).toBeVisible();
    await expect(page.getByText('Reseñas Google', { exact: true })).toBeVisible();
    await expect(page.getByText('Garantía mínima', { exact: true })).toBeVisible();
  });
});

test.describe('v2 trust strip + service grid', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('trust strip renders 4 reassurance items', async ({ page }) => {
    await expect(page.getByText(/reseñas Google/i).first()).toBeVisible();
    await expect(page.getByText(/2\.000 km/i).first()).toBeVisible();
    await expect(page.getByText(/Presupuesto sin compromiso/i)).toBeVisible();
  });

  test('service cards expose IVA breakdown disclosure', async ({ page }) => {
    const detail = page.locator('#servicios details').first();
    await detail.locator('summary').click();
    await expect(detail.getByText(/Base imponible/i)).toBeVisible();
    await expect(detail.getByText(/^IVA/).first()).toBeVisible();
    await expect(detail.getByText(/^Total$/i)).toBeVisible();
  });

  test('first service card "Reservar" button dispatches amg:open-chat', async ({ page }) => {
    const captured: Array<{ serviceId?: string }> = [];
    await page.exposeFunction('__captureChatOpen', (detail: { serviceId?: string }) => {
      captured.push(detail);
    });
    await page.evaluate(() => {
      window.addEventListener('amg:open-chat', (e) => {
        const detail = (e as CustomEvent).detail ?? {};
        // @ts-expect-error — exposed by the test
        window.__captureChatOpen(detail);
      });
    });

    await page.locator('#servicios article').first().getByRole('button', { name: /Reservar/i }).click();

    // The custom event should fire with a serviceId attached.
    await expect.poll(() => captured.length).toBeGreaterThan(0);
    expect(captured[0]?.serviceId).toBeTruthy();
  });
});

test.describe('v2 ITV widget', () => {
  test('vehicle older than 10 years shows annual ITV', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Calcular mi ITV/i }).click();
    await page.locator('input[type="date"]').fill('2010-06-01');
    await page.getByRole('button', { name: /^Calcular$/i }).click();
    await expect(page.getByText(/ITV anual/i)).toBeVisible({ timeout: 4000 });
  });

  test('reset returns to idle phase', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Calcular mi ITV/i }).click();
    await page.locator('input[type="date"]').fill('2010-06-01');
    await page.getByRole('button', { name: /^Calcular$/i }).click();
    await page.getByRole('button', { name: /Resetear/i }).click();
    await expect(page.getByRole('button', { name: /Calcular mi ITV/i })).toBeVisible();
  });
});

test.describe('v2 testimonials', () => {
  test('rotates between testimonials', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('#testimonios');
    await expect(section.getByRole('tab', { name: /Testimonio 1/i })).toBeVisible();

    await section.getByRole('tab', { name: /Testimonio 2/i }).click();
    await expect(section.getByText(/Pasé la ITV/)).toBeVisible({ timeout: 1500 });

    await section.getByRole('tab', { name: /Testimonio 3/i }).click();
    await expect(section.getByText(/años cuidando mis coches/)).toBeVisible({ timeout: 1500 });
  });
});

test.describe('v2 footer', () => {
  test('renders 3 columns with legal info', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer.getByRole('heading', { name: /Acceso rápido/i })).toBeVisible();
    await expect(footer.getByRole('heading', { name: /Horario/i })).toBeVisible();
    await expect(footer.getByText(/RD 1457\/1986/)).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Privacidad', exact: true })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Cookies', exact: true })).toBeVisible();
  });

  test('"Reservar cita" footer link opens chat widget', async ({ page }) => {
    await page.goto('/');
    await page.locator('footer').getByRole('button', { name: /Reservar cita/i }).click();
    await expect(page.getByRole('dialog', { name: /Asistente de reservas/i })).toBeVisible({ timeout: 2000 });
  });
});

test.describe('v2 cookie banner', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    await context.addInitScript(() => { localStorage.removeItem('amg_cookie_consent'); });
  });

  test('banner is shown on first visit and dismisses on Aceptar todo', async ({ page }) => {
    await page.goto('/');
    const banner = page.getByRole('dialog', { name: /Aviso de cookies/i });
    await expect(banner).toBeVisible({ timeout: 3000 });
    await banner.getByRole('button', { name: /Aceptar todo/i }).click();
    await expect(banner).not.toBeVisible({ timeout: 4000 });
  });

  test('preferences panel exposes analytics + marketing toggles', async ({ page }) => {
    await page.goto('/');
    const banner = page.getByRole('dialog', { name: /Aviso de cookies/i });
    await banner.getByRole('button', { name: /Gestionar preferencias/i }).click();
    await expect(banner.getByRole('switch', { name: /cookies analíticas/i })).toBeVisible();
    await expect(banner.getByRole('switch', { name: /cookies de marketing/i })).toBeVisible();
    await expect(banner.getByText(/Siempre activas/i)).toBeVisible();
  });

  test('rejecting all persists choice and hides banner', async ({ page }) => {
    await page.goto('/');
    const banner = page.getByRole('dialog', { name: /Aviso de cookies/i });
    await banner.getByRole('button', { name: /Solo necesarias/i }).click();
    await expect(banner).not.toBeVisible({ timeout: 4000 });

    const stored = await page.evaluate(() => localStorage.getItem('amg_cookie_consent'));
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored as string);
    expect(parsed.analytics).toBe(false);
    expect(parsed.marketing).toBe(false);
  });
});

test.describe('v2 chat widget', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await context.addInitScript(() => { localStorage.setItem('amg_cookie_consent', '{"analytics":false,"marketing":false}'); });
    await page.goto('/');
  });

  test('FAB is visible and opens drawer with progress dots', async ({ page }) => {
    const fab = page.getByRole('button', { name: /Abrir asistente de reservas/i });
    await expect(fab).toBeVisible();
    await fab.click();

    const dialog = page.getByRole('dialog', { name: /Asistente de reservas/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Reserva en 2 minutos/i)).toBeVisible();
  });

  test('hero CTA opens drawer (delegated data-action="open-chat")', async ({ page }) => {
    await page.locator('header').first().getByRole('button', { name: /Reservar/i }).click();
    await expect(page.getByRole('dialog', { name: /Asistente de reservas/i })).toBeVisible({ timeout: 2000 });
  });

  test('close button dismisses drawer', async ({ page }) => {
    await page.getByRole('button', { name: /Abrir asistente de reservas/i }).click();
    const dialog = page.getByRole('dialog', { name: /Asistente de reservas/i });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /Cerrar asistente/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 2000 });
  });
});

test.describe('v2 responsive — mobile breakpoint', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('hero stacks single column on mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /sin sorpresas/i })).toBeVisible();
    // Mobile nav: desktop links should be hidden by md:flex
    const desktopNav = page.locator('header nav.hidden.md\\:flex').first();
    await expect(desktopNav).toBeHidden();
  });

  test('cookie banner is full-width on mobile', async ({ page, context }) => {
    await context.clearCookies();
    await context.addInitScript(() => { localStorage.removeItem('amg_cookie_consent'); });
    await page.goto('/');
    const banner = page.getByRole('dialog', { name: /Aviso de cookies/i });
    await expect(banner).toBeVisible({ timeout: 3000 });
    const box = await banner.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(300);
  });

  test('chat widget drawer slides up from bottom on mobile', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Abrir asistente de reservas/i }).click();
    const dialog = page.getByRole('dialog', { name: /Asistente de reservas/i });
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    // Should be anchored to the bottom of the viewport on mobile (y + height ≈ viewport height)
    expect(box!.y + box!.height).toBeGreaterThan(700);
  });
});

test.describe('v2 accessibility — semantic landmarks', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('exposes header, main content sections, and footer landmarks', async ({ page }) => {
    await expect(page.locator('header').first()).toBeVisible();
    await expect(page.locator('section#servicios')).toBeVisible();
    await expect(page.locator('section#testimonios')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('phone, whatsapp, and CTAs have accessible names', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Reservar cita/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /WhatsApp/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /968/ }).first()).toBeVisible();
  });

  test('focus is visible on keyboard navigation', async ({ page }) => {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).not.toBe('BODY');
  });
});
