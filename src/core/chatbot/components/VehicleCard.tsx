'use client';

import { motion } from 'framer-motion';
import { MOTION } from '@/lib/motion';

export type VehicleData = {
  plate: string;
  model: string;
  year: string;
  km: string;
};

type Props = {
  vehicle: VehicleData;
  onConfirm: () => void;
  onReject: () => void;
};

const carIconPath =
  'M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2';

export function VehicleCard({ vehicle, onConfirm, onReject }: Props) {
  const lines: [string, string, boolean][] = [
    ['Matrícula', vehicle.plate,  true],
    ['Modelo',    vehicle.model,  false],
    ['Año',       vehicle.year,   false],
    ['Km',        vehicle.km,     true],
  ];

  return (
    <motion.div
      {...MOTION.chatMessage}
      style={{
        alignSelf: 'flex-start',
        maxWidth: '92%',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 14,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'var(--primary-muted)',
            color: 'var(--primary)',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d={carIconPath} />
            <circle cx="6.5" cy="16.5" r="2.5" />
            <circle cx="16.5" cy="16.5" r="2.5" />
          </svg>
        </div>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)' }}>¿Es este tu coche?</div>
      </div>

      {/* Data rows */}
      <div style={{ display: 'grid', gap: 0, fontSize: 12, marginBottom: 12 }}>
        {lines.map(([k, v, mono]) => (
          <div
            key={k}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '5px 0',
              borderBottom: '1px dashed var(--border)',
            }}
          >
            <span
              style={{
                color: 'var(--fg-muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {k}
            </span>
            <span
              style={{
                fontWeight: 500,
                fontFamily: mono ? 'var(--font-mono)' : 'inherit',
                fontSize: 12,
              }}
            >
              {v}
            </span>
          </div>
        ))}
      </div>

      {/* CTA note */}
      <div
        style={{
          fontSize: 11,
          color: 'var(--fg-muted)',
          marginBottom: 10,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.04em',
        }}
      >
        Recuperado de Tráfico · ¿Es correcto?
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          onClick={onConfirm}
          style={{
            flex: 1,
            height: 36,
            background: 'var(--primary)',
            color: 'var(--primary-fg)',
            border: 0,
            borderRadius: 8,
            font: '600 12px var(--font-sans)',
            cursor: 'pointer',
          }}
        >
          Sí
        </button>
        <button
          type="button"
          onClick={onReject}
          style={{
            flex: 1,
            height: 36,
            background: 'var(--card)',
            color: 'var(--fg)',
            border: '1px solid var(--border-strong)',
            borderRadius: 8,
            font: '600 12px var(--font-sans)',
            cursor: 'pointer',
          }}
        >
          No
        </button>
      </div>
    </motion.div>
  );
}
