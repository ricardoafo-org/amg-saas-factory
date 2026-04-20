'use client';

import { useState, useTransition } from 'react';
import { Plus, Pencil, PowerOff, Power, X, Save } from 'lucide-react';
import { upsertService, toggleServiceActive } from '@/actions/settings';
import { cn } from '@/lib/cn';

type Service = {
  id: string;
  name: string;
  category: string;
  base_price: number;
  duration_minutes: number;
  description: string;
  active: boolean;
};

type Props = {
  services: Service[];
  ivaRate: number;
};

type EditingService = Partial<Service> | null;

export function ServiceCatalogEditor({ services: initialServices, ivaRate }: Props) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [editing, setEditing] = useState<EditingService>(null);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  }

  function openAdd() {
    setEditing({ name: '', category: '', base_price: 0, duration_minutes: 60, description: '' });
  }

  function openEdit(svc: Service) {
    setEditing(svc);
  }

  function handleToggle(svc: Service) {
    startTransition(async () => {
      const result = await toggleServiceActive(svc.id, !svc.active);
      if (result.ok) {
        setServices((prev) =>
          prev.map((s) => (s.id === svc.id ? { ...s, active: !svc.active } : s)),
        );
        showToast(true, svc.active ? 'Servicio desactivado' : 'Servicio activado');
      } else {
        showToast(false, result.error);
      }
    });
  }

  function handleModalSave(fd: FormData) {
    startTransition(async () => {
      const result = await upsertService(fd);
      if (result.ok) {
        // Optimistic: build updated record from form data
        const id = String(fd.get('id') ?? '').trim() || result.id;
        const updated: Service = {
          id,
          name: String(fd.get('name') ?? ''),
          category: String(fd.get('category') ?? ''),
          base_price: parseFloat(String(fd.get('base_price') ?? '0')),
          duration_minutes: parseInt(String(fd.get('duration_minutes') ?? '60'), 10),
          description: String(fd.get('description') ?? ''),
          active: true,
        };

        setServices((prev) => {
          const idx = prev.findIndex((s) => s.id === id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = updated;
            return copy;
          }
          return [...prev, updated];
        });

        setEditing(null);
        showToast(true, 'Servicio guardado');
      } else {
        showToast(false, result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Catálogo de servicios</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            IVA aplicado: {(ivaRate * 100).toFixed(0)}% (solo lectura — operación contable)
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus className="h-4 w-4" />
          Añadir servicio
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <p className={cn('text-sm', toast.ok ? 'text-success' : 'text-destructive')}>
          {toast.msg}
        </p>
      )}

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        {services.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No hay servicios. Añade el primer servicio.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Nombre</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Categoría</th>
                <th className="text-right px-4 py-3 font-medium">Precio s/IVA</th>
                <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Con IVA</th>
                <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">Duración</th>
                <th className="text-center px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {services.map((svc) => (
                <tr
                  key={svc.id}
                  className={cn(
                    'transition-colors hover:bg-muted/30',
                    !svc.active && 'opacity-50',
                  )}
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    <button
                      onClick={() => openEdit(svc)}
                      className="text-left hover:text-primary transition-colors"
                    >
                      {svc.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {svc.category || '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {svc.base_price.toFixed(2)} €
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
                    {(svc.base_price * (1 + ivaRate)).toFixed(2)} €
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell">
                    {svc.duration_minutes} min
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        svc.active
                          ? 'bg-success/15 text-success'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {svc.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(svc)}
                        aria-label="Editar servicio"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggle(svc)}
                        disabled={pending}
                        aria-label={svc.active ? 'Desactivar' : 'Activar'}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        {svc.active
                          ? <PowerOff className="h-3.5 w-3.5" />
                          : <Power className="h-3.5 w-3.5" />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit modal */}
      {editing !== null && (
        <ServiceModal
          service={editing}
          pending={pending}
          onSave={handleModalSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────

function ServiceModal({
  service,
  pending,
  onSave,
  onClose,
}: {
  service: EditingService;
  pending: boolean;
  onSave: (fd: FormData) => void;
  onClose: () => void;
}) {
  const isNew = !service?.id;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSave(new FormData(e.currentTarget));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-label="Cerrar"
      />

      {/* Dialog */}
      <div className="relative glass-strong rounded-2xl p-6 w-full max-w-md shadow-dialog">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-foreground">
            {isNew ? 'Nuevo servicio' : 'Editar servicio'}
          </h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Hidden id */}
          <input type="hidden" name="id" value={service?.id ?? ''} />

          <ModalField label="Nombre" name="name" defaultValue={service?.name ?? ''} required />
          <ModalField label="Categoría" name="category" defaultValue={service?.category ?? ''} />

          <div className="grid grid-cols-2 gap-4">
            <ModalField
              label="Precio s/IVA (€)"
              name="base_price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={String(service?.base_price ?? '0')}
              required
            />
            <ModalField
              label="Duración (min)"
              name="duration_minutes"
              type="number"
              min="1"
              defaultValue={String(service?.duration_minutes ?? '60')}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className="block text-sm font-medium text-foreground">
              Descripción
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={service?.description ?? ''}
              className={cn(
                'w-full bg-muted border border-border rounded-lg px-3 py-2',
                'text-sm text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
                'resize-none transition-colors',
              )}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
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
              {pending ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalField({
  label,
  name,
  type = 'text',
  defaultValue,
  required,
  step,
  min,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  step?: string;
  min?: string;
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
        step={step}
        min={min}
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
