'use client';

import { useState, useTransition } from 'react';
import { X } from 'lucide-react';
import { updateCustomer } from '@/actions/admin/customers';
import type { CustomerRow } from '@/actions/admin/customers';

type Props = {
  customer: Pick<
    CustomerRow,
    'id' | 'name' | 'phone' | 'notes' | 'preferred_contact' | 'marketing_consent'
  >;
  onClose: () => void;
};

export function EditCustomerModal({ customer, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone ?? '');
  const [notes, setNotes] = useState(customer.notes ?? '');
  const [preferredContact, setPreferredContact] = useState(
    customer.preferred_contact,
  );
  const [marketingConsent, setMarketingConsent] = useState(
    customer.marketing_consent,
  );
  const [confirmConsent, setConfirmConsent] = useState(false);

  const consentChanged = marketingConsent !== customer.marketing_consent;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (consentChanged && !confirmConsent) {
      setError(
        'Por favor confirma el cambio de consentimiento marcando la casilla inferior.',
      );
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await updateCustomer(customer.id, {
        name,
        phone,
        notes,
        preferred_contact: preferredContact,
        marketing_consent: marketingConsent,
      });
      if (result.success) {
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Editar cliente"
    >
      {/* Backdrop */}
      <button
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-label="Cerrar"
      />

      {/* Panel */}
      <div className="relative glass-strong rounded-2xl w-full max-w-md p-6 shadow-[var(--shadow-dialog)]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-foreground">Editar cliente</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="edit-name" className="block text-xs font-medium text-muted-foreground mb-1">
              Nombre completo
            </label>
            <input
              id="edit-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="edit-phone" className="block text-xs font-medium text-muted-foreground mb-1">
              Teléfono
            </label>
            <input
              id="edit-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Preferred contact */}
          <div>
            <label htmlFor="edit-preferred" className="block text-xs font-medium text-muted-foreground mb-1">
              Contacto preferido
            </label>
            <select
              id="edit-preferred"
              value={preferredContact}
              onChange={(e) =>
                setPreferredContact(
                  e.target.value as CustomerRow['preferred_contact'],
                )
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="sms">SMS</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="edit-notes" className="block text-xs font-medium text-muted-foreground mb-1">
              Notas
            </label>
            <textarea
              id="edit-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>

          {/* Marketing consent toggle */}
          <div className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">
                Acepta comunicaciones comerciales
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={marketingConsent}
                onClick={() => {
                  setMarketingConsent((v) => !v);
                  setConfirmConsent(false);
                }}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                  marketingConsent ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-card transition-transform ${
                    marketingConsent ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {consentChanged && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmConsent}
                  onChange={(e) => setConfirmConsent(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 accent-primary"
                />
                <span className="text-xs text-muted-foreground">
                  Confirmo el cambio de preferencia de consentimiento del cliente (LOPDGDD)
                </span>
              </label>
            )}
          </div>

          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm rounded-lg bg-secondary text-secondary-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
