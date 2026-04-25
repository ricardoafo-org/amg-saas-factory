import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Car, Phone, Mail, Calendar, Wrench, MessageSquare } from 'lucide-react';
import { getCustomer } from '@/actions/admin/customers';
import { EditCustomerModal } from '@/core/components/admin/EditCustomerModal';
import { getStaffCtx } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { formatDate, formatCurrency } from '@/lib/format';

type Props = {
  params: Promise<{ id: string }>;
};

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-warning/10 text-warning border-warning/20' },
  confirmed: { label: 'Confirmada', className: 'bg-info/10 text-info border-info/20' },
  in_progress: { label: 'En taller', className: 'bg-[var(--status-in-progress)]/15 text-[var(--status-in-progress)] border-[var(--status-in-progress)]/30' },
  ready: { label: 'Lista', className: 'bg-success/10 text-success border-success/20' },
  delivered: { label: 'Entregada', className: 'bg-muted text-muted-foreground border-border' },
  cancelled: { label: 'Cancelada', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  completed: { label: 'Completada', className: 'bg-success/10 text-success border-success/20' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP['pending']!;
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
        cfg.className,
      )}
    >
      {cfg.label}
    </span>
  );
}

export default async function CustomerDetailPage({ params }: Props) {
  await getStaffCtx();

  const { id } = await params;
  const customer = await getCustomer(id);

  if (!customer) {
    notFound();
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{customer.name}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1.5">
            {customer.phone && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {customer.phone}
              </span>
            )}
            {customer.email && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                {customer.email}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <EditCustomerModal
            customer={{
              id: customer.id,
              name: customer.name,
              phone: customer.phone,
              notes: customer.notes,
              preferred_contact: customer.preferred_contact,
              marketing_consent: customer.marketing_consent,
            }}
            onClose={() => {}}
          />
          <Link
            href="/admin/calendar"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-secondary text-foreground border border-border hover:bg-muted transition-colors"
          >
            <Calendar className="h-3.5 w-3.5" />
            Nueva cita
          </Link>
          <Link
            href="/admin/comms"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-secondary text-foreground border border-border hover:bg-muted transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            SMS
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Visitas</p>
          <p className="text-2xl font-bold text-foreground mt-1">{customer.total_visits}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Gasto total</p>
          <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(customer.total_spent)}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Desde</p>
          <p className="text-lg font-semibold text-foreground mt-1">
            {customer.first_seen ? formatDate(customer.first_seen) : '—'}
          </p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Última visita</p>
          <p className="text-lg font-semibold text-foreground mt-1">
            {customer.last_seen ? formatDate(customer.last_seen) : '—'}
          </p>
        </div>
      </div>

      {/* Vehicles */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Car className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            Vehículos ({customer.vehicles.length})
          </h2>
        </div>

        {customer.vehicles.length === 0 ? (
          <div className="glass rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground">No hay vehículos registrados para este cliente.</p>
          </div>
        ) : (
          <div className="glass rounded-xl overflow-hidden divide-y divide-border">
            {customer.vehicles.map((v) => (
              <Link
                key={v.id}
                href={`/admin/vehicles/${v.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono font-semibold text-foreground uppercase">{v.plate}</span>
                  <span className="text-sm text-foreground">{v.brand} {v.model}</span>
                  <span className="text-xs text-muted-foreground">({v.year})</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {v.last_km > 0 && (
                    <span>{v.last_km.toLocaleString('es-ES')} km</span>
                  )}
                  {v.itv_expiry && (
                    <span>ITV: {formatDate(v.itv_expiry)}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Service history */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            Historial de servicios ({customer.appointments.length})
          </h2>
        </div>

        {customer.appointments.length === 0 ? (
          <div className="glass rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground">No hay servicios registrados para este cliente.</p>
          </div>
        ) : (
          <div className="glass rounded-xl overflow-hidden">
            <div className="hidden md:grid grid-cols-[1.5fr_2fr_1fr_1fr] gap-4 px-4 py-3 border-b border-border text-xs text-muted-foreground">
              <span>Fecha</span>
              <span>Servicio</span>
              <span>Estado</span>
              <span className="text-right">Importe</span>
            </div>
            <ul className="divide-y divide-border">
              {customer.appointments.map((a) => (
                <li
                  key={a.id}
                  className="grid grid-cols-1 md:grid-cols-[1.5fr_2fr_1fr_1fr] gap-4 px-4 py-3"
                >
                  <span className="text-sm text-muted-foreground">
                    {a.scheduled_at ? formatDate(a.scheduled_at) : '—'}
                  </span>
                  <span className="text-sm text-foreground">{a.service_type || '—'}</span>
                  <span>
                    <StatusBadge status={a.status} />
                  </span>
                  <span className="text-sm font-medium text-foreground md:text-right">
                    {a.base_amount > 0 ? formatCurrency(a.base_amount) : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {customer.notes && (
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-2">Notas</h2>
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{customer.notes}</p>
          </div>
        </section>
      )}

      {/* LOPDGDD — marketing consent status + policy link */}
      <section className="glass rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
            Consentimiento marketing
          </p>
          <p className={cn(
            'text-sm font-semibold',
            customer.marketing_consent ? 'text-success' : 'text-muted-foreground',
          )}>
            {customer.marketing_consent ? 'Sí — ha dado su consentimiento' : 'No — no ha dado su consentimiento'}
          </p>
        </div>
        <Link
          href="/politica-de-privacidad"
          className="text-xs text-primary underline underline-offset-2 shrink-0"
          target="_blank"
          rel="noopener noreferrer"
        >
          Política de privacidad
        </Link>
      </section>

      <div className="h-4" />
    </div>
  );
}
