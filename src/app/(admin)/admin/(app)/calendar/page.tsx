import { getAppointmentsByRange } from '@/actions/admin/appointments';
import { CalendarView } from '@/core/components/admin/CalendarView';
import { getStaffCtx } from '@/lib/auth';

export default async function CalendarPage() {
  await getStaffCtx();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const { appointments, availabilitySlots } = await getAppointmentsByRange(monday, sunday);

  const weekStart = monday.toISOString().split('T')[0] ?? monday.toISOString();

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="px-4 pt-4 pb-2 shrink-0">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Calendario</h1>
      </div>
      <div className="flex-1 overflow-hidden px-4 pb-4">
        <CalendarView
          initialAppointments={appointments}
          availabilitySlots={availabilitySlots}
          weekStart={weekStart}
        />
      </div>
    </div>
  );
}
