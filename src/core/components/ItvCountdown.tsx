'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Clock, Car, ArrowRight, FileText } from 'lucide-react';
import { cn } from '@/lib/cn';

type ItvResult = {
  frequency: 'none' | 'biennial' | 'annual';
  nextDate: Date;
  label: string;
};

export function getItvSchedule(firstRegistration: Date): ItvResult {
  const ageYears = (Date.now() - firstRegistration.getTime()) / (365.25 * 24 * 3600 * 1000);

  if (ageYears < 4) {
    const next = new Date(firstRegistration);
    next.setFullYear(next.getFullYear() + 4);
    return { frequency: 'none', nextDate: next, label: 'Primera ITV a los 4 años de la matriculación' };
  }
  if (ageYears < 10) {
    const cycles = Math.floor((ageYears - 4) / 2);
    const next = new Date(firstRegistration);
    next.setFullYear(next.getFullYear() + 4 + (cycles + 1) * 2);
    return { frequency: 'biennial', nextDate: next, label: 'ITV bienal — RD 920/2017 · vehículo 4-10 años' };
  }
  const cycles = Math.floor(ageYears - 10);
  const next = new Date(firstRegistration);
  next.setFullYear(next.getFullYear() + 10 + cycles + 1);
  return { frequency: 'annual', nextDate: next, label: 'ITV anual — RD 920/2017 · vehículo >10 años' };
}

type Phase = 'idle' | 'date-input' | 'result';

