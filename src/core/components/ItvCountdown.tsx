'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { animate, useReducedMotion } from 'framer-motion';
import type { ValueAnimationTransition } from 'motion-dom';
import { MOTION } from '@/lib/motion';

/* ────────────────────────────────────────────────────────────────────────────
   getItvSchedule — exported for unit tests (src/lib/chatbot/__tests__/itv.test.ts)
   Computes next ITV date from the vehicle's FIRST registration date per RD 920/2017.
   ──────────────────────────────────────────────────────────────────────────── */
export type ItvResult = {
  frequency: 'none' | 'biennial' | 'annual';
  nextDate: Date;
  label: string;
};

export function getItvSchedule(firstRegistration: Date): ItvResult {
  const ageYears =
    (Date.now() - firstRegistration.getTime()) / (365.25 * 24 * 3600 * 1000);

  if (ageYears < 4) {
    const next = new Date(firstRegistration);
    next.setFullYear(next.getFullYear() + 4);
    return {
      frequency: 'none',
      nextDate: next,
      label: 'Primera ITV a los 4 años de la matriculación',
    };
  }
  if (ageYears < 10) {
    const cycles = Math.floor((ageYears - 4) / 2);
    const next = new Date(firstRegistration);
    next.setFullYear(next.getFullYear() + 4 + (cycles + 1) * 2);
    return {
      frequency: 'biennial',
      nextDate: next,
      label: 'ITV bienal — RD 920/2017 · vehículo 4-10 años',
    };
  }
  const cycles = Math.floor(ageYears - 10);
  const next = new Date(firstRegistration);
  next.setFullYear(next.getFullYear() + 10 + cycles + 1);
  return {
    frequency: 'annual',
    nextDate: next,
    label: 'ITV anual — RD 920/2017 · vehículo >10 años',
  };
}

/* ────────────────────────────────────────────────────────────────────────────
   ItvCountdown — bundle Section D
   Full-bleed red card with 2-column layout:
     Left  — eyebrow / headline / lead / 2 CTAs
     Right — white calc card with 3 fields + result box
   ──────────────────────────────────────────────────────────────────────────── */

type VehicleType = 'turismo' | 'furgoneta' | 'motocicleta';

/** Compute days from "last ITV date" — simplified +2 years per spec Section D. */
function calcDaysFromLastItv(
  lastItvDateStr: string,
): { days: number; nextDate: Date } | null {
  if (!lastItvDateStr) return null;
  const last = new Date(lastItvDateStr);
  if (isNaN(last.getTime())) return null;
  const next = new Date(last);
  next.setFullYear(next.getFullYear() + 2);
  const days = Math.ceil(
    (next.getTime() - Date.now()) / (24 * 3600 * 1000),
  );
  return { days, nextDate: next };
}

