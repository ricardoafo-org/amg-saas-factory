'use client';

import { useEffect, useState } from 'react';
import { Phone, MessageCircle, CalendarCheck } from 'lucide-react';

type Props = {
  phone: string;
  whatsapp?: string | undefined;
};

/**
 * Mobile-only sticky contact bar with three equal-width tap targets:
 * Llamar · WhatsApp · Reservar. Hides on desktop and while the chat
 * panel is open (the chat itself becomes the active surface).
 *
 * Listens to `amg:chat-state` (dispatched by ChatWidget) to toggle
 * visibility. The Reservar button uses the same `data-action="open-chat"`
 * delegation pattern the rest of the site uses, so wiring stays uniform.
 */
export function MobileContactBar({ phone, whatsapp }: Props) {
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    function handleChatState(e: Event) {
      const detail = (e as CustomEvent<{ open: boolean }>).detail;
      setChatOpen(Boolean(detail?.open));
    }
    window.addEventListener('amg:chat-state', handleChatState);
    return () => window.removeEventListener('amg:chat-state', handleChatState);
  }, []);

  const waNumber = whatsapp?.replace(/\D/g, '');

  return (
    <div
      className="contact-bar"
      data-chat-open={chatOpen ? 'true' : 'false'}
      role="region"
      aria-label="Contacto rápido"
    >
      <a
        className="contact-bar-btn contact-bar-btn--neutral"
        href={`tel:${phone.replace(/\s/g, '')}`}
        aria-label={`Llamar al ${phone}`}
      >
        <Phone width={20} height={20} aria-hidden />
        <span>Llamar</span>
      </a>

      {waNumber && (
        <a
          className="contact-bar-btn contact-bar-btn--neutral"
          href={`https://wa.me/${waNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Escribir por WhatsApp"
        >
          <MessageCircle width={20} height={20} aria-hidden />
          <span>WhatsApp</span>
        </a>
      )}

      <button
        type="button"
        data-action="open-chat"
        className="contact-bar-btn contact-bar-btn--primary"
        aria-label="Reservar cita"
      >
        <CalendarCheck width={20} height={20} aria-hidden />
        <span>Reservar</span>
      </button>
    </div>
  );
}
