'use client';

import { useState, useTransition } from 'react';
import { Save } from 'lucide-react';
import { updateOpeningHours } from '@/actions/settings';
import { cn } from '@/lib/cn';

type DayHours = {
  open: boolean;
  from: string;
  to: string;
};

type HoursMap = Record<string, DayHours>;

const DAYS: { key: string; label: string }[] = [
  { key: 'lunes',     label: 'Lunes' },
  { key: 'martes',    label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves',    label: 'Jueves' },
  { key: 'viernes',   label: 'Viernes' },
  { key: 'sabado',    label: 'Sábado' },
  { key: 'domingo',   label: 'Domingo' },
];

const DEFAULT_HOURS: DayHours = { open: true, from: '08:00', to: '20:00' };

function parseHours(raw: string): HoursMap {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: HoursMap = {};
    for (const { key } of DAYS) {
      const day = parsed[key];
      if (day && typeof day === 'object') {
        const d = day as Record<string, unknown>;
        result[key] = {
          open: Boolean(d['open']),
          from: String(d['from'] ?? DEFAULT_HOURS.from),
          to: String(d['to'] ?? DEFAULT_HOURS.to),
        };
      } else {
        result[key] = { ...DEFAULT_HOURS };
      }
    }
    return result;
  } catch {
    return Object.fromEntries(DAYS.map(({ key }) => [key, { ...DEFAULT_HOURS }]));
  }
}

type Props = {
  initialHoursJson: string;
};

export function OpeningHoursForm({ initialHoursJson }: Props) {
  const [hours, setHours] = useState<HoursMap>(() => parseHours(initialHoursJson));
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  }

  function setDay(key: string, patch: Partial<DayHours>) {
    setHours((prev) => ({ ...prev, [key]: { ...prev[key]!, ...patch } }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    for (const { key } of DAYS) {
      const day = hours[key]!;
      fd.set(`${key}_open`, String(day.open));
      fd.set(`${key}_from`, day.from);
      fd.set(`${key}_to`, day.to);
    }
    startTransition(async () => {
      const result = await updateOpeningHours(fd);
      if (result.ok) {
        showToast(true, 'Horarios guardados');
      } else {
        showToast(false, result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Horario de apertura</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Activa o desactiva cada día e indica el rango horario.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="glass rounded-xl overflow-hidden divide-y divide-border">
          {DAYS.map(({ key, label }) => {
            const day = hours[key]!;
            return (
              <div
                key={key}
                className={cn(
                  'flex items-center gap-4 px-4 py-3 transition-colors',
                  !day.open && 'opacity-50',
                )}
              >
                {/* Day label + toggle */}
                <div className="flex items-center gap-3 w-32 shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={day.open}
                    onClick={() => setDay(key, { open: !day.open })}
                    className={cn(
                      'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent',
                      'transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50',
                      day.open ? 'bg-primary' : 'bg-muted-foreground/30',
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow',
                        'transform transition-transform',
                        day.open ? 'translate-x-4' : 'translate-x-0',
                      )}
                    />
                  </button>
                  <span className="text-sm font-medium text-foreground">{label}</span>
                </div>

                {/* Time range */}
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={day.from}
                    disabled={!day.open}
                    onChange={(e) => setDay(key, { from: e.target.value })}
                    className={cn(
                      'bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
                      'disabled:cursor-not-allowed',
                    )}
                  />
                  <span className="text-muted-foreground text-sm">a</span>
                  <input
                    type="time"
                    value={day.to}
                    disabled={!day.open}
                    onChange={(e) => setDay(key, { to: e.target.value })}
                    className={cn(
                      'bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
                      'disabled:cursor-not-allowed',
                    )}
                  />
                </div>

                {/* Closed label */}
                {!day.open && (
                  <span className="text-xs text-muted-foreground shrink-0">Cerrado</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className={cn(
              'flex items-center gap-2 bg-primary text-primary-foreground',
              'px-4 py-2 rounded-lg text-sm font-medium transition-opacity',
              pending ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90',
            )}
          >
            <Save className="h-4 w-4" />
            {pending ? 'Guardando…' : 'Guardar horarios'}
          </button>

          {toast && (
            <span className={cn('text-sm', toast.ok ? 'text-success' : 'text-destructive')}>
              {toast.msg}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
