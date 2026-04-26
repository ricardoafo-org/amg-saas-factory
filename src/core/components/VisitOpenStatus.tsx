'use client';

import { useEffect, useState } from 'react';
import type { OperatingHours } from '@/core/types/adapter';
import { computeOpenStatus } from '@/lib/hours';

const TICK_MS = 60_000;

export function VisitOpenStatus({
  operatingHours,
  timeZone = 'Europe/Madrid',
}: {
  operatingHours: OperatingHours[];
  timeZone?: string;
}) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const status = computeOpenStatus(operatingHours, now, timeZone);

  if (status.state === 'open') {
    return (
      <span className="visit-status visit-status--open" data-state="open">
        <span className="visit-status-dot" aria-hidden />
        Abierto ahora · cierra a las {status.closesAt}
      </span>
    );
  }

  if (status.state === 'closing-soon') {
    return (
      <span className="visit-status visit-status--closing" data-state="closing-soon">
        <span className="visit-status-dot" aria-hidden />
        Cierra pronto · {status.minutesLeft} min
      </span>
    );
  }

  if (status.nextOpenAt) {
    return (
      <span className="visit-status visit-status--closed" data-state="closed">
        <span className="visit-status-dot" aria-hidden />
        Cerrado · abre {status.nextOpenLabel} a las {status.nextOpenAt}
      </span>
    );
  }

  return (
    <span className="visit-status visit-status--closed" data-state="closed">
      <span className="visit-status-dot" aria-hidden />
      Cerrado
    </span>
  );
}
