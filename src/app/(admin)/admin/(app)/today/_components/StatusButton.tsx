'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import type { AppointmentStatus } from '@/actions/admin/appointments';
import { updateAppointmentStatus } from '@/actions/admin/appointments';

type Props = {
  appointmentId: string;
  currentStatus: AppointmentStatus;
};

const STATUS_TRANSITIONS: Partial<Record<AppointmentStatus, AppointmentStatus>> = {
  pending: 'confirmed',
  confirmed: 'in_progress',
  in_progress: 'ready',
  ready: 'delivered',
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Confirmar',
  confirmed: 'En taller',
  in_progress: 'Listo',
  ready: 'Entregar',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export function StatusButton({ appointmentId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const nextStatus = STATUS_TRANSITIONS[currentStatus];

  if (!nextStatus) {
    return null;
  }

  const handleClick = () => {
    startTransition(async () => {
      const result = await updateAppointmentStatus(appointmentId, nextStatus);
      if (result.ok) {
        router.refresh();
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
        'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20',
        'disabled:opacity-50 disabled:cursor-not-allowed',
      )}
    >
      {isPending ? '...' : STATUS_LABELS[currentStatus]}
    </button>
  );
}
