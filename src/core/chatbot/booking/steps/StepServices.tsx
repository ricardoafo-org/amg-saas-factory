'use client';

import { useState } from 'react';
import { Bubble } from '@/core/chatbot/booking/Bubble';
import { ChipRow } from '@/core/chatbot/booking/ChipRow';
import type { Service } from '@/core/types/adapter';

type ServicesData = {
  selectedServiceIds: string[];
};

type Props = {
  services: Service[];
  /**
   * Pre-selected service IDs — flows in from BookingApp when the user opened
   * the chat from a specific service card. Empty/undefined means user starts
   * from a clean slate.
   */
  initialSelection?: string[];
  onComplete: (data: ServicesData) => void;
};

/**
 * Step 1 — Selección multi-servicio.
 * Renderiza paquetes (category='paquete') y servicios à la carte.
 * PR-A no conecta al carrito — recoge IDs seleccionados y llama a onComplete.
 */
export function StepServices({ services, initialSelection, onComplete }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelection ?? []);
  const [error, setError] = useState<string | null>(null);

  const packages = services.filter((s) => s.category === 'paquete');
  const alaCarte = services.filter((s) => s.category !== 'paquete');

  function toggle(id: string) {
    setError(null);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  }

  function handleSubmit() {
    if (selectedIds.length === 0) {
      setError('Selecciona al menos un servicio para continuar');
      return;
    }
    onComplete({ selectedServiceIds: selectedIds });
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Bubble role="bot">
        ¿Qué necesitas que revisemos? Puedes elegir varios servicios.
      </Bubble>

      {packages.length > 0 && (
        <section>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-2">
            Paquetes
          </p>
          <ChipRow
            options={packages.map((s) => ({
              value: s.id,
              label: s.name,
              selected: selectedIds.includes(s.id),
            }))}
            onSelect={toggle}
            multiSelect
          />
        </section>
      )}

      {alaCarte.length > 0 && (
        <section>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-2">
            À la carte
          </p>
          <ChipRow
            options={alaCarte.map((s) => ({
              value: s.id,
              label: s.name,
              selected: selectedIds.includes(s.id),
            }))}
            onSelect={toggle}
            multiSelect
          />
        </section>
      )}

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      <p className="text-[10px] text-muted-foreground/60">
        {selectedIds.length === 0
          ? 'Selecciona al menos un servicio para continuar'
          : `${selectedIds.length} ${selectedIds.length === 1 ? 'servicio seleccionado' : 'servicios seleccionados'}`}
      </p>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={selectedIds.length === 0}
        className="w-full h-11 rounded-[--radius-lg] bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 transition-all duration-200"
      >
        Continuar
      </button>
    </div>
  );
}
