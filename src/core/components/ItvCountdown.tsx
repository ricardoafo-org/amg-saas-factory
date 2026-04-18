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

  const urgencyColor = isOverdue
    ? 'border-destructive/60 bg-destructive/5'
    : isUrgent
      ? 'border-accent/60 bg-accent/5'
      : 'border-green-500/30 bg-green-500/5';
  const UrgencyIcon = isOverdue ? AlertTriangle : isUrgent ? Clock : CheckCircle;
  const urgencyIconColor = isOverdue ? 'text-destructive' : isUrgent ? 'text-accent' : 'text-green-500';

  return (
    <section className="relative px-5 py-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/50 to-background" aria-hidden />
      <div className="absolute inset-0 grid-bg opacity-20" aria-hidden />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-primary/4 blur-[100px] rounded-full" aria-hidden />

      <div className="relative z-10 mx-auto max-w-2xl">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-mono text-primary tracking-[0.2em] uppercase">Herramienta gratuita</p>
          <h2 className="text-4xl font-extrabold tracking-tight">
            Comprueba tu <span className="gradient-text">ITV</span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Calcula cuándo te toca la próxima ITV según el RD 920/2017
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
                className="group inline-flex items-center gap-3 h-14 px-8 rounded-[--radius-lg] glass-strong border border-primary/25 text-sm font-semibold text-primary hover:border-primary/50 hover:bg-primary/8 transition-all duration-200"
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
              {/* Guidance card */}
              <div className="glass-strong rounded-[--radius-xl] p-5 border border-border/50">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex items-center justify-center w-9 h-9 rounded-[--radius] bg-primary/10 border border-primary/25 shrink-0">
                    <FileText className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">¿Dónde encuentro la fecha de matriculación?</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Busca «Primera matriculación» en cualquiera de estos documentos:</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { title: 'Ficha Técnica', sub: 'Campo B — Fecha primera matric.' },
                    { title: 'Permiso de circulación', sub: 'Parte delantera del documento' },
                    { title: 'Póliza de seguro', sub: 'Datos del vehículo asegurado' },
                  ].map(({ title, sub }) => (
                    <div key={title} className="rounded-[--radius-lg] bg-background/40 border border-border/40 p-3">
                      <p className="text-xs font-semibold">{title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date picker */}
              <div className="glass-strong rounded-[--radius-xl] p-6 space-y-4">
                <label className="block text-sm font-medium">Fecha de primera matriculación</label>
                <div className="flex gap-3">
                  <input
                    autoFocus
                    type="date"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDateSubmit()}
                    max={new Date().toISOString().split('T')[0]}
                    className="flex-1 h-12 rounded-[--radius-lg] bg-background/60 border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                  />
                  <button
                    onClick={handleDateSubmit}
                    disabled={!dateInput}
                    className="h-12 px-6 rounded-[--radius-lg] bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 hover:bg-primary/90 transition-colors"
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
              className={cn('rounded-[--radius-xl] p-8 border-2 space-y-5', urgencyColor)}
            >
              <div className="flex items-start gap-4">
                <div className={cn('flex items-center justify-center w-12 h-12 rounded-[--radius-lg] bg-background/40', urgencyIconColor)}>
                  <UrgencyIcon
                    className={cn('h-6 w-6', urgencyIconColor)}
                    style={isOverdue ? { animation: 'itv-pulse 1400ms cubic-bezier(0.4,0,0.6,1) infinite' } : undefined}
                  />
                </div>
                <div className="flex-1">
                  <div className="text-3xl font-extrabold font-mono tracking-tight">
                    {isOverdue
                      ? `−${Math.abs(days)} días`
                      : days === 0
                        ? '¡Hoy!'
                        : `${days} días`}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isOverdue ? 'ITV vencida' : 'hasta la próxima ITV'}
                  </p>
                </div>
                <button
                  onClick={() => { setPhase('idle'); setDateInput(''); }}
                  className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  Resetear
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-[--radius-lg] bg-background/40 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-mono">Próxima ITV</p>
                  <p className="font-semibold">
                    {schedule.nextDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="rounded-[--radius-lg] bg-background/40 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-mono">Frecuencia</p>
                  <p className="font-semibold capitalize">
                    {schedule.frequency === 'none' ? 'Primera vez' : schedule.frequency === 'biennial' ? 'Bienal' : 'Anual'}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground/70 font-mono">{schedule.label}</p>

              {(isOverdue || isUrgent) && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-sm font-medium mb-3">
                    {isOverdue
                      ? '⚠️ Circular sin ITV en vigor es una infracción grave (RDL 6/2015).'
                      : '¡Reserva tu revisión Pre-ITV cuanto antes!'}
                  </p>
                  {onBookPreItv && (
                    <button
                      onClick={onBookPreItv}
                      className="inline-flex items-center gap-2 h-10 px-5 rounded-[--radius-lg] bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
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
