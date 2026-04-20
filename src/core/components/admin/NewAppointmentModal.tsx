'use client';

import { X, CalendarPlus } from 'lucide-react';
import { cn } from '@/lib/cn';

type NewAppointmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-fill the date/time when opening from a specific slot on the calendar */
  prefillDate?: string; // ISO date string YYYY-MM-DD
  prefillTime?: string; // HH:MM
};

/**
 * Stub modal for creating a new appointment.
 * Full form is FEAT-013 scope — this satisfies the FEAT-015 AC for "Nueva cita" button.
 */
export function NewAppointmentModal({
  isOpen,
  onClose,
  prefillDate,
  prefillTime,
}: NewAppointmentModalProps) {
  if (!isOpen) return null;

  const dateLabel = prefillDate
    ? new Intl.DateTimeFormat('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'Europe/Madrid',
      }).format(new Date(prefillDate))
    : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-appt-title"
        className={cn(
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
          'w-full max-w-md glass-strong rounded-xl shadow-[var(--shadow-dialog)]',
          'p-6',
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <CalendarPlus className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 id="new-appt-title" className="text-base font-semibold text-foreground">
                Nueva cita
              </h2>
              {dateLabel && (
                <p className="text-xs text-muted-foreground capitalize">{dateLabel}</p>
              )}
              {prefillTime && (
                <p className="text-xs text-muted-foreground">{prefillTime}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stub content */}
        <div className="rounded-lg bg-muted/50 border border-border p-4 text-center">
          <p className="text-sm text-muted-foreground">
            El formulario completo de nueva cita estará disponible en{' '}
            <span className="text-foreground font-medium">FEAT-013</span>.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Incluirá: búsqueda de cliente, selección de vehículo, servicios, duración y notas.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors border border-border"
          >
            Cerrar
          </button>
        </div>
      </div>
    </>
  );
}
