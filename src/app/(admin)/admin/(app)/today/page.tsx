import { getStaffCtx } from '@/lib/auth';
import { getTodayAppointments, getNext48hAppointments } from '@/actions/admin/appointments';
import { getTodayKpis } from '@/actions/admin/kpis';
import type { AppointmentStatus, TodayAppointment } from '@/actions/admin/appointments';
import { cn } from '@/lib/cn';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  User,
  Car,
  Clock,
  Euro,
  CalendarDays,
  Wrench,
  CheckCircle,
  Coffee,
} from 'lucide-react';
import { AutoRefresh } from './_components/AutoRefresh';
import { StatusButton } from './_components/StatusButton';

// ── Local helpers ─────────────────────────────────────────────────────────────

function formatTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '--:--';
  }
}

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
}

function formatEuros(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'Pendiente',
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  confirmed: {
    label: 'Confirmada',
    className: 'bg-info/10 text-info border-info/20',
  },
  in_progress: {
    label: 'En taller',
    className: 'bg-[var(--status-in-progress)]/15 text-[var(--status-in-progress)] border-[var(--status-in-progress)]/30',
  },
  ready: {
    label: 'Lista',
    className: 'bg-success/10 text-success border-success/20',
  },
  delivered: {
    label: 'Entregada',
    className: 'bg-muted text-muted-foreground border-border',
  },
  cancelled: {
    label: 'Cancelada',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
};

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
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

// ── Delta display ─────────────────────────────────────────────────────────────

function Delta({ value, unit = '' }: { value: number; unit?: string }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        igual que ayer
      </span>
    );
  }
  const isUp = value > 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        isUp ? 'text-success' : 'text-destructive',
      )}
    >
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isUp ? '+' : ''}
      {unit === '€'
        ? formatEuros(Math.abs(value))
        : `${Math.abs(value)}${unit}`}{' '}
      vs ayer
    </span>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

type KpiCardProps = {
  label: string;
  value: string;
  delta: number;
  unit?: string;
  icon: React.ReactNode;
};

function KpiCard({ label, value, delta, unit, icon }: KpiCardProps) {
  return (
    <div className="glass rounded-xl p-4 flex flex-col gap-2 min-w-[160px]">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
      <Delta value={delta} unit={unit} />
    </div>
  );
}

// ── Appointment Card ──────────────────────────────────────────────────────────

