'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { AppointmentSlideOver } from '@/core/components/admin/AppointmentSlideOver';
import { NewAppointmentModal } from '@/core/components/admin/NewAppointmentModal';
import type {
  CalendarAppointment,
  AppointmentStatus,
  AvailabilitySlot,
} from '@/actions/admin/appointments';

// ── Constants ─────────────────────────────────────────────────────────────────

const HOUR_START = 8;   // 08:00
const HOUR_END   = 20;  // 20:00 (exclusive label — slots end at 20:00)
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const STATUS_BG: Record<AppointmentStatus, string> = {
  pending:     'bg-[var(--status-pending)]/20 border-[var(--status-pending)]/50 text-[var(--status-pending)]',
  confirmed:   'bg-[var(--status-confirmed)]/20 border-[var(--status-confirmed)]/50 text-[var(--status-confirmed)]',
  in_progress: 'bg-[var(--status-in-progress)]/20 border-[var(--status-in-progress)]/50 text-[var(--status-in-progress)]',
  ready:       'bg-[var(--status-ready)]/20 border-[var(--status-ready)]/50 text-[var(--status-ready)]',
  delivered:   'bg-[var(--status-completed)]/20 border-[var(--status-completed)]/50 text-[var(--status-completed)]',
  cancelled:   'bg-[var(--status-cancelled)]/20 border-[var(--status-cancelled)]/50 text-[var(--status-cancelled)] opacity-60',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toMadridDate(isoString: string): Date {
  // We parse dates in Europe/Madrid context for display
  return new Date(isoString);
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1; Sunday wraps back
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDateKey(date: Date): string {
  // Returns YYYY-MM-DD
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getApptMinuteOffset(isoString: string): number {
  const d = toMadridDate(isoString);
  return (d.getHours() - HOUR_START) * 60 + d.getMinutes();
}

function formatHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

function formatApptTime(isoString: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Madrid',
  }).format(new Date(isoString));
}

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = (first.getDay() + 6) % 7; // Mon-indexed (0=Mon)
  const totalCells = Math.ceil((startDow + last.getDate()) / 7) * 7;
  return Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - startDow + 1;
    if (dayNum < 1 || dayNum > last.getDate()) return null;
    return new Date(year, month, dayNum);
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

type CalendarView = 'day' | 'week' | 'month';

type CalendarViewProps = {
  initialAppointments: CalendarAppointment[];
  availabilitySlots: AvailabilitySlot[];
  /** Current week start (Monday), passed from server */
  weekStart: string; // ISO date string
};

// ── Main Component ────────────────────────────────────────────────────────────

export function CalendarView({
  initialAppointments,
  availabilitySlots,
  weekStart,
}: CalendarViewProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [view, setView] = useState<CalendarView>('week');
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const d = new Date(weekStart);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [appointments, setAppointments] = useState<CalendarAppointment[]>(initialAppointments);
  const [selectedAppt, setSelectedAppt] = useState<CalendarAppointment | null>(null);
  const [newApptOpen, setNewApptOpen] = useState(false);
  const [newApptPrefill, setNewApptPrefill] = useState<{ date?: string; time?: string }>({});

  // Touch handling for mobile swipe
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return; // too small
    navigate(dx < 0 ? 1 : -1);
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Only handle when slide-over is closed to avoid conflicts
      if (selectedAppt) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); navigate(-1); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, currentDate, selectedAppt]); // eslint-disable-line react-hooks/exhaustive-deps

  function navigate(delta: number) {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (view === 'day')   d.setDate(d.getDate() + delta);
      if (view === 'week')  d.setDate(d.getDate() + delta * 7);
      if (view === 'month') d.setMonth(d.getMonth() + delta);
      return d;
    });
  }

  function handleStatusChange(id: string, status: AppointmentStatus) {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
    if (selectedAppt?.id === id) {
      setSelectedAppt((prev) => (prev ? { ...prev, status } : null));
    }
  }

  function openNewAppt(date?: string, time?: string) {
    setNewApptPrefill({ date, time });
    setNewApptOpen(true);
  }

  // Compute the label shown in the header
  function headerLabel(): string {
    if (view === 'day') {
      const d = view === 'day' ? currentDate : currentDate;
      return new Intl.DateTimeFormat('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/Madrid',
      }).format(d);
    }
    if (view === 'week') {
      const monday = getMonday(currentDate);
      const sunday = addDays(monday, 6);
      if (monday.getMonth() === sunday.getMonth()) {
        return `${MONTHS_ES[monday.getMonth()]} ${monday.getFullYear()}`;
      }
      return `${MONTHS_ES[monday.getMonth()]} – ${MONTHS_ES[sunday.getMonth()]} ${sunday.getFullYear()}`;
    }
    // month
    return `${MONTHS_ES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }

  // Build a Map of appointments by day key for fast lookup
  const apptsByDay = new Map<string, CalendarAppointment[]>();
  for (const appt of appointments) {
    const key = toDateKey(toMadridDate(appt.scheduledAt));
    const list = apptsByDay.get(key) ?? [];
    list.push(appt);
    apptsByDay.set(key, list);
  }

  // Build availability slot set (for background shading)
  const unavailableSlots = new Set<string>();
  for (const slot of availabilitySlots) {
    if (slot.booked >= slot.capacity) {
      unavailableSlots.add(`${slot.slotDate}_${slot.startTime}`);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border glass shrink-0 flex-wrap gap-y-2">
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            aria-label="Período anterior"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setView('day'); setCurrentDate(new Date(today)); }}
            className="px-3 h-7 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={() => navigate(1)}
            aria-label="Período siguiente"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Period label */}
        <h2 className="flex-1 text-sm font-semibold text-foreground capitalize truncate min-w-0">
          {headerLabel()}
        </h2>

        {/* View toggle — hidden on mobile (day only) */}
        <div className="hidden md:flex items-center rounded-lg border border-border overflow-hidden">
          {(['day', 'week', 'month'] as CalendarView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-3 h-7 text-xs font-medium transition-colors',
                view === v
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              {v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>

        {/* Nueva cita */}
        <button
          onClick={() => openNewAppt()}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 h-7 rounded-lg text-xs font-medium transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Nueva cita</span>
        </button>
      </div>

      {/* ── Calendar body ── */}
      <div
        className="flex-1 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Mobile: always day view */}
        <div className="md:hidden h-full overflow-y-auto">
          <DayGrid
            date={currentDate}
            appointments={apptsByDay.get(toDateKey(currentDate)) ?? []}
            unavailableSlots={unavailableSlots}
            today={today}
            onSelectAppt={setSelectedAppt}
            onNewAppt={openNewAppt}
          />
        </div>

        {/* Desktop: render selected view */}
        <div className="hidden md:flex h-full overflow-hidden">
          {view === 'day' && (
            <div className="flex-1 overflow-y-auto">
              <DayGrid
                date={currentDate}
                appointments={apptsByDay.get(toDateKey(currentDate)) ?? []}
                unavailableSlots={unavailableSlots}
                today={today}
                onSelectAppt={setSelectedAppt}
                onNewAppt={openNewAppt}
              />
            </div>
          )}
          {view === 'week' && (
            <WeekGrid
              weekStart={getMonday(currentDate)}
              apptsByDay={apptsByDay}
              unavailableSlots={unavailableSlots}
              today={today}
              onSelectAppt={setSelectedAppt}
              onNewAppt={openNewAppt}
              onDayClick={(date) => { setView('day'); setCurrentDate(date); }}
            />
          )}
          {view === 'month' && (
            <div className="flex-1 overflow-y-auto">
              <MonthGrid
                year={currentDate.getFullYear()}
                month={currentDate.getMonth()}
                apptsByDay={apptsByDay}
                today={today}
                onDayClick={(date) => { setView('day'); setCurrentDate(date); }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Slide-over ── */}
      <AppointmentSlideOver
        appointment={selectedAppt}
        onClose={() => setSelectedAppt(null)}
        onStatusChange={handleStatusChange}
      />

      {/* ── New appointment modal ── */}
      <NewAppointmentModal
        isOpen={newApptOpen}
        onClose={() => setNewApptOpen(false)}
        prefillDate={newApptPrefill.date}
        prefillTime={newApptPrefill.time}
      />
    </div>
  );
}

// ── Day Grid ──────────────────────────────────────────────────────────────────

type DayGridProps = {
  date: Date;
  appointments: CalendarAppointment[];
  unavailableSlots: Set<string>;
  today: Date;
  onSelectAppt: (appt: CalendarAppointment) => void;
  onNewAppt: (date: string, time: string) => void;
};

function DayGrid({ date, appointments, unavailableSlots, today, onSelectAppt, onNewAppt }: DayGridProps) {
  const HOUR_HEIGHT = 64; // px per hour
  const totalHeight = HOURS.length * HOUR_HEIGHT;
  const isToday = isSameDay(date, today);
  const dateKey = toDateKey(date);

  // Current time marker
  const now = new Date();
  const nowMinutes = (now.getHours() - HOUR_START) * 60 + now.getMinutes();
  const nowTop = isToday && nowMinutes >= 0 ? (nowMinutes / 60) * HOUR_HEIGHT : null;

  return (
    <div className="flex flex-col h-full">
      {/* Day header */}
      <div
        className={cn(
          'px-4 py-2.5 border-b border-border text-sm font-semibold capitalize',
          isToday ? 'text-primary' : 'text-foreground',
        )}
      >
        {new Intl.DateTimeFormat('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          timeZone: 'Europe/Madrid',
        }).format(date)}
      </div>

      {/* Time grid */}
      <div className="relative flex flex-1 overflow-y-auto">
        {/* Hour labels column */}
        <div className="w-14 shrink-0 relative" style={{ height: totalHeight }}>
          {HOURS.map((h) => (
            <div
              key={h}
              style={{ top: (h - HOUR_START) * HOUR_HEIGHT }}
              className="absolute left-0 right-0 flex items-start justify-end pr-2 pt-0.5"
            >
              <span className="text-xs text-muted-foreground">{formatHour(h)}</span>
            </div>
          ))}
        </div>

        {/* Grid area */}
        <div
          className="flex-1 relative border-l border-border"
          style={{ height: totalHeight }}
          onClick={(e) => {
            // Click on empty area → new appointment
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const y = e.clientY - rect.top;
            const totalMinutes = (y / totalHeight) * (HOURS.length * 60);
            const hour = Math.floor(totalMinutes / 60) + HOUR_START;
            const minute = Math.floor(totalMinutes % 60 / 30) * 30;
            onNewAppt(dateKey, `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
          }}
        >
          {/* Hour grid lines */}
          {HOURS.map((h) => (
            <div
              key={h}
              style={{ top: (h - HOUR_START) * HOUR_HEIGHT }}
              className="absolute left-0 right-0 border-t border-border/50"
            />
          ))}

          {/* Half-hour lines */}
          {HOURS.map((h) => (
            <div
              key={`half-${h}`}
              style={{ top: (h - HOUR_START) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
              className="absolute left-0 right-0 border-t border-border/20"
            />
          ))}

          {/* Unavailable slot shading */}
          {availabilityShadingForDay(dateKey, unavailableSlots, HOUR_HEIGHT, HOUR_START)}

          {/* Current time indicator */}
          {nowTop !== null && (
            <div
              className="absolute left-0 right-0 z-10 flex items-center"
              style={{ top: nowTop }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-primary -ml-1.5 shrink-0" />
              <div className="flex-1 h-px bg-primary" />
            </div>
          )}

          {/* Appointment blocks */}
          {appointments.map((appt) => (
            <AppointmentBlock
              key={appt.id}
              appt={appt}
              hourHeight={HOUR_HEIGHT}
              onClick={(e) => { e.stopPropagation(); onSelectAppt(appt); }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Week Grid ─────────────────────────────────────────────────────────────────

type WeekGridProps = {
  weekStart: Date;
  apptsByDay: Map<string, CalendarAppointment[]>;
  unavailableSlots: Set<string>;
  today: Date;
  onSelectAppt: (appt: CalendarAppointment) => void;
  onNewAppt: (date: string, time: string) => void;
  onDayClick: (date: Date) => void;
};

function WeekGrid({
  weekStart,
  apptsByDay,
  unavailableSlots,
  today,
  onSelectAppt,
  onNewAppt,
  onDayClick,
}: WeekGridProps) {
  const HOUR_HEIGHT = 56;
  const totalHeight = HOURS.length * HOUR_HEIGHT;
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const now = new Date();
  const nowMinutes = (now.getHours() - HOUR_START) * 60 + now.getMinutes();
  const nowTop = nowMinutes >= 0 ? (nowMinutes / 60) * HOUR_HEIGHT : null;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Day headers */}
      <div className="flex border-b border-border shrink-0">
        {/* Hour gutter */}
        <div className="w-14 shrink-0" />
        {weekDays.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'flex-1 min-w-0 flex flex-col items-center py-2 cursor-pointer select-none',
                'hover:bg-muted/50 transition-colors',
                isToday && 'text-primary',
              )}
              onClick={() => onDayClick(day)}
            >
              <span className="text-xs text-muted-foreground uppercase">
                {DAYS_ES[day.getDay()]}
              </span>
              <span
                className={cn(
                  'mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                  isToday ? 'bg-primary text-primary-foreground' : 'text-foreground',
                )}
              >
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div className="flex flex-1 overflow-y-auto">
        {/* Hour labels */}
        <div className="w-14 shrink-0 relative" style={{ height: totalHeight }}>
          {HOURS.map((h) => (
            <div
              key={h}
              style={{ top: (h - HOUR_START) * HOUR_HEIGHT }}
              className="absolute left-0 right-0 flex items-start justify-end pr-2 pt-0.5"
            >
              <span className="text-xs text-muted-foreground">{formatHour(h)}</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div className="flex flex-1 border-l border-border relative">
          {weekDays.map((day, colIdx) => {
            const dateKey = toDateKey(day);
            const dayAppts = apptsByDay.get(dateKey) ?? [];

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'flex-1 min-w-0 relative border-r border-border last:border-r-0',
                  isSameDay(day, today) && 'bg-primary/[0.03]',
                )}
                style={{ height: totalHeight }}
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const totalMinutes = (y / totalHeight) * (HOURS.length * 60);
                  const hour = Math.floor(totalMinutes / 60) + HOUR_START;
                  const minute = Math.floor(totalMinutes % 60 / 30) * 30;
                  onNewAppt(dateKey, `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
                }}
              >
                {/* Hour lines */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    style={{ top: (h - HOUR_START) * HOUR_HEIGHT }}
                    className="absolute left-0 right-0 border-t border-border/50"
                  />
                ))}
                {/* Half-hour */}
                {HOURS.map((h) => (
                  <div
                    key={`half-${h}`}
                    style={{ top: (h - HOUR_START) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                    className="absolute left-0 right-0 border-t border-border/20"
                  />
                ))}

                {/* Unavailable shading */}
                {availabilityShadingForDay(dateKey, unavailableSlots, HOUR_HEIGHT, HOUR_START)}

                {/* Now line — only on today's column */}
                {isSameDay(day, today) && nowTop !== null && (
                  <div
                    className="absolute left-0 right-0 z-10 flex items-center"
                    style={{ top: nowTop }}
                  >
                    {colIdx === 0 && (
                      <div className="w-2 h-2 rounded-full bg-primary -ml-1 shrink-0" />
                    )}
                    <div className="flex-1 h-px bg-primary" />
                  </div>
                )}

                {/* Appointments */}
                {dayAppts.map((appt) => (
                  <AppointmentBlock
                    key={appt.id}
                    appt={appt}
                    hourHeight={HOUR_HEIGHT}
                    compact
                    onClick={(e) => { e.stopPropagation(); onSelectAppt(appt); }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Month Grid ────────────────────────────────────────────────────────────────

type MonthGridProps = {
  year: number;
  month: number;
  apptsByDay: Map<string, CalendarAppointment[]>;
  today: Date;
  onDayClick: (date: Date) => void;
};

function MonthGrid({ year, month, apptsByDay, today, onDayClick }: MonthGridProps) {
  const cells = getMonthGrid(year, month);
  const DOW_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="p-4">
      {/* Day of week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DOW_LABELS.map((d) => (
          <div key={d} className="text-xs text-muted-foreground text-center py-1 font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {cells.map((day, i) => {
          if (!day) {
            return <div key={`empty-${i}`} className="bg-muted/20 min-h-20" />;
          }

          const key = toDateKey(day);
          const dayAppts = apptsByDay.get(key) ?? [];
          const isToday = isSameDay(day, today);
          const isCurrentMonth = day.getMonth() === month;

          return (
            <div
              key={key}
              onClick={() => onDayClick(day)}
              className={cn(
                'bg-card min-h-20 p-1.5 cursor-pointer hover:bg-muted/50 transition-colors flex flex-col gap-1',
                !isCurrentMonth && 'opacity-40',
                isToday && 'ring-1 ring-inset ring-primary/50',
              )}
            >
              {/* Date number */}
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium self-end',
                  isToday
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {day.getDate()}
              </div>

              {/* Appointment count / dots */}
              {dayAppts.length > 0 && (
                <div className="flex flex-wrap gap-0.5">
                  {dayAppts.slice(0, 3).map((appt) => (
                    <div
                      key={appt.id}
                      className={cn(
                        'h-1.5 flex-1 min-w-1.5 max-w-4 rounded-full',
                        apptDotClass(appt.status),
                      )}
                    />
                  ))}
                  {dayAppts.length > 3 && (
                    <span className="text-xs text-muted-foreground ml-0.5">
                      +{dayAppts.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* On larger cells show first 2 appointment titles */}
              <div className="hidden lg:flex flex-col gap-0.5 mt-0.5">
                {dayAppts.slice(0, 2).map((appt) => (
                  <div
                    key={appt.id}
                    className={cn(
                      'text-xs px-1 py-0.5 rounded truncate border',
                      STATUS_BG[appt.status],
                    )}
                  >
                    {formatApptTime(appt.scheduledAt)} {appt.customerName}
                  </div>
                ))}
                {dayAppts.length > 2 && (
                  <div className="text-xs text-muted-foreground px-1">
                    +{dayAppts.length - 2} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Appointment Block ─────────────────────────────────────────────────────────

type AppointmentBlockProps = {
  appt: CalendarAppointment;
  hourHeight: number;
  compact?: boolean;
  onClick: (e: React.MouseEvent) => void;
};

function AppointmentBlock({ appt, hourHeight, compact = false, onClick }: AppointmentBlockProps) {
  const minuteOffset = getApptMinuteOffset(appt.scheduledAt);
  const topPx = (minuteOffset / 60) * hourHeight;
  const heightPx = Math.max((appt.durationMinutes / 60) * hourHeight, compact ? 18 : 24);

  if (minuteOffset < 0 || minuteOffset >= HOURS.length * 60) return null;

  return (
    <button
      onClick={onClick}
      title={`${appt.customerName} · ${appt.plate} · ${formatApptTime(appt.scheduledAt)}`}
      className={cn(
        'absolute left-0.5 right-0.5 rounded border overflow-hidden text-left',
        'transition-opacity hover:opacity-90 focus-visible:ring-1 focus-visible:ring-primary',
        'cursor-pointer',
        STATUS_BG[appt.status],
      )}
      style={{ top: topPx, height: heightPx }}
    >
      <div className="px-1 py-0.5 h-full flex flex-col justify-start overflow-hidden">
        {!compact && (
          <span className="text-xs font-semibold leading-tight truncate block">
            {appt.customerName}
          </span>
        )}
        {!compact && appt.plate && (
          <span className="text-xs font-mono leading-tight truncate block opacity-80">
            {appt.plate}
          </span>
        )}
        {compact ? (
          <span className="text-xs leading-tight truncate block font-medium">
            {appt.customerName}
          </span>
        ) : (
          <span className="text-xs leading-tight truncate block opacity-80">
            {appt.serviceNames[0]}
          </span>
        )}
      </div>
    </button>
  );
}

// ── Utility: availability shading ─────────────────────────────────────────────

function availabilityShadingForDay(
  dateKey: string,
  unavailableSlots: Set<string>,
  hourHeight: number,
  hourStart: number,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Check each hour slot for unavailability
  for (let h = hourStart; h < HOUR_END; h++) {
    const timeKey = `${String(h).padStart(2, '0')}:00`;
    if (unavailableSlots.has(`${dateKey}_${timeKey}`)) {
      nodes.push(
        <div
          key={`unavail-${h}`}
          className="absolute left-0 right-0 bg-muted/40 pointer-events-none"
          style={{
            top: (h - hourStart) * hourHeight,
            height: hourHeight,
          }}
        />
      );
    }
  }
  return nodes;
}

// ── Status dot color ──────────────────────────────────────────────────────────

function apptDotClass(status: AppointmentStatus): string {
  const map: Record<AppointmentStatus, string> = {
    pending:     'bg-[var(--status-pending)]',
    confirmed:   'bg-[var(--status-confirmed)]',
    in_progress: 'bg-[var(--status-in-progress)]',
    ready:       'bg-[var(--status-ready)]',
    delivered:   'bg-[var(--status-completed)]',
    cancelled:   'bg-[var(--status-cancelled)] opacity-50',
  };
  return map[status] ?? 'bg-muted';
}
