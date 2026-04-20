'use client';

import { useTransition } from 'react';
import { X, Clock, Car, Wrench, User, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { CalendarAppointment, AppointmentStatus } from '@/actions/admin/appointments';
import { updateAppointmentStatus } from '@/actions/admin/appointments';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending:     'Pendiente',
  confirmed:   'Confirmada',
  in_progress: 'En curso',
  ready:       'Lista',
  delivered:   'Entregada',
  cancelled:   'Cancelada',
};

const STATUS_CLASSES: Record<AppointmentStatus, string> = {
  pending:     'bg-[var(--status-pending)]/15 text-[var(--status-pending)] border-[var(--status-pending)]/30',
  confirmed:   'bg-[var(--status-confirmed)]/15 text-[var(--status-confirmed)] border-[var(--status-confirmed)]/30',
  in_progress: 'bg-[var(--status-in-progress)]/15 text-[var(--status-in-progress)] border-[var(--status-in-progress)]/30',
  ready:       'bg-[var(--status-ready)]/15 text-[var(--status-ready)] border-[var(--status-ready)]/30',
  delivered:   'bg-[var(--status-completed)]/15 text-[var(--status-completed)] border-[var(--status-completed)]/30',
  cancelled:   'bg-[var(--status-cancelled)]/15 text-[var(--status-cancelled)] border-[var(--status-cancelled)]/30',
};

// Allowed transitions from each status
const NEXT_STATUSES: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending:     ['confirmed', 'cancelled'],
  confirmed:   ['in_progress', 'cancelled'],
  in_progress: ['ready'],
  ready:       ['delivered'],
  delivered:   [],
  cancelled:   ['pending'],
};

// ── Component ─────────────────────────────────────────────────────────────────

type AppointmentSlideOverProps = {
  appointment: CalendarAppointment | null;
  onClose: () => void;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
};

export function AppointmentSlideOver({
  appointment,
  onClose,
  onStatusChange,
}: AppointmentSlideOverProps) {
  const [isPending, startTransition] = useTransition();

  const isOpen = appointment !== null;

  function handleStatusChange(newStatus: AppointmentStatus) {
    if (!appointment) return;
    startTransition(async () => {
      const result = await updateAppointmentStatus(appointment.id, newStatus);
      if (result.ok) {
        onStatusChange(appointment.id, newStatus);
      }
    });
  }

  // Format time for display
  function formatTime(isoString: string): string {
    try {
      return new Intl.DateTimeFormat('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Madrid',
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  }

  function formatDate(isoString: string): string {
    try {
      return new Intl.DateTimeFormat('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/Madrid',
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/40 z-40 transition-opacity duration-200',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Detalles de la cita"
        className={cn(
          'fixed top-0 right-0 h-full w-full sm:w-96 z-50 glass-strong border-l border-border',
          'transition-transform duration-300 ease-out overflow-y-auto',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {appointment && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-border">
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-foreground truncate">
                  {appointment.customerName}
                </h2>
                <span
                  className={cn(
                    'inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                    STATUS_CLASSES[appointment.status],
                  )}
                >
                  {STATUS_LABELS[appointment.status]}
                </span>
              </div>
              <button
                onClick={onClose}
                aria-label="Cerrar panel"
                className="ml-2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-5 space-y-5">
              {/* Date & time */}
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-foreground capitalize">
                    {formatDate(appointment.scheduledAt)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(appointment.scheduledAt)}
                    {' · '}
                    {appointment.durationMinutes} min
                  </p>
                </div>
              </div>

              {/* Vehicle */}
              {appointment.plate && (
                <div className="flex items-start gap-3">
                  <Car className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-foreground font-mono uppercase tracking-wider">
                      {appointment.plate}
                    </p>
                    <p className="text-xs text-muted-foreground">Matrícula</p>
                  </div>
                </div>
              )}

              {/* Services */}
              {appointment.serviceNames.length > 0 && (
                <div className="flex items-start gap-3">
                  <Wrench className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Servicios</p>
                    <ul className="space-y-0.5">
                      {appointment.serviceNames.map((svc, i) => (
                        <li key={i} className="text-sm text-foreground">
                          {svc}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Technician */}
              {appointment.staffId && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Técnico asignado</p>
                    <p className="text-sm text-foreground font-mono text-xs">{appointment.staffId}</p>
                  </div>
                </div>
              )}

              {/* Notes */}
              {appointment.notes && (
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Notas</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{appointment.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Status quick-change */}
            {NEXT_STATUSES[appointment.status].length > 0 && (
              <div className="p-5 border-t border-border">
                <p className="text-xs text-muted-foreground mb-3">Cambiar estado</p>
                <div className="flex flex-wrap gap-2">
                  {NEXT_STATUSES[appointment.status].map((nextStatus) => (
                    <button
                      key={nextStatus}
                      onClick={() => handleStatusChange(nextStatus)}
                      disabled={isPending}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-opacity',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        STATUS_CLASSES[nextStatus],
                      )}
                    >
                      {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                      {STATUS_LABELS[nextStatus]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