function AppointmentCard({ appointment }: { appointment: TodayAppointment }) {
  const hasNoPhone = !appointment.customerPhone;

  return (
    <div
      className={cn(
        'glass rounded-xl p-4 flex flex-col gap-3',
        hasNoPhone && 'border-warning/30',
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-semibold text-primary tabular-nums shrink-0">
            {formatTime(appointment.scheduledAt)}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {appointment.customerName || 'Cliente sin nombre'}
            </p>
            {appointment.plate && (
              <p className="text-xs text-muted-foreground font-mono">
                {appointment.plate}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={appointment.status} />
          <StatusButton
            appointmentId={appointment.id}
            currentStatus={appointment.status}
          />
        </div>
      </div>

      {/* Services */}
      {appointment.services && (
        <div className="flex items-start gap-1.5">
          <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground line-clamp-2">
            {appointment.services}
          </p>
        </div>
      )}

      {/* Footer row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {appointment.techName && (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {appointment.techName}
          </span>
        )}
        {appointment.baseAmount > 0 && (
          <span className="flex items-center gap-1">
            <Euro className="h-3 w-3" />
            {formatEuros(appointment.baseAmount)}
          </span>
        )}
        {hasNoPhone && (
          <span className="flex items-center gap-1 text-warning ml-auto">
            <AlertTriangle className="h-3 w-3" />
            Sin teléfono
          </span>
        )}
      </div>
    </div>
  );
}

// ── Próximas 48h collapsible ──────────────────────────────────────────────────

function Next48hSection({ appointments }: { appointments: TodayAppointment[] }) {
  if (appointments.length === 0) return null;

  // Group by date
  const byDate = appointments.reduce<Record<string, TodayAppointment[]>>((acc, apt) => {
    const date = apt.scheduledAt.split('T')[0] ?? apt.scheduledAt.slice(0, 10);
    if (!acc[date]) acc[date] = [];
    acc[date].push(apt);
    return acc;
  }, {});

  return (
    <details className="group">
      <summary className="flex items-center gap-2 cursor-pointer select-none list-none py-3">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">
          Próximas 48h
        </span>
        <span className="ml-1 text-xs text-muted-foreground">
          ({appointments.length} cita{appointments.length !== 1 ? 's' : ''})
        </span>
        <span className="ml-auto text-xs text-muted-foreground group-open:hidden">
          Ver
        </span>
        <span className="ml-auto text-xs text-muted-foreground hidden group-open:inline">
          Cerrar
        </span>
      </summary>

      <div className="mt-3 space-y-6">
        {Object.entries(byDate).map(([date, apts]) => (
          <div key={date}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {formatDate(date + 'T00:00:00')}
            </p>
            <div className="space-y-3">
              {apts.map((apt) => (
                <AppointmentCard key={apt.id} appointment={apt} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TodayPage() {
  // Auth guard — redirects to /admin/login if unauthenticated
  await getStaffCtx();

  const [todayAppointments, next48h, kpis] = await Promise.all([
    getTodayAppointments(),
    getNext48hAppointments(),
    getTodayKpis(),
  ]);

  const appointmentsWithNoPhone = todayAppointments.filter((a) => !a.customerPhone);
  const isEmpty = todayAppointments.length === 0;

  const now = new Date();
  const dateLabel = now.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  // Capitalize first letter
  const dateLabelFormatted = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* 30-second auto-refresh — client wrapper, zero UI */}
      <AutoRefresh />

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Hoy</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{dateLabelFormatted}</p>
      </div>

      {/* Alert: appointments with no phone */}
      {appointmentsWithNoPhone.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-sm text-warning">
            <span className="font-semibold">
              {appointmentsWithNoPhone.length} cita
              {appointmentsWithNoPhone.length !== 1 ? 's' : ''} sin teléfono
            </span>{' '}
            — no se puede enviar recordatorio SMS.{' '}
            <span className="text-muted-foreground">
              {appointmentsWithNoPhone.map((a) => a.customerName).join(', ')}
            </span>
          </p>
        </div>
      )}

      {/* KPI row — horizontal scroll on mobile */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4">
        <KpiCard
          label="Citas hoy"
          value={String(kpis.todayCount)}
          delta={kpis.todayCount - kpis.yesterdayCount}
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <KpiCard
          label="En taller"
          value={String(kpis.inProgressCount)}
          delta={kpis.inProgressCount - kpis.yesterdayInProgressCount}
          icon={<Wrench className="h-4 w-4" />}
        />
        <KpiCard
          label="Listas"
          value={String(kpis.readyCount)}
          delta={kpis.readyCount - kpis.yesterdayReadyCount}
          icon={<CheckCircle className="h-4 w-4" />}
        />
        <KpiCard
          label="Ingresos hoy"
          value={formatEuros(kpis.todayRevenue)}
          delta={kpis.todayRevenue - kpis.yesterdayRevenue}
          unit="€"
          icon={<Euro className="h-4 w-4" />}
        />
      </div>

      {/* Today's appointment timeline */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            Citas de hoy
          </h2>
          {!isEmpty && (
            <span className="text-xs text-muted-foreground">
              ({todayAppointments.length})
            </span>
          )}
        </div>

        {isEmpty ? (
          <div className="glass rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-center">
            <Coffee className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No hay citas programadas para hoy. ¡Disfruta el día!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayAppointments.map((apt) => (
              <AppointmentCard key={apt.id} appointment={apt} />
            ))}
          </div>
        )}
      </section>

      {/* Próximas 48h */}
      {next48h.length > 0 && (
        <section>
          <div className="border-t border-border pt-4">
            <Next48hSection appointments={next48h} />
          </div>
        </section>
      )}

      {/* Bottom spacer for mobile tab bar */}
      <div className="h-4" />
    </div>
  );
}
