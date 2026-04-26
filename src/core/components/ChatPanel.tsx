'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { ChatbotFlow } from '@/lib/chatbot/engine';
import type { Service } from '@/core/types/adapter';
import { ChatEngine } from '@/core/chatbot/ChatEngine';
import { BookingStepper } from '@/core/chatbot/components/BookingStepper';

/**
 * FEAT-038 PR 10 — Heavy chatbot subtree.
 *
 * Lifted out of ChatWidget so framer-motion + ChatEngine + BookingStepper
 * are excluded from the initial bundle. The thin ChatWidget shell
 * dynamic-imports this module on first open intent — every byte under
 * this file is paid for ONLY by users who actually engage the chat.
 *
 * INP wins:
 *   - framer-motion (~30 KB gz) deferred until interaction
 *   - ChatEngine + flow runtime deferred
 *   - BookingStepper deferred
 *   - lucide-react X icon deferred (Bot icon stays in shell)
 */

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
  open: boolean;
  preselectedService: string | undefined;
  onClose: () => void;
};

export default function ChatPanel(props: Props) {
  const { open, preselectedService, onClose, ...engineProps } = props;
  const drawerRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) drawerRef.current?.focus();
  }, [open]);

  const handleStepChange = useCallback((s: number) => setStep(s), []);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            aria-hidden
            onClick={onClose}
          />

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
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}
            >
              <div className="flex items-center gap-3">
                <div className="chat-avatar" aria-hidden>AM</div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg)', lineHeight: 1.2 }}>
                    Andrés · Talleres AMG
                  </p>
                  <p
                    style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}
                  >
                    <span className="dot-available" style={{ width: 6, height: 6 }} aria-hidden />
                    Respondemos en &lt; 15 min
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar asistente"
                className="chat-close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <BookingStepper step={step} />

            <div className="flex-1 overflow-hidden flex flex-col">
              <ChatEngine
                {...engineProps}
                onStepChange={handleStepChange}
                initialService={preselectedService}
              />
            </div>

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
  );
}
