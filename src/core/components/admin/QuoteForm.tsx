'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { createQuote } from '@/actions/admin/quotes';
import type { QuoteLineItem } from '@/actions/admin/quotes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FormState = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  vehicle_plate: string;
  vehicle_description: string;
  service_type: string;
  notes: string;
};

const EMPTY_ITEM: QuoteLineItem = {
  description: '',
  qty: 1,
  unit_price: 0,
  type: 'labor',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatEur(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// QuoteForm
// ---------------------------------------------------------------------------

type QuoteFormProps = {
  ivaRate: number;
  validUntilLabel: string;
};

export function QuoteForm({ ivaRate, validUntilLabel }: QuoteFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    vehicle_plate: '',
    vehicle_description: '',
    service_type: '',
    notes: '',
  });

  const [items, setItems] = useState<QuoteLineItem[]>([{ ...EMPTY_ITEM }]);

  // Computed totals
  const subtotal = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const ivaAmount = subtotal * ivaRate;
  const total = subtotal + ivaAmount;

  // ── Field change handlers ──

  function handleField(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleItemField<K extends keyof QuoteLineItem>(
    idx: number,
    field: K,
    value: QuoteLineItem[K],
  ) {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Submit ──

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createQuote({
        ...form,
        items,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push('/admin/quotes');
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ── Customer info ── */}
      <section className="glass rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Datos del cliente
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre *">
            <input
              type="text"
              required
              value={form.customer_name}
              onChange={(e) => handleField('customer_name', e.target.value)}
              placeholder="Nombre del cliente"
              className={inputCls}
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={form.customer_email}
              onChange={(e) => handleField('customer_email', e.target.value)}
              placeholder="cliente@ejemplo.com"
              className={inputCls}
            />
          </Field>

          <Field label="Teléfono">
            <input
              type="tel"
              value={form.customer_phone}
              onChange={(e) => handleField('customer_phone', e.target.value)}
              placeholder="+34 600 000 000"
              className={inputCls}
            />
          </Field>
        </div>
      </section>

      {/* ── Vehicle info ── */}
      <section className="glass rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Vehículo
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Matrícula">
            <input
              type="text"
              value={form.vehicle_plate}
              onChange={(e) =>
                handleField('vehicle_plate', e.target.value.toUpperCase())
              }
              placeholder="1234 ABC"
              className={inputCls}
            />
          </Field>

          <Field label="Descripción del vehículo">
            <input
              type="text"
              value={form.vehicle_description}
              onChange={(e) => handleField('vehicle_description', e.target.value)}
              placeholder="p.ej. Ford Focus 2019 Diesel"
              className={inputCls}
            />
          </Field>

          <Field label="Tipo de servicio *" className="sm:col-span-2">
            <input
              type="text"
              required
              value={form.service_type}
              onChange={(e) => handleField('service_type', e.target.value)}
              placeholder="p.ej. Cambio de frenos + pastillas"
              className={inputCls}
            />
          </Field>
        </div>
      </section>

      {/* ── Line items ── */}
      <section className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Conceptos
          </h2>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Añadir línea
          </button>
        </div>

        <div className="space-y-3">
          {/* Header row (desktop) */}
          <div className="hidden sm:grid grid-cols-[1fr_80px_100px_90px_32px] gap-2 text-xs text-muted-foreground px-1">
            <span>Descripción</span>
            <span className="text-center">Cant.</span>
            <span className="text-right">P. unitario</span>
            <span className="text-right">Tipo</span>
            <span />
          </div>

          {items.map((item, idx) => (
            <div
              key={idx}
              className="grid grid-cols-1 sm:grid-cols-[1fr_80px_100px_90px_32px] gap-2 items-start"
            >
              <input
                type="text"
                required
                value={item.description}
                onChange={(e) => handleItemField(idx, 'description', e.target.value)}
                placeholder="Descripción del concepto"
                className={inputCls}
              />
              <input
                type="number"
                required
                min="1"
                step="1"
                value={item.qty}
                onChange={(e) =>
                  handleItemField(idx, 'qty', parseInt(e.target.value, 10) || 1)
                }
                className={cn(inputCls, 'text-center')}
                aria-label="Cantidad"
              />
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={item.unit_price}
                onChange={(e) =>
                  handleItemField(idx, 'unit_price', parseFloat(e.target.value) || 0)
                }
                className={cn(inputCls, 'text-right')}
                aria-label="Precio unitario"
              />
              <select
                value={item.type}
                onChange={(e) =>
                  handleItemField(idx, 'type', e.target.value as QuoteLineItem['type'])
                }
                className={inputCls}
                aria-label="Tipo de concepto"
              >
                <option value="labor">Mano obra</option>
                <option value="parts">Piezas</option>
                <option value="diagnostic">Diagnóstico</option>
              </select>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                disabled={items.length === 1}
                className="h-9 w-8 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30"
                aria-label="Eliminar línea"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-border pt-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal (sin IVA)</span>
            <span>{formatEur(subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>IVA ({(ivaRate * 100).toFixed(0)}%)</span>
            <span>{formatEur(ivaAmount)}</span>
          </div>
          <div className="flex justify-between font-semibold text-foreground text-base">
            <span>Total</span>
            <span className="text-primary">{formatEur(total)}</span>
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            Presupuesto orientativo y sin compromiso. Válido hasta{' '}
            <strong>{validUntilLabel}</strong> (12 días hábiles — RD 1457/1986).
          </p>
        </div>
      </section>

      {/* ── Notes ── */}
      <section className="glass rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Notas internas
        </h2>
        <textarea
          value={form.notes}
          onChange={(e) => handleField('notes', e.target.value)}
          placeholder="Observaciones para el taller (no se muestran al cliente)"
          rows={3}
          className={cn(inputCls, 'resize-none')}
        />
      </section>

      {/* ── Error + actions ── */}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.push('/admin/quotes')}
          className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className={cn(
            'px-5 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground',
            'hover:bg-primary/90 active:bg-primary/80 transition-colors',
            'disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          {isPending ? 'Guardando…' : 'Guardar presupuesto'}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Shared input style
// ---------------------------------------------------------------------------

const inputCls =
  'w-full h-9 rounded-lg bg-secondary border border-border px-3 text-sm text-foreground' +
  ' placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40' +
  ' transition-colors';

// ---------------------------------------------------------------------------
// Field wrapper
// ---------------------------------------------------------------------------

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