export function ItvCountdown({ onBookPreItv }: { onBookPreItv?: () => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [dateInput, setDateInput] = useState('');

  function handleDateSubmit() {
    if (!dateInput) return;
    setPhase('result');
  }

  const schedule = useMemo(() => {
    if (phase !== 'result' || !dateInput) return null;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return null;
    return getItvSchedule(d);
  }, [phase, dateInput]);

  const days = schedule ? Math.ceil((schedule.nextDate.getTime() - Date.now()) / (24 * 3600 * 1000)) : null;
  const isOverdue = days !== null && days < 0;
  const isUrgent = days !== null && days >= 0 && days <= 30;

  const urgencyTone = isOverdue
    ? 'border-destructive bg-[oklch(0.55_0.22_28/0.06)]'
    : isUrgent
      ? 'border-[--brand-amber] bg-[--accent-muted]'
      : 'border-success bg-[--success-muted]';
  const UrgencyIcon = isOverdue ? AlertTriangle : isUrgent ? Clock : CheckCircle;
  const urgencyIconColor = isOverdue ? 'text-destructive' : isUrgent ? 'text-[--brand-amber]' : 'text-success';

  return (
    <section className="relative px-5 py-20 sm:py-24 paper">
      <div className="relative mx-auto max-w-2xl">
        <div className="mb-10 flex flex-col items-center text-center gap-3">
          <span className="amg-stripes" aria-hidden>
            <span /><span /><span />
          </span>
          <p className="eyebrow">Herramienta gratuita</p>
          <h2 className="h2">¿Cuándo te toca la ITV?</h2>
          <p className="lead max-w-md">
            Calcula la próxima ITV según el RD 920/2017 sin registrarte ni dejar el correo.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="text-center"
            >
              <button
                onClick={() => setPhase('date-input')}
                className="group inline-flex items-center gap-3 h-13 px-7 rounded-[--radius-md] bg-primary text-primary-foreground text-base font-semibold hover:bg-[--brand-red-dark] active:translate-y-px transition-all duration-150"
              >
                <Car className="h-5 w-5" />
                Calcular mi ITV
                <ArrowRight className="h-4 w-4 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
              </button>
            </motion.div>
          )}

          {phase === 'date-input' && (
            <motion.div
              key="date"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <div className="ticket p-5 relative overflow-hidden">
                <div className="amg-edge" aria-hidden />
                <div className="pl-3 flex items-start gap-3 mb-4">
                  <div className="flex items-center justify-center w-9 h-9 rounded-[--radius] bg-secondary border border-border shrink-0">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">¿Dónde encuentro la fecha de matriculación?</p>
                    <p className="meta mt-1">Busca «Primera matriculación» en cualquiera de estos documentos:</p>
                  </div>
                </div>
                <div className="pl-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { title: 'Ficha Técnica', sub: 'Campo B — Fecha primera matric.' },
                    { title: 'Permiso de circulación', sub: 'Parte delantera del documento' },
                    { title: 'Póliza de seguro', sub: 'Datos del vehículo asegurado' },
                  ].map(({ title, sub }) => (
                    <div key={title} className="rounded-[--radius] bg-secondary border border-border p-3">
                      <p className="text-xs font-semibold">{title}</p>
                      <p className="meta mt-0.5">{sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ticket p-6 space-y-4">
                <label className="block text-sm font-medium">Fecha de primera matriculación</label>
                <div className="flex gap-3">
                  <input
                    autoFocus
                    type="date"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDateSubmit()}
                    max={new Date().toISOString().split('T')[0]}
                    className="flex-1 h-12 rounded-[--radius] bg-card border border-border px-4 text-sm focus:outline-none focus:shadow-[--shadow-focus]"
                  />
                  <button
                    onClick={handleDateSubmit}
                    disabled={!dateInput}
                    className="h-12 px-6 rounded-[--radius-md] bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-45 hover:bg-[--brand-red-dark] active:translate-y-px transition-all duration-150"
                  >
                    Calcular
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {phase === 'result' && schedule && days !== null && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn('rounded-[--radius-xl] p-8 border-2 space-y-5 shadow-[var(--shadow-card)]', urgencyTone)}
            >
              <div className="flex items-start gap-4">
                <div className={cn('flex items-center justify-center w-12 h-12 rounded-[--radius-lg] bg-card border border-border', urgencyIconColor)}>
                  <UrgencyIcon
                    className={cn('h-6 w-6', urgencyIconColor)}
                    style={isOverdue ? { animation: 'itv-pulse 1400ms cubic-bezier(0.4,0,0.6,1) infinite' } : undefined}
                  />
                </div>
                <div className="flex-1">
                  <div className="font-[family-name:var(--font-archivo-black)] text-3xl tracking-tight text-foreground">
                    {isOverdue
                      ? `−${Math.abs(days)} días`
                      : days === 0
                        ? '¡Hoy!'
                        : `${days} días`}
                  </div>
                  <p className="text-sm text-[--fg-secondary] mt-1">
                    {isOverdue ? 'ITV vencida' : 'hasta la próxima ITV'}
                  </p>
                </div>
                <button
                  onClick={() => { setPhase('idle'); setDateInput(''); }}
                  className="meta hover:text-foreground transition-colors"
                >
                  Resetear
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-[--radius] bg-card border border-border p-3">
                  <p className="meta mb-1">Próxima ITV</p>
                  <p className="font-semibold">
                    {schedule.nextDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="rounded-[--radius] bg-card border border-border p-3">
                  <p className="meta mb-1">Frecuencia</p>
                  <p className="font-semibold capitalize">
                    {schedule.frequency === 'none' ? 'Primera vez' : schedule.frequency === 'biennial' ? 'Bienal' : 'Anual'}
                  </p>
                </div>
              </div>

              <p className="meta">{schedule.label}</p>

              {(isOverdue || isUrgent) && (
                <div className="pt-2 border-t border-border">
                  <p className="text-sm font-medium mb-3">
                    {isOverdue
                      ? 'Circular sin ITV en vigor es una infracción grave (RDL 6/2015).'
                      : 'Te conviene reservar tu Pre-ITV cuanto antes.'}
                  </p>
                  {onBookPreItv && (
                    <button
                      onClick={onBookPreItv}
                      className="inline-flex items-center gap-2 h-11 px-5 rounded-[--radius-md] bg-primary text-primary-foreground text-sm font-semibold hover:bg-[--brand-red-dark] active:translate-y-px transition-all duration-150"
                    >
                      Reservar Pre-ITV <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
