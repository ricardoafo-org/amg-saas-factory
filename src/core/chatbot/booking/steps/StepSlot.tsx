'use client';

import { useState, useEffect } from 'react';
import { Bubble } from '@/core/chatbot/booking/Bubble';
import { getAvailableSlots, type AvailableSlot } from '@/actions/slots';

type SlotData = {
  slotISO: string;
  slotId: string;
};

type Props = {
  tenantId: string;
  onComplete: (data: SlotData) => void;
};

/**
 * Step 2 — Selector de hueco disponible.
 * Carga los huecos del servidor vía getAvailableSlots (ya filtra por tenant_id).
 */
export function StepSlot({ tenantId, onComplete }: Props) {
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const today = new Date().toISOString().split('T')[0];
    getAvailableSlots(tenantId, today, 14)
      .then((available) => {
        if (cancelled) return;
        setSlots(available);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  function handleSelect(slot: AvailableSlot) {
    onComplete({
      slotISO: `${slot.slotDate}T${slot.startTime}`,
      slotId: slot.id,
    });
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Bubble role="bot">
        ¿Qué día te viene mejor? Estas son las próximas fechas disponibles.
      </Bubble>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
          <div className="w-4 h-4 rounded-full border border-transparent border-t-primary animate-spin" />
          Buscando disponibilidad…
        </div>
      )}

      {!loading && loadError && (
        <p role="alert" className="text-xs text-destructive text-center py-4">
          No se han podido cargar los huecos disponibles. Inténtalo de nuevo.
        </p>
      )}

      {!loading && !loadError && slots.length === 0 && (
        <Bubble role="bot">
          En este momento no hay huecos disponibles en los próximos 14 días. Por favor, llámanos para acordar una fecha.
        </Bubble>
      )}

      {!loading && !loadError && slots.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {slots.map((slot) => {
            const d = new Date(`${slot.slotDate}T00:00:00`);
            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => handleSelect(slot)}
                className="group flex flex-col items-start p-2.5 rounded-[--radius-lg] border border-border/60 bg-background/40 hover:border-primary/50 hover:bg-primary/5 transition-all duration-150 text-left min-h-[44px]"
              >
                <span className="text-[10px] text-muted-foreground font-mono group-hover:text-primary/70 transition-colors capitalize">
                  {d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
                <span className="text-sm font-semibold mt-0.5 font-variant-numeric tabular-nums">
                  {slot.startTime}
                </span>
                <span className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {slot.spotsLeft} {slot.spotsLeft === 1 ? 'hueco' : 'huecos'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
