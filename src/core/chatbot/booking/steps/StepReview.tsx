'use client';

import { useState } from 'react';
import { Bubble } from '@/core/chatbot/booking/Bubble';
import { saveAppointment } from '@/actions/chatbot';
import type { Service } from '@/core/types/adapter';

type VehicleData = { plate: string; model: string; year: string; km: string };
type GuestData = { name: string; phone: string; email: string; consent: true; policyHash: string };

type Props = {
  tenantId: string;
  vehicle: VehicleData;
  selectedServiceIds: string[];
  slotISO: string;
  slotId: string;
  guest: GuestData;
  services: Service[];
  ivaRate: number;
  policyVersion: string;
  policyHash: string;
  onSuccess: () => void;
};

/**
 * Step 4 — Resumen de la reserva + botón Confirmar.
 * Llama a saveAppointment, que ya garantiza el orden LOPDGDD:
 *   1. consent_log.create()  ← ANTES de cualquier escritura personal
 *   2. appointments.create()
 */
export function StepReview({
  tenantId,
  vehicle,
  selectedServiceIds,
  slotISO,
  slotId: _slotId,
  guest,
  services,
  ivaRate,
  policyVersion,
  policyHash,
  onSuccess,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const baseTotal = selectedServices.reduce((acc, s) => acc + s.basePrice, 0);
  const ivaAmount = baseTotal * ivaRate;
  const total = baseTotal + ivaAmount;

  const slotDate = slotISO.split('T')[0] ?? '';
  const slotTime = slotISO.split('T')[1]?.slice(0, 5) ?? '';
  const slotLabel = slotDate
    ? new Date(`${slotDate}T00:00:00`).toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : slotISO;

  const fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

  async function handleConfirm() {
    setSaving(true);
    setSaveError(false);
    try {
      await saveAppointment({
        tenantId,
        matricula: vehicle.plate,
        fuelType: '',
        fechaPreferida: slotDate,
        customerName: guest.name,
        customerPhone: guest.phone,
        customerEmail: guest.email,
        serviceIds: selectedServiceIds,
        policyVersion,
        policyHash,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      });
      setSaved(true);
      onSuccess();
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Bubble role="bot">
          ¡Todo listo! Tu cita ha quedado confirmada. Recibirás un correo de confirmación en breve.
        </Bubble>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Bubble role="bot">
        Revisa los detalles de tu reserva antes de confirmar.
      </Bubble>

      {/* Summary rows */}
      <div className="rounded-[--radius-lg] border border-border/60 bg-background/40 overflow-hidden divide-y divide-border/30">
        <SummaryRow label="Vehículo" value={`${vehicle.plate} · ${vehicle.model}`} />
        <SummaryRow
          label="Servicios"
          value={selectedServices.length > 0
            ? selectedServices.map((s) => s.name).join(', ')
            : 'Sin selección'}
        />
        <SummaryRow label="Fecha" value={`${slotLabel}${slotTime ? ` · ${slotTime}` : ''}`} />
        <SummaryRow label="Nombre" value={guest.name} />
        <SummaryRow label="Teléfono" value={guest.phone} />
        <SummaryRow label="Correo" value={guest.email} />
      </div>

      {/* IVA breakdown — required by RD 1457/1986 */}
      {selectedServices.length > 0 && (
        <div className="rounded-[--radius-lg] border border-border/60 bg-background/20 px-3.5 py-3 space-y-1 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Base imponible</span>
            <span className="font-mono font-variant-numeric tabular-nums">{fmt.format(baseTotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>IVA ({(ivaRate * 100).toFixed(0)} %)</span>
            <span className="font-mono font-variant-numeric tabular-nums">{fmt.format(ivaAmount)}</span>
          </div>
          <div className="flex justify-between font-semibold text-foreground pt-1 border-t border-border/40">
            <span>Total estimado</span>
            <span className="font-mono font-variant-numeric tabular-nums gradient-text">{fmt.format(total)}</span>
          </div>
          <p className="text-[10px] text-muted-foreground/50 pt-1">
            Precio orientativo. IVA incluido. El presupuesto definitivo puede variar según el diagnóstico.
            Todo trabajo está sujeto a presupuesto previo según RD 1457/1986.
          </p>
        </div>
      )}

      {saveError && (
        <Bubble role="bot">
          Lo sentimos, ha ocurrido un error al registrar tu cita. Por favor, inténtalo de nuevo o llámanos directamente.
        </Bubble>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={saving}
        className="w-full h-11 rounded-[--radius-lg] bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all duration-200"
      >
        {saving ? 'Confirmando…' : 'Confirmar cita'}
      </button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-3.5 py-2.5 text-xs">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground text-right">{value}</span>
    </div>
  );
}
