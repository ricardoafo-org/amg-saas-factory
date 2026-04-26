'use client';

import { useEffect, useState } from 'react';

/**
 * FEAT-038 PR 9 — Soft "Add to home screen" prompt.
 *
 * Spec rule (acceptance criterion #7): NEVER prompt on first visit. Only
 * prompt after the user has completed a booking — that's when the value
 * of "save the workshop on your phone" is highest.
 *
 * Listens for the `amg:booking-confirmed` CustomEvent dispatched by the
 * ChatEngine on successful save. Captures the browser's native
 * `beforeinstallprompt` event and only surfaces our soft UI when both
 * signals are present. Once dismissed, never re-asks (localStorage flag).
 */

type PromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISSED_KEY = 'amg-pwa-install-dismissed';
const SHOWN_KEY = 'amg-pwa-install-shown';

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<PromptEvent | null>(null);
  const [bookingDone, setBookingDone] = useState(false);
  const [visible, setVisible] = useState(false);

  // Capture native beforeinstallprompt — but DO NOT show our UI yet.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(DISMISSED_KEY) === '1') return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as PromptEvent);
    };
    const onBookingConfirmed = () => setBookingDone(true);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('amg:booking-confirmed', onBookingConfirmed);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('amg:booking-confirmed', onBookingConfirmed);
    };
  }, []);

  // Only show when BOTH the booking event AND the native prompt have fired.
  useEffect(() => {
    if (!deferred || !bookingDone) return;
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(SHOWN_KEY) === '1') return;

    const t = window.setTimeout(() => {
      setVisible(true);
      window.localStorage.setItem(SHOWN_KEY, '1');
    }, 1500);
    return () => window.clearTimeout(t);
  }, [deferred, bookingDone]);

  function dismiss() {
    setVisible(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISSED_KEY, '1');
    }
  }

  async function accept() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

  if (!visible) return null;

  return (
    <div role="dialog" aria-labelledby="amg-install-title" className="amg-install-prompt">
      <div className="amg-install-body">
        <p id="amg-install-title" className="amg-install-title">
          Guarda el taller en tu móvil
        </p>
        <p className="amg-install-text">
          Acceso rápido a tu próxima reserva, al teléfono y a cómo llegar — sin abrir el navegador.
        </p>
      </div>
      <div className="amg-install-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={dismiss}>
          Ahora no
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={accept}>
          Añadir
        </button>
      </div>
    </div>
  );
}
