'use client';

import { motion } from 'framer-motion';
import { MOTION } from '@/lib/motion';

export type SummaryData = {
  serviceName: string;
  duration: string;
  plate: string;
  when: string;   // e.g. "Mañana · 10:30"
  where: string;  // e.g. "Calle Mayor 42, Cartagena"
  total: string | null; // formatted price string, null if no price
};

type Props = {
  data: SummaryData;
  onConfirm: () => void;
  saving?: boolean;
};

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div
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
          fontSize: 12,
          fontWeight: 500,
          fontFamily: mono ? 'var(--font-mono)' : 'inherit',
        }}
      >
        {v}
      </span>
    </div>
  );
}

export function SummaryCard({ data, onConfirm, saving = false }: Props) {
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
      {/* Title row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)' }}>Resumen</div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--primary)',
            background: 'var(--primary-muted)',
            padding: '2px 7px',
            borderRadius: 4,
            letterSpacing: '0.06em',
          }}
        >
          CITA · NUEVA
        </span>
      </div>

      {/* Rows */}
      <Row k="Servicio"  v={data.serviceName} />
      <Row k="Duración"  v={data.duration}    mono />
      <Row k="Matrícula" v={data.plate}        mono />
      <Row k="Cuándo"    v={data.when} />
      <Row k="Dónde"     v={data.where} />

      {/* Total */}
      {data.total != null && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: 10,
            marginTop: 6,
            borderTop: '1px solid var(--border)',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--fg)', fontWeight: 600 }}>Total (IVA incl.)</span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              fontSize: 13,
            }}
          >
            {data.total}
          </span>
        </div>
      )}

      {/* Confirm button */}
      <button
        type="button"
        onClick={onConfirm}
        disabled={saving}
        style={{
          width: '100%',
          marginTop: 12,
          height: 42,
          background: 'var(--primary)',
          color: 'var(--primary-fg)',
          border: 0,
          borderRadius: 10,
          font: '600 13px var(--font-sans)',
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? 'Guardando…' : 'Confirmar cita'}
      </button>

      {/* Cancellation note */}
      <div
        style={{
          fontSize: 10,
          color: 'var(--fg-muted)',
          marginTop: 8,
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.04em',
        }}
      >
        Puedes cancelar gratis hasta 2h antes.
      </div>
    </motion.div>
  );
}