const PLATE_RE = /^\d{4}\s?[A-Z]{3}$/i;

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function ItvCountdown() {
  const shouldReduceMotion = useReducedMotion();

  /* ── form state ── */
  const [matricula, setMatricula] = useState('');
  const [plateError, setPlateError] = useState<string | null>(null);
  const [lastItv, setLastItv] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('turismo');

  /* ── animated display value ── */
  const [displayDays, setDisplayDays] = useState<number | null>(null);

  /* track previous tween start value */
  const prevDaysRef = useRef<number>(0);

  /* ref used to scroll/focus the calculator when "Calcular cuándo" is clicked */
  const calcRef = useRef<HTMLDivElement>(null);

  /* ── derived result (pure, not state) ── */
  const result = lastItv ? calcDaysFromLastItv(lastItv) : null;
  const targetDays = result?.days ?? null;
  const nextDate = result?.nextDate ?? null;
  const isUrgent = targetDays !== null && targetDays <= 30;

  /* ── tween the displayed number whenever targetDays changes ── */
  useEffect(() => {
    if (targetDays === null) {
      setDisplayDays(null);
      prevDaysRef.current = 0;
      return;
    }

    if (shouldReduceMotion) {
      /* Respect prefers-reduced-motion: jump straight to value */
      setDisplayDays(targetDays);
      prevDaysRef.current = targetDays;
      return;
    }

    const from = prevDaysRef.current;
    const to = targetDays;

    const tweenOptions: ValueAnimationTransition<number> = {
      duration: MOTION.itvTween.duration,
      ease: MOTION.itvTween.ease as ValueAnimationTransition<number>['ease'],
      onUpdate(latest: number) {
        setDisplayDays(Math.round(latest));
      },
      onComplete() {
        prevDaysRef.current = to;
      },
    };
    const controls = animate(from, to, tweenOptions);

    return () => controls.stop();
  }, [targetDays, shouldReduceMotion]);

  /* ── plate validation on blur ── */
  const handlePlateBlur = useCallback(() => {
    if (!matricula) {
      setPlateError(null);
      return;
    }
    if (!PLATE_RE.test(matricula.trim())) {
      setPlateError('Formato: 4 dígitos + 3 letras, p. ej. 1234 ABC');
    } else {
      setPlateError(null);
    }
  }, [matricula]);

  /* ── event dispatch helpers ── */
  function openPreItv() {
    window.dispatchEvent(
      new CustomEvent('amg:open-chat', {
        detail: { serviceId: 'pre-itv', plate: matricula },
      }),
    );
  }

  function scrollToCalc() {
    calcRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const firstInput =
      calcRef.current?.querySelector<HTMLInputElement>('input, select');
    firstInput?.focus();
  }

  function openReminder() {
    window.dispatchEvent(
      new CustomEvent('amg:open-chat', {
        detail: { serviceId: 'pre-itv-reminder', plate: matricula },
      }),
    );
  }

  return (
    <section aria-labelledby="itv-heading">
      <div className="itv-wrap">
        {/* ── Left: content column ───────────────────────────────────── */}
        <div className="itv-content">
          <p className="itv-pre">ITV a la vista</p>

          <h2 id="itv-heading">
            ¿Te toca la ITV? La pasamos nosotros.
          </h2>

          <p>
            Introduce la fecha de tu última ITV y te decimos cuánto te queda.
            Si está cerca, reservamos la pre-revisión y te llevamos el coche a
            pasar la ITV para que tú no pierdas la mañana.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={scrollToCalc}
            >
              Calcular cuándo
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-lg"
              onClick={openPreItv}
            >
              Reservar pre-ITV
            </button>
          </div>
        </div>

        {/* ── Right: calculator card ─────────────────────────────────── */}
        <div className="itv-calc" ref={calcRef}>
          <p className="eyebrow" style={{ margin: '0 0 12px' }}>
            Calculadora ITV
          </p>

          {/* Field 1: Matrícula */}
          <div className="itv-field">
            <label htmlFor="itv-plate">Matrícula</label>
            <input
              id="itv-plate"
              type="text"
              placeholder="0000 AAA"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              onBlur={handlePlateBlur}
              autoComplete="off"
              aria-describedby={plateError ? 'itv-plate-hint' : undefined}
              aria-invalid={plateError ? true : undefined}
            />
            {plateError && (
              <span id="itv-plate-hint" className="hint" role="alert">
                {plateError}
              </span>
            )}
          </div>

          {/* Field 2: Última ITV */}
          <div className="itv-field">
            <label htmlFor="itv-last-date">Fecha de la última ITV</label>
            <input
              id="itv-last-date"
              type="date"
              value={lastItv}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setLastItv(e.target.value)}
            />
            {/* Audit medium: "no me acuerdo" off-ramp routes the user to the
                chatbot, where we can look up the previous ITV by plate and
                guide them through pre-ITV booking. */}
            <button
              type="button"
              className="itv-no-date-hint"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('amg:open-chat', {
                    detail: { serviceId: 'pre-itv', plate: matricula, reason: 'no-date' },
                  }),
                )
              }
            >
              ¿No recuerdas la fecha? Te ayudamos a buscarla
            </button>
          </div>

          {/* Field 3: Tipo de vehículo */}
          <div className="itv-field">
            <label htmlFor="itv-vehicle-type">Tipo de vehículo</label>
            <select
              id="itv-vehicle-type"
              value={vehicleType}
              onChange={(e) =>
                setVehicleType(e.target.value as VehicleType)
              }
            >
              <option value="turismo">Turismo</option>
              <option value="furgoneta">Furgoneta</option>
              <option value="motocicleta">Motocicleta</option>
            </select>
          </div>

          {/* Result box — shown only once a date is entered and tween has started */}
          {displayDays !== null && nextDate !== null && (
            <div
              className="itv-result"
              role="status"
              aria-live="polite"
            >
              {/* Warning triangle — token colour, no hardcoded values */}
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--warning)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flex: 'none', marginTop: '2px' }}
                aria-hidden="true"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
                <path d="M12 9v4M12 17h.01" />
              </svg>

              <div>
                <div
                  className="itv-result-big"
                  /* Cross to primary (red) below 30-day threshold */
                  style={isUrgent ? { color: 'var(--primary)' } : undefined}
                  aria-label={`${displayDays} días para la próxima ITV`}
                >
                  {displayDays} días
                </div>
                <div className="itv-result-lab">
                  Tu ITV caduca el{' '}
                  <strong>{formatDate(nextDate)}</strong>.{' '}
                  {isUrgent
                    ? 'Reserva ya y entras esta semana.'
                    : 'Te avisamos cuando queden 30 días.'}
                </div>
              </div>
            </div>
          )}

          {/* "Avísame" CTA */}
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: '16px', width: '100%' }}
            onClick={openReminder}
          >
            Avísame cuando queden 30 días
          </button>
        </div>
      </div>
    </section>
  );
}
