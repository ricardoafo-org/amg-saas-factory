import { getSmsLog, getSmsSuggestions } from '@/actions/sms';
import { SmsComposer, BulkSmsSection } from '@/core/components/admin/SmsComposer';
import { getStaffCtx } from '@/lib/auth';
import { cn } from '@/lib/cn';

function formatDateTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  sent: { label: 'Enviado', className: 'bg-success/10 text-success border-success/20' },
  failed: { label: 'Fallido', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  pending: { label: 'Pendiente', className: 'bg-warning/10 text-warning border-warning/20' },
};

export default async function CommsPage() {
  await getStaffCtx();

  const [logResult, suggestionsResult] = await Promise.all([
    getSmsLog(),
    getSmsSuggestions(),
  ]);

  const logEntries = logResult.ok ? logResult.entries : [];
  const suggestions = suggestionsResult.ok ? suggestionsResult.suggestions : [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Comunicaciones</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Envío de SMS y recordatorios a clientes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SmsComposer />
        <BulkSmsSection suggestions={suggestions} />
      </div>

      {/* SMS log */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Historial de SMS ({logEntries.length})
        </h2>

        {logEntries.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <p className="text-sm text-muted-foreground">No hay mensajes enviados todavía.</p>
          </div>
        ) : (
          <div className="glass rounded-xl overflow-hidden">
            <div className="hidden md:grid grid-cols-[1fr_2fr_1fr_1fr] gap-4 px-4 py-3 border-b border-border text-xs text-muted-foreground">
              <span>Teléfono</span>
              <span>Mensaje</span>
              <span>Estado</span>
              <span>Fecha</span>
            </div>
            <ul className="divide-y divide-border">
              {logEntries.map((entry) => {
                const cfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG['sent']!;
                return (
                  <li
                    key={entry.id}
                    className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr_1fr] gap-4 px-4 py-3"
                  >
                    <span className="text-sm font-mono text-muted-foreground">
                      {entry.maskedPhone}
                    </span>
                    <span className="text-sm text-foreground truncate">
                      {entry.messagePreview}
                    </span>
                    <span>
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
                          cfg.className,
                        )}
                      >
                        {cfg.label}
                      </span>
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(entry.created)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <div className="h-4" />
    </div>
  );
}
