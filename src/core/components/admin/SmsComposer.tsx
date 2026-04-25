'use client';

import { useState, useCallback, useTransition } from 'react';
import { MessageSquare, Search, X, Send, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  sendSms,
  sendBulkSms,
  searchCustomers,
} from '@/actions/sms';
import type { CustomerSearchResult, SmsSuggestion } from '@/actions/sms';
import { SMS_TEMPLATES, interpolateTemplate } from '@/lib/sms/helpers';
import type { SmsTemplateId } from '@/lib/sms/helpers';

const MAX_CHARS = 160;
const MAX_BULK = 50;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SelectedCustomer = {
  id: string;
  name: string;
  maskedPhone: string;
  phone: string;
};

// ---------------------------------------------------------------------------
// CustomerSearch
// ---------------------------------------------------------------------------

function CustomerSearch({
  selected,
  onAdd,
  onRemove,
}: {
  selected: SelectedCustomer[];
  onAdd: (c: SelectedCustomer) => void;
  onRemove: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, startSearch] = useTransition();

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q);
      if (q.length < 2) { setResults([]); setOpen(false); return; }
      startSearch(async () => {
        const res = await searchCustomers(q);
        if (res.ok) { setResults(res.customers); setOpen(true); }
      });
    },
    [],
  );

  const pick = (c: CustomerSearchResult) => {
    if (!selected.find((s) => s.id === c.id)) {
      onAdd({ id: c.id, name: c.name, maskedPhone: c.maskedPhone, phone: c.phone });
    }
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20"
            >
              {s.name}
              <button
                type="button"
                onClick={() => onRemove(s.id)}
                className="ml-0.5 hover:text-destructive transition-colors"
                aria-label={`Quitar ${s.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar cliente por nombre o teléfono…"
          className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-label="Buscar cliente"
          autoComplete="off"
        />
        {searching && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            …
          </span>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <ul className="rounded-lg border border-border bg-card shadow-card divide-y divide-border overflow-hidden">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => pick(c)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
              >
                <span className="font-medium text-foreground">{c.name}</span>
                <span className="text-muted-foreground">{c.maskedPhone}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && results.length === 0 && query.length >= 2 && (
        <p className="text-xs text-muted-foreground px-1">Sin resultados para &ldquo;{query}&rdquo;</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TemplateSelector
// ---------------------------------------------------------------------------

function TemplateSelector({
  value,
  onChange,
}: {
  value: SmsTemplateId | 'custom' | '';
  onChange: (v: SmsTemplateId | 'custom') => void;
}) {
  const [open, setOpen] = useState(false);

  const label =
    value === 'custom'
      ? 'Mensaje personalizado'
      : value
        ? SMS_TEMPLATES[value as SmsTemplateId].label
        : 'Seleccionar plantilla…';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border border-border bg-muted/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-card divide-y divide-border overflow-hidden"
        >
          <li>
            <button
              type="button"
              role="option"
              aria-selected={value === 'custom'}
              onClick={() => { onChange('custom'); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors text-foreground"
            >
              Mensaje personalizado
            </button>
          </li>
          {(Object.keys(SMS_TEMPLATES) as SmsTemplateId[]).map((key) => (
            <li key={key}>
              <button
                type="button"
                role="option"
                aria-selected={value === key}
                onClick={() => { onChange(key); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <span className="text-foreground">{SMS_TEMPLATES[key].label}</span>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{SMS_TEMPLATES[key].body}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SmsComposer
// ---------------------------------------------------------------------------

export function SmsComposer({ onSent }: { onSent?: () => void }) {
  const [selected, setSelected] = useState<SelectedCustomer[]>([]);
  const [template, setTemplate] = useState<SmsTemplateId | 'custom' | ''>('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sending, startSend] = useTransition();

  const handleTemplateChange = (v: SmsTemplateId | 'custom') => {
    setTemplate(v);
    if (v !== 'custom') {
      setMessage(SMS_TEMPLATES[v as SmsTemplateId].body);
    } else {
      setMessage('');
    }
    setStatus(null);
  };

  const smsCount = message.length > 0 ? Math.ceil(message.length / MAX_CHARS) : 0;
  const charsInSegment = message.length % MAX_CHARS || (message.length > 0 ? MAX_CHARS : 0);
  const overLimit = message.length > MAX_CHARS * 3;

  const canSend = selected.length > 0 && message.trim().length > 0 && !overLimit;

  const handleSend = () => {
    if (!canSend) return;
    setStatus(null);

    startSend(async () => {
      let successCount = 0;
      let failCount = 0;

      for (const customer of selected) {
        const result = await sendSms({
          toPhone: customer.phone,
          message: message.trim(),
        });
        if (result.ok) successCount++;
        else failCount++;
      }

      if (failCount === 0) {
        setStatus({ type: 'success', text: `SMS enviado a ${successCount} cliente${successCount > 1 ? 's' : ''}.` });
        setSelected([]);
        setMessage('');
        setTemplate('');
        onSent?.();
      } else if (successCount > 0) {
        setStatus({ type: 'success', text: `${successCount} enviados, ${failCount} fallidos.` });
        onSent?.();
      } else {
        setStatus({ type: 'error', text: 'No se pudo enviar el SMS. Inténtalo de nuevo.' });
      }
    });
  };

  return (
    <div className="glass rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Enviar SMS</h2>
      </div>

      {/* Customer selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Destinatario(s)
        </label>
        <CustomerSearch
          selected={selected}
          onAdd={(c) => setSelected((prev) => [...prev, c])}
          onRemove={(id) => setSelected((prev) => prev.filter((s) => s.id !== id))}
        />
      </div>

      {/* Template selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Plantilla
        </label>
        <TemplateSelector value={template} onChange={handleTemplateChange} />
      </div>

      {/* Message textarea */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Mensaje
          </label>
          <span
            className={cn(
              'text-xs tabular-nums',
              overLimit
                ? 'text-destructive'
                : charsInSegment > MAX_CHARS * 0.9
                  ? 'text-warning'
                  : 'text-muted-foreground',
            )}
          >
            {message.length} / {MAX_CHARS}
            {smsCount > 1 && (
              <span className="ml-1 text-muted-foreground">({smsCount} SMS)</span>
            )}
          </span>
        </div>
        <textarea
          value={message}
          onChange={(e) => { setMessage(e.target.value); setStatus(null); }}
          rows={4}
          placeholder="Escribe tu mensaje o selecciona una plantilla…"
          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          aria-label="Contenido del SMS"
        />
        {overLimit && (
          <p className="text-xs text-destructive">El mensaje supera el límite de 3 SMS (480 caracteres).</p>
        )}
      </div>

      {/* Preview */}
      {message.trim().length > 0 && selected.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Vista previa</p>
          <p className="text-sm text-foreground break-words">
            {interpolateTemplate(message, {
              nombre: selected[0]?.name ?? 'Cliente',
              taller: 'AMG Talleres',
              fecha: 'mañana',
              hora: '10:00',
              link: 'amg.es/cita',
              plate: 'XXXX',
              hours: '8:00-18:00',
              total: '150',
              bookingLink: 'amg.es/reservar',
            })}
          </p>
        </div>
      )}

      {/* Status message */}
      {status && (
        <p
          className={cn(
            'text-sm rounded-lg px-3 py-2',
            status.type === 'success'
              ? 'bg-success/10 text-success border border-success/20'
              : 'bg-destructive/10 text-destructive border border-destructive/20',
          )}
        >
          {status.text}
        </p>
      )}

      {/* Send button */}
      <button
        type="button"
        onClick={handleSend}
        disabled={!canSend || sending}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
          canSend && !sending
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow'
            : 'bg-muted text-muted-foreground cursor-not-allowed',
        )}
        aria-disabled={!canSend || sending}
      >
        <Send className="h-4 w-4" />
        {sending ? 'Enviando…' : `Enviar${selected.length > 1 ? ` (${selected.length})` : ''}`}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BulkSmsSection
// ---------------------------------------------------------------------------

export function BulkSmsSection({
  suggestions,
  onSent,
}: {
  suggestions: SmsSuggestion[];
  onSent?: () => void;
}) {
  const [sending, startSend] = useTransition();
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const consentedSuggestions = suggestions.filter((s) => s.marketingConsent);
  const cappedSuggestions = consentedSuggestions.slice(0, MAX_BULK);

  const template = SMS_TEMPLATES.itv_proximo.body;

  const handleBulkSend = () => {
    if (cappedSuggestions.length === 0) return;
    setStatus(null);

    startSend(async () => {
      const customerIds = cappedSuggestions.map((s) => s.customerId);
      const result = await sendBulkSms({ customerIds, message: template });

      if (result.ok) {
        setStatus({
          type: 'success',
          text: `${result.sent} SMS enviados. ${result.failed > 0 ? `${result.failed} fallidos.` : ''}`,
        });
        onSent?.();
      } else {
        setStatus({ type: 'error', text: result.error });
      }
    });
  };

  return (
    <div className="glass rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Recordatorio ITV masivo</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Clientes con ITV venciendo en los próximos 30 días
          </p>
        </div>
        <span className="text-2xl font-bold text-accent tabular-nums">{suggestions.length}</span>
      </div>

      {suggestions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay vehículos con ITV próxima a vencer en los próximos 30 días.
        </p>
      ) : (
        <>
          {/* Summary table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Cliente</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Matrícula</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">ITV vence</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground">Días</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground">Consent.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {suggestions.slice(0, 10).map((s) => (
                  <tr key={s.customerId} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2 text-foreground font-medium">{s.customerName}</td>
                    <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{s.plate}</td>
                    <td className="px-3 py-2 text-muted-foreground">{s.itvExpiry}</td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={cn(
                          'inline-block px-1.5 py-0.5 rounded text-xs font-medium tabular-nums',
                          s.daysLeft <= 7
                            ? 'bg-destructive/10 text-destructive'
                            : s.daysLeft <= 15
                              ? 'bg-warning/10 text-warning'
                              : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {s.daysLeft}d
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-xs">
                      {s.marketingConsent ? (
                        <span className="text-success">Sí</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {suggestions.length > 10 && (
              <p className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
                … y {suggestions.length - 10} más
              </p>
            )}
          </div>

          {consentedSuggestions.length === 0 && (
            <p className="text-xs text-warning">
              Ningún cliente con ITV próxima tiene consentimiento de marketing. No se puede enviar SMS.
            </p>
          )}

          {consentedSuggestions.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Se enviarán {cappedSuggestions.length} SMS (solo clientes con consentimiento de marketing).
              {consentedSuggestions.length > MAX_BULK && (
                <span className="text-warning"> Limitado a {MAX_BULK} por envío.</span>
              )}
            </p>
          )}

          {status && (
            <p
              className={cn(
                'text-sm rounded-lg px-3 py-2',
                status.type === 'success'
                  ? 'bg-success/10 text-success border border-success/20'
                  : 'bg-destructive/10 text-destructive border border-destructive/20',
              )}
            >
              {status.text}
            </p>
          )}

          <button
            type="button"
            onClick={handleBulkSend}
            disabled={cappedSuggestions.length === 0 || sending}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
              cappedSuggestions.length > 0 && !sending
                ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            )}
          >
            <Send className="h-4 w-4" />
            {sending
              ? 'Enviando…'
              : `Enviar SMS a ${cappedSuggestions.length} cliente${cappedSuggestions.length !== 1 ? 's' : ''}`}
          </button>
        </>
      )}
    </div>
  );
}
