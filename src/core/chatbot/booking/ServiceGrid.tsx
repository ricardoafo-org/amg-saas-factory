'use client';

import { ChipRow } from '@/core/chatbot/booking/ChipRow';
import type { Service } from '@/core/types/adapter';

type Props = {
  services: Service[];
  selectedIds: string[];
  onToggle: (id: string) => void;
};

/**
 * ServiceGrid — extracted multi-select service chip grid.
 * Separates Paquetes (category='paquete') from à la carte services.
 * Extracted from StepServices so it can be reused in edit flow.
 */
export function ServiceGrid({ services, selectedIds, onToggle }: Props) {
  const packages = services.filter((s) => s.category === 'paquete');
  const alaCarte = services.filter((s) => s.category !== 'paquete');

  return (
    <div className="flex flex-col gap-3">
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
            onSelect={onToggle}
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
            onSelect={onToggle}
            multiSelect
          />
        </section>
      )}

      {services.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Sin servicios disponibles.
        </p>
      )}
    </div>
  );
}
