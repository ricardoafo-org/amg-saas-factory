'use client';

import { useState, useEffect } from 'react';
import { X, Cookie, ChevronDown } from 'lucide-react';
import { logCookieConsent } from '@/actions/consent';

const CONSENT_KEY = 'amg_cookie_consent';

type ConsentState = {
  analytics: boolean;
  marketing: boolean;
};

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [preferences, setPreferences] = useState<ConsentState>({
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (!stored) setVisible(true);
    } catch {
      // localStorage unavailable (e.g. SSR context) — do nothing
    }
  }, []);

  async function persist(consent: ConsentState) {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    } catch {
      // ignore write errors
    }

    const sessionId = generateSessionId();
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';

    await logCookieConsent({
      analytics: consent.analytics,
      marketing: consent.marketing,
      sessionId,
      userAgent,
    });

    setVisible(false);
  }

  function handleAcceptAll() {
    void persist({ analytics: true, marketing: true });
  }

  function handleRejectAll() {
    void persist({ analytics: false, marketing: false });
  }

  function handleSavePreferences() {
    void persist(preferences);
  }

  if (!visible) return null;

  return (
    <>
      {/* Backdrop when panel is open on mobile */}
      {panelOpen && (
        <div
          className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-40"
          onClick={() => setPanelOpen(false)}
          aria-hidden
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Aviso de cookies"
        className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4"
        style={{
          animation: 'cookieBannerSlideUp 0.3s ease-out forwards',
        }}
      >
        <div className="bg-card rounded-[--radius-xl] mx-auto max-w-3xl shadow-[var(--shadow-dialog)] border border-border">
          {/* Main banner row */}
          <div className="px-4 py-4 sm:px-5">
            <div className="flex items-start gap-3 mb-3">
              <Cookie className="h-4 w-4 text-primary/70 shrink-0 mt-0.5" aria-hidden />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Usamos cookies necesarias para el funcionamiento del sitio. Con tu permiso también
                usamos cookies de análisis y marketing. Consulta nuestra{' '}
                <a
                  href="/politica-de-cookies"
                  className="text-primary underline underline-offset-2 hover:brightness-125 transition-all"
                >
                  política de cookies
                </a>{' '}
                para más información.
              </p>
            </div>

            {/* Action buttons — equal prominence per AEPD 2023 */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleAcceptAll}
                className="flex-1 min-w-[120px] h-10 rounded-[--radius-lg] bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors duration-150"
              >
                Aceptar todo
              </button>
              <button
                onClick={handleRejectAll}
                className="flex-1 min-w-[120px] h-10 rounded-[--radius-lg] border border-border/80 bg-secondary/60 text-secondary-foreground text-xs font-semibold hover:bg-secondary hover:border-border transition-colors duration-150"
              >
                Solo necesarias
              </button>
              <button
                onClick={() => setPanelOpen((o) => !o)}
                className="flex-1 min-w-[120px] h-10 rounded-[--radius-lg] border border-border/80 bg-secondary/60 text-secondary-foreground text-xs font-semibold hover:bg-secondary hover:border-border transition-colors duration-150 flex items-center justify-center gap-1.5"
                aria-expanded={panelOpen}
              >
                Gestionar preferencias
                <ChevronDown
                  className="h-3 w-3 transition-transform duration-200"
                  style={{ transform: panelOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  aria-hidden
                />
              </button>
            </div>
          </div>

          {/* Preferences panel */}
          {panelOpen && (
            <div className="border-t border-border/50 px-4 py-4 sm:px-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Categorías de cookies
                </p>
                <button
                  onClick={() => setPanelOpen(false)}
                  className="p-1 rounded-[--radius-sm] text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Cerrar panel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Necessary — always on, not toggleable */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">Necesarias</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Imprescindibles para el funcionamiento del sitio: sesión PocketBase, chatbot de
                    reservas.
                  </p>
                </div>
                <div className="shrink-0 mt-0.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
                    Siempre activas
                  </span>
                </div>
              </div>

              {/* Analytics toggle */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">Analíticas</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Plausible Analytics (sin cookies, sin datos personales). Nos ayuda a mejorar el
                    sitio.
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={preferences.analytics}
                  onClick={() =>
                    setPreferences((p) => ({ ...p, analytics: !p.analytics }))
                  }
                  className={`shrink-0 mt-0.5 relative inline-flex h-5 w-9 items-center rounded-full border transition-colors duration-200 ${
                    preferences.analytics
                      ? 'bg-primary border-primary'
                      : 'bg-muted border-border'
                  }`}
                  aria-label="Activar cookies analíticas"
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      preferences.analytics ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Marketing toggle */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">Marketing</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Actualmente no se usan cookies de marketing. Reservado para futuras integraciones
                    (WhatsApp pixel, etc.).
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={preferences.marketing}
                  onClick={() =>
                    setPreferences((p) => ({ ...p, marketing: !p.marketing }))
                  }
                  className={`shrink-0 mt-0.5 relative inline-flex h-5 w-9 items-center rounded-full border transition-colors duration-200 ${
                    preferences.marketing
                      ? 'bg-primary border-primary'
                      : 'bg-muted border-border'
                  }`}
                  aria-label="Activar cookies de marketing"
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      preferences.marketing ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Panel actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={handleRejectAll}
                  className="flex-1 min-w-[110px] h-9 rounded-[--radius-lg] border border-border/80 bg-secondary/60 text-secondary-foreground text-xs font-semibold hover:bg-secondary transition-colors duration-150"
                >
                  Rechazar todo
                </button>
                <button
                  onClick={handleSavePreferences}
                  className="flex-1 min-w-[110px] h-9 rounded-[--radius-lg] bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors duration-150"
                >
                  Guardar preferencias
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes cookieBannerSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
