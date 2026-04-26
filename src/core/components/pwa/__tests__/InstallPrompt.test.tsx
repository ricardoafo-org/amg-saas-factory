import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import { readFileSync } from 'fs';
import { join } from 'path';
import { InstallPrompt } from '../InstallPrompt';

/**
 * FEAT-038 PR 9 — PWA soft install prompt contract.
 *
 * Acceptance criterion: NEVER prompt on first visit. Surface only after
 * BOTH the native `beforeinstallprompt` event AND a successful booking
 * (`amg:booking-confirmed` CustomEvent) have fired. Once dismissed,
 * never re-asks (localStorage flag).
 */

function fireBeforeInstall() {
  const e = new Event('beforeinstallprompt') as Event & {
    prompt?: () => Promise<void>;
    userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  };
  e.prompt = vi.fn().mockResolvedValue(undefined);
  e.userChoice = Promise.resolve({ outcome: 'accepted' as const });
  window.dispatchEvent(e);
}

function mount(): { container: HTMLDivElement; root: Root } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<InstallPrompt />);
  });
  return { container, root };
}

describe('InstallPrompt — FEAT-038 PR 9 contract', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('renders nothing on first visit (no events fired)', () => {
    const { container } = mount();
    expect(container.firstChild).toBeNull();
  });

  it('does not surface when only beforeinstallprompt has fired (no booking yet)', () => {
    const { container } = mount();
    act(() => {
      fireBeforeInstall();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(container.firstChild).toBeNull();
  });

  it('does not surface when only the booking event fired (no native prompt)', () => {
    const { container } = mount();
    act(() => {
      window.dispatchEvent(new CustomEvent('amg:booking-confirmed'));
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(container.firstChild).toBeNull();
  });

  it('surfaces the dialog after both events + delay', () => {
    const { container } = mount();
    act(() => {
      fireBeforeInstall();
      window.dispatchEvent(new CustomEvent('amg:booking-confirmed'));
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(container.textContent).toContain('Guarda el taller en tu móvil');
  });

  it('persists dismissal to localStorage so it never re-asks', () => {
    const { container } = mount();
    act(() => {
      fireBeforeInstall();
      window.dispatchEvent(new CustomEvent('amg:booking-confirmed'));
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    const dismissBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Ahora no',
    );
    expect(dismissBtn).toBeTruthy();
    act(() => {
      dismissBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(window.localStorage.getItem('amg-pwa-install-dismissed')).toBe('1');
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('does not capture beforeinstallprompt if already dismissed in a prior session', () => {
    window.localStorage.setItem('amg-pwa-install-dismissed', '1');
    const { container } = mount();
    act(() => {
      fireBeforeInstall();
      window.dispatchEvent(new CustomEvent('amg:booking-confirmed'));
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(container.firstChild).toBeNull();
  });
});

describe('manifest.webmanifest — FEAT-038 PR 9 PWA contract', () => {
  const raw = readFileSync(join(process.cwd(), 'public', 'manifest.webmanifest'), 'utf8');
  const manifest = JSON.parse(raw) as Record<string, unknown>;

  it('declares standalone display so the app launches without browser chrome', () => {
    expect(manifest['display']).toBe('standalone');
  });

  it('exposes start_url and scope at the site root', () => {
    expect(manifest['start_url']).toBe('/');
    expect(manifest['scope']).toBe('/');
  });

  it('uses the brand red as theme_color', () => {
    expect(manifest['theme_color']).toBe('#bf3a2e');
  });

  it('ships at least one icon with maskable purpose', () => {
    const icons = manifest['icons'] as Array<{ purpose?: string }>;
    expect(icons.length).toBeGreaterThan(0);
    expect(icons.some((i) => (i.purpose ?? '').includes('maskable'))).toBe(true);
  });

  it('declares a Reservar shortcut so the home-screen icon long-press jumps straight to booking', () => {
    const shortcuts = manifest['shortcuts'] as Array<{ url: string }>;
    expect(shortcuts.some((s) => s.url.includes('cta=reservar'))).toBe(true);
  });
});
