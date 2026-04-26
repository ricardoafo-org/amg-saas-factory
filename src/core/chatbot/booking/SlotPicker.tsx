'use client';

import type { AvailableSlot } from '@/actions/slots';

type Props = {
  slots: AvailableSlot[];
  loading: boolean;
  loadError: boolean;
  onSelect: (slot: AvailableSlot) => void;
};

/**
 * SlotPicker — extracted slot-picker UI from StepSlot.
 * Presentational: receives slots as prop, fires onSelect.
 * The getAvailableSlots server call stays in StepSlot (server boundary).
 */
export function SlotPicker({ slots, loading, loadError, onSelect }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
        <div className="w-4 h-4 rounded-full border border-transparent border-t-primary animate-spin" />
        Buscando disponibilidad…
      </div>
    );
  }

  if (loadError) {
    return (
      <p role="alert" className="text-xs text-destructive text-center py-4">
        No se han podido cargar los huecos disponibles. Inténtalo de nuevo.
      </p>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        En este momento no hay huecos disponibles en los próximos 14 días. Por favor, llámanos para acordar una fecha.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {slots.map((slot) => {
        const d = new Date(`${slot.slotDate}T00:00:00`);
        return (
          <button
            key={slot.id}
            type="button"
            onClick={() => onSelect(slot)}
            className="group flex flex-col items-start p-2.5 rounded-[--radius-lg] border border-border/60 bg-background/40 hover:border-primary/50 hover:bg-primary/5 transition-all duration-150 text-left min-h-[44px]"
          >
            <span className="text-[10px] text-muted-foreground font-mono group-hover:text-primary/70 transition-colors capitalize">
              {d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            <span className="text-sm font-semibold mt-0.5 tabular-nums">
              {slot.startTime}
            </span>
            <span className="text-[10px] text-muted-foreground/60 mt-0.5">
              {slot.spotsLeft} {slot.spotsLeft === 1 ? 'hueco' : 'huecos'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
