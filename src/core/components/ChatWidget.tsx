'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bot } from 'lucide-react';
import { MOTION } from '@/lib/motion';
import type { ChatbotFlow } from '@/lib/chatbot/engine';
import type { Service } from '@/core/types/adapter';
import { ChatEngine } from '@/core/chatbot/ChatEngine';
import { BookingStepper } from '@/core/chatbot/components/BookingStepper';

type Props = {
  flow: ChatbotFlow;
  tenantId: string;
  phone: string;
  businessName: string;
  policyUrl: string;
  policyVersion: string;
  policyHash: string;
  services: Service[];
  ivaRate: number;
};

export function ChatWidget(props: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [hasNotification, setHasNotification] = useState(true);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Listen for amg:open-chat custom events (fired by Hero and ServiceGrid CTAs)
  useEffect(() => {
    function handleOpenChat(e: Event) {
      setOpen(true);
      setHasNotification(false);
      // Service pre-selection is passed as detail — ChatEngine will receive it via initialService
      const detail = (e as CustomEvent<{ serviceId?: string }>).detail;
      if (detail?.serviceId) {
        // Store for passing to ChatEngine on next render
        // We surface this through a state update; ChatEngine reads initialService prop
        setPreselectedService(detail.serviceId);
      }
    }

    window.addEventListener('amg:open-chat', handleOpenChat);
    return () => window.removeEventListener('amg:open-chat', handleOpenChat);
  }, []);

  const [preselectedService, setPreselectedService] = useState<string | undefined>();

  // Also wire up static data-action="open-chat" buttons that are rendered by Server Components
  // (Hero header button and hero CTA). They can't add event listeners, so we delegate here.
  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest('[data-action="open-chat"]')) {
        setOpen(true);
        setHasNotification(false);
      }
    }
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  // Trap focus inside drawer when open
  useEffect(() => {
    if (open) {
      drawerRef.current?.focus();
    }
  }, [open]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  // Advance booking step (exposed to ChatEngine via a simple callback)
  const handleStepChange = useCallback((s: number) => setStep(s), []);

  return (
    <>
      {/* ── Floating action button ── */}
      <div className="fixed bottom-6 right-6 z-50" aria-label="Asistente de reservas">
        <AnimatePresence>
          {!open && (
            <motion.button
              {...MOTION.scaleIn}
              exit={{ opacity: 0, scale: 0.9 }}
              type="button"
              onClick={() => { setOpen(true); setHasNotification(false); }}
              aria-label="Abrir asistente de reservas"
              className="relative flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-lg)] hover:bg-[--brand-red-dark] transition-colors duration-200"
            >
              <Bot className="h-6 w-6" />
              {hasNotification && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-success border-2 border-background dot-available"
                  aria-hidden
                />
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Chat drawer / panel ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop (mobile only) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              aria-hidden
              onClick={handleClose}
            />

            {/* Panel */}
            <motion.div
              ref={drawerRef}
              tabIndex={-1}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed z-50 bottom-0 left-0 right-0 md:bottom-6 md:right-6 md:left-auto md:w-[420px] flex flex-col rounded-t-[--radius-xl] md:rounded-[--radius-xl] overflow-hidden shadow-[var(--shadow-dialog)] border border-border bg-card"
              role="dialog"
              aria-modal="true"
              aria-label="Asistente de reservas"
            >
              {/* Drawer header — matches bundle: chat-avatar + Andrés · Talleres AMG */}
              <div
                className="flex items-center justify-between px-4 py-3 shrink-0"
                style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}
              >
                <div className="flex items-center gap-3">
                  {/* AM avatar circle — .chat-avatar utility */}
                  <div className="chat-avatar" aria-hidden>AM</div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg)', lineHeight: 1.2 }}>
                      Andrés · Talleres AMG
                    </p>
                    <p
                      style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}
                    >
                      <span
                        className="dot-available"
                        style={{ width: 6, height: 6 }}
                        aria-hidden
                      />
                      Respondemos en &lt; 15 min
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Cerrar asistente"
                  className="chat-close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* 5-step booking stepper */}
              <BookingStepper step={step} />

              {/* Chat engine */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <ChatEngine
                  {...props}
                  onStepChange={handleStepChange}
                  initialService={preselectedService}
                />
              </div>

              {/* Privacy footer — .chat-foot */}
              <div className="chat-foot shrink-0">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Seguro · RGPD · no compartimos tus datos
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
