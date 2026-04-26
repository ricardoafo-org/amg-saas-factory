'use client';

import { useState } from 'react';
import { Bubble } from '@/core/chatbot/booking/Bubble';

type GuestData = {
  name: string;
  phone: string;
  email: string;
  consent: true;
  policyHash: string;
};

type Props = {
  policyUrl: string;
  policyVersion: string;
  policyHash: string;
  onComplete: (data: GuestData) => void;
};

/**
 * Step 3 — Recoge nombre, teléfono, email y consentimiento LOPD.
 * Invariant: checkbox defaultChecked={false} — nunca pre-marcado (LOPDGDD).
 */
export function StepGuest({ policyUrl, policyVersion, policyHash, onComplete }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Introduce tu nombre';
    if (!phone.trim()) next.phone = 'Introduce tu teléfono';
    if (!email.trim()) {
      next.email = 'Introduce tu correo electrónico';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = 'El formato del correo no es válido';
    }
    if (!consent) next.consent = 'Debes aceptar la política de privacidad para continuar';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onComplete({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      consent: true,
      policyHash,
    });
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Bubble role="bot">
        Casi listo. Necesito tus datos de contacto para confirmar la cita.
      </Bubble>

      <div className="flex flex-col gap-3">
        <GuestField
          label="Nombre"
          id="guest-name"
          type="text"
          value={name}
          onChange={setName}
          placeholder="Tu nombre completo"
          error={errors.name}
          autoFocus
          autoComplete="name"
        />
        <GuestField
          label="Teléfono"
          id="guest-phone"
          type="tel"
          value={phone}
          onChange={setPhone}
          placeholder="Ej. 612 345 678"
          error={errors.phone}
          autoComplete="tel"
          inputMode="tel"
        />
        <GuestField
          label="Correo electrónico"
          id="guest-email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="nombre@ejemplo.com"
          error={errors.email}
          autoComplete="email"
        />
      </div>

      {/* LOPDGDD: checkbox MUST default unchecked (components.md invariant) */}
      <div className="space-y-1">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            id="guest-consent"
            type="checkbox"
            checked={consent}
            defaultChecked={false}
            onChange={(e) => {
              setConsent(e.target.checked);
              if (e.target.checked && errors.consent) {
                setErrors((prev) => { const next = { ...prev }; delete next.consent; return next; });
              }
            }}
            aria-invalid={!!errors.consent}
            aria-describedby={errors.consent ? 'guest-consent-error' : undefined}
            className="mt-0.5 h-4 w-4 rounded border border-border accent-primary cursor-pointer"
          />
          <span className="text-xs text-muted-foreground leading-relaxed">
            Acepto el tratamiento de mis datos conforme a la{' '}
            <a
              href={policyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-primary hover:text-primary/80"
            >
              Política de Privacidad
            </a>{' '}
            (v{policyVersion}) — LOPDGDD.
          </span>
        </label>
        {errors.consent && (
          <p id="guest-consent-error" role="alert" className="text-xs text-destructive ml-7">
            {errors.consent}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!consent}
        aria-disabled={!consent}
        className="w-full h-11 rounded-[--radius-lg] bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 transition-all duration-200"
      >
        Continuar
      </button>

      <p className="text-[10px] text-muted-foreground/50 text-center">
        Todo trabajo está sujeto a presupuesto previo según el RD 1457/1986.
      </p>
    </div>
  );
}

type FieldProps = {
  label: string;
  id: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  autoFocus?: boolean;
  autoComplete?: string;
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>['inputMode'];
};

function GuestField({
  label,
  id,
  type,
  value,
  onChange,
  placeholder,
  error,
  autoFocus,
  autoComplete,
  inputMode,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={[
          'h-10 rounded-[--radius-lg] bg-background/60 border px-3 text-sm',
          'focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50',
          'placeholder:text-muted-foreground/40',
          error ? 'border-destructive' : 'border-border',
        ].join(' ')}
      />
      {error && (
        <span id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
