'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X } from 'lucide-react';
import { MOTION } from '@/lib/motion';
import type { ChatbotFlow } from '@/lib/chatbot/engine';
import type { Service } from '@/core/types/adapter';
import { ChatEngine } from '@/core/chatbot/ChatEngine';

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

// Steps for the progress dots (matches chatbot booking flow stages)
const STEPS = ['Servicio', 'Detalles', 'Consentimiento', 'Confirmado'];

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
              {/* Drawer header */}
              <div className="flex items-center justify-between px-4 py-3 bg-primary border-b border-[--brand-red-dark] shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary-foreground/20 border border-primary-foreground/30">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary-foreground leading-none">Asistente AMG</p>
                    <p className="text-[10px] text-primary-foreground/60 mt-0.5 font-mono">Reserva en 2 minutos</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Cerrar asistente"
                  className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-primary-foreground/15 transition-colors text-primary-foreground/80 hover:text-primary-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Progress dots */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-secondary border-b border-border shrink-0">
                {STEPS.map((label, i) => (
                  <div key={label} className="flex items-center gap-2 flex-1">
                    <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold transition-colors duration-300 shrink-0 ${
                      i < step
                        ? 'bg-success text-success-foreground'
                        : i === step
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-border/40 text-muted-foreground/40'
                    }`}>
                      {i < step ? '✓' : i + 1}
                    </div>
                    <span className={`text-[9px] font-mono hidden sm:block ${
                      i <= step ? 'text-foreground/70' : 'text-muted-foreground/30'
                    }`}>
                      {label}
                    </span>
                    {i < STEPS.length - 1 && (
                      <div className={`h-px flex-1 transition-colors duration-300 ${i < step ? 'bg-success/50' : 'bg-border/30'}`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Chat engine */}
              <div className="flex-1 overflow-hidden">
                <ChatEngine
                  {...props}
                  onStepChange={handleStepChange}
                  initialService={preselectedService}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
