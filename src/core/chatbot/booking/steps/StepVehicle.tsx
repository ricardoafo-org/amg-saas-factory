'use client';

import { useState } from 'react';
import { Bubble } from '@/core/chatbot/booking/Bubble';

type VehicleData = {
  plate: string;
  model: string;
  year: string;
  km: string;
};

type Props = {
  onComplete: (data: VehicleData) => void;
};

/**
 * Step 0 — Recoge matrícula, modelo, año y kilómetros del vehículo.
 */
export function StepVehicle({ onComplete }: Props) {
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [km, setKm] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof VehicleData, string>>>({});

  function validate(): boolean {
    const next: Partial<Record<keyof VehicleData, string>> = {};
    if (!plate.trim()) next.plate = 'Introduce la matrícula';
    if (!model.trim()) next.model = 'Introduce el modelo';
    if (!year.trim()) next.year = 'Introduce el año';
    if (!km.trim()) next.km = 'Introduce los kilómetros';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onComplete({ plate: plate.trim(), model: model.trim(), year: year.trim(), km: km.trim() });
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Bubble role="bot">
        Cuéntame un poco sobre tu coche. ¿Cuál es la matrícula?
      </Bubble>

      <div className="flex flex-col gap-3">
        <Field
          label="Matrícula"
          id="vehicle-plate"
          value={plate}
          onChange={setPlate}
          placeholder="Ej. 1234 ABC"
          error={errors.plate}
          autoFocus
        />
        <Field
          label="Modelo"
          id="vehicle-model"
          value={model}
          onChange={setModel}
          placeholder="Ej. BMW Serie 3"
          error={errors.model}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Año"
            id="vehicle-year"
            value={year}
            onChange={setYear}
            placeholder="Ej. 2019"
            error={errors.year}
            inputMode="numeric"
          />
          <Field
            label="Kilómetros"
            id="vehicle-km"
            value={km}
            onChange={setKm}
            placeholder="Ej. 85000"
            error={errors.km}
            inputMode="numeric"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        className="w-full h-11 rounded-[--radius-lg] bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all duration-200"
      >
        Continuar
      </button>
    </div>
  );
}

type FieldProps = {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  autoFocus?: boolean;
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>['inputMode'];
};

function Field({ label, id, value, onChange, placeholder, error, autoFocus, inputMode }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
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
