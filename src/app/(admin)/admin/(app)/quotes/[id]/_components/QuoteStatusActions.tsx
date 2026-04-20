'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Send, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { updateQuoteStatus } from '@/actions/admin/quotes';
import type { QuoteStatus } from '@/actions/admin/quotes';
import { cn } from '@/lib/cn';

type Props = {
  quoteId: string;
  status: QuoteStatus;
};

export function QuoteStatusActions({ quoteId, status }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleUpdate(newStatus: QuoteStatus) {
    startTransition(async () => {
      await updateQuoteStatus(quoteId, newStatus);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap shrink-0">
      {status === 'pending' && (
        <button
          type="button"
          onClick={() => handleUpdate('sent')}
          disabled={isPending}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
            'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
            'disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          <Send className="h-3.5 w-3.5" />
          Enviar
        </button>
      )}

      {status === 'sent' && (
        <>
          <button
            type="button"
            onClick={() => handleUpdate('accepted')}
            disabled={isPending}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
              'bg-success/15 text-success border border-success/30 hover:bg-success/25 transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Marcar aprobado
          </button>
          <button
            type="button"
            onClick={() => handleUpdate('rejected')}
            disabled={isPending}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
              'bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          >
            <XCircle className="h-3.5 w-3.5" />
            Rechazado
          </button>
        </>
      )}

      {status === 'accepted' && (
        <a
          href="/admin/calendar"
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
            'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
          )}
        >
          <Calendar className="h-3.5 w-3.5" />
          Crear cita
        </a>
      )}
    </div>
  );
}
