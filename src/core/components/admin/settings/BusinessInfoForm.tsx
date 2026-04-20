'use client';

import { useRef, useState, useTransition } from 'react';
import { Save } from 'lucide-react';
import { updateBusinessInfo } from '@/actions/settings';
import { cn } from '@/lib/cn';

type Props = {
  initial: {
    business_name: string;
    business_tagline: string;
    business_address: string;
    business_phone: string;
    business_email: string;
    business_whatsapp: string;
  };
};

export function BusinessInfoForm({ initial }: Props) {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateBusinessInfo(fd);
      if (result.ok) {
        showToast(true, 'Información guardada correctamente');
      } else {
        showToast(false, result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Información del negocio</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Datos que aparecen en el sitio público y en los correos al cliente.
        </p>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Nombre del negocio"
            name="business_name"
            defaultValue={initial.business_name}
            required
          />
          <Field
            label="Eslogan / Tagline"
            name="business_tagline"
            defaultValue={initial.business_tagline}
          />
        </div>

        <Field
          label="Dirección"
          name="business_address"
          defaultValue={initial.business_address}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field
            label="Teléfono"
            name="business_phone"
            type="tel"
            defaultValue={initial.business_phone}
          />
          <Field
            label="Email"
            name="business_email"
            type="email"
            defaultValue={initial.business_email}
          />
          <Field
            label="WhatsApp"
            name="business_whatsapp"
            type="tel"
            defaultValue={initial.business_whatsapp}
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className={cn(
              'flex items-center gap-2 bg-primary text-primary-foreground',
              'px-4 py-2 rounded-lg text-sm font-medium transition-opacity',
              pending ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90',
            )}
          >
            <Save className="h-4 w-4" />
            {pending ? 'Guardando…' : 'Guardar cambios'}
          </button>

          {toast && (
            <span
              className={cn(
                'text-sm',
                toast.ok ? 'text-success' : 'text-destructive',
              )}
            >
              {toast.msg}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ''}
        required={required}
        className={cn(
          'w-full bg-muted border border-border rounded-lg px-3 py-2',
          'text-sm text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
          'transition-colors',
        )}
      />
    </div>
  );
}
