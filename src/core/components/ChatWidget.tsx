'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Bot } from 'lucide-react';
import type { ChatbotFlow } from '@/lib/chatbot/engine';
import type { Service } from '@/core/types/adapter';

/**
 * FEAT-038 PR 10 — Thin shell.
 *
 * Renders only the floating action button + the open-chat event listeners.
 * The heavy panel (framer-motion drawer + ChatEngine + BookingStepper) lives
 * in ChatPanel.tsx and is dynamic-imported on first open intent so it never
 * touches the initial bundle. INP-critical path is now: this file +
 * lucide-react Bot icon only.
 *
 * Pre-warm strategy: hovering or focusing the FAB triggers the import so
 * the open click feels instant.
 */

const ChatPanel = dynamic(() => import('./ChatPanel'), { ssr: false });

let panelPrefetched = false;
function prefetchPanel() {
  if (panelPrefetched) return;
  panelPrefetched = true;
  // Triggers the dynamic import without rendering — masks open latency.
  void import('./ChatPanel');
}

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
  const [hasNotification, setHasNotification] = useState(true);
  const [preselectedService, setPreselectedService] = useState<string | undefined>();
  const fabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleOpenChat(e: Event) {
      setOpen(true);
      setHasNotification(false);
      const detail = (e as CustomEvent<{ serviceId?: string }>).detail;
      if (detail?.serviceId) setPreselectedService(detail.serviceId);
    }
    function handleDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest('[data-action="open-chat"]')) {
        setOpen(true);
        setHasNotification(false);
      }
    }
    window.addEventListener('amg:open-chat', handleOpenChat);
    document.addEventListener('click', handleDocClick);
    return () => {
      window.removeEventListener('amg:open-chat', handleOpenChat);
      document.removeEventListener('click', handleDocClick);
    };
  }, []);

  const handleClose = useCallback(() => setOpen(false), []);
  const handleOpen = useCallback(() => {
    setOpen(true);
    setHasNotification(false);
  }, []);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50" aria-label="Asistente de reservas">
        {!open && (
          <button
            ref={fabRef}
            type="button"
            onClick={handleOpen}
            onMouseEnter={prefetchPanel}
            onFocus={prefetchPanel}
            onTouchStart={prefetchPanel}
            aria-label="Abrir asistente de reservas"
            className="amg-chat-fab relative flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-lg)] hover:bg-[--brand-red-dark] transition-colors duration-200"
          >
            <Bot className="h-6 w-6" />
            {hasNotification && (
              <span
                className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-success border-2 border-background dot-available"
                aria-hidden
              />
            )}
          </button>
        )}
      </div>

      {open && (
        <ChatPanel
          {...props}
          open={open}
          preselectedService={preselectedService}
          onClose={handleClose}
        />
      )}
    </>
  );
}
